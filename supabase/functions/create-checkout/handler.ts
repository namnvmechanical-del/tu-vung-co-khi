import { cors, env, hmacHex, json, payosRequestString, rest } from '../_shared/lib.ts';

// Tạo đơn hàng và trả về link thanh toán (payOS: QR ngân hàng VN; Stripe: thẻ quốc tế).
export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 1) Xác thực người dùng từ JWT của Supabase Auth
  const auth = req.headers.get('Authorization') || '';
  const ur = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: env('SUPABASE_ANON_KEY') },
  });
  if (!ur.ok) return json({ error: 'Bạn cần đăng nhập trước khi mua.' }, 401);
  const user = await ur.json();
  if (!user?.id) return json({ error: 'Bạn cần đăng nhập trước khi mua.' }, 401);

  // 2) Kiểm tra gói
  let body: { product_id?: string; provider?: string };
  try { body = await req.json(); } catch { return json({ error: 'Dữ liệu không hợp lệ.' }, 400); }
  const provider = body.provider;
  if (provider !== 'payos' && provider !== 'stripe') return json({ error: 'Phương thức thanh toán không hợp lệ.' }, 400);
  const pr = await rest(`products?id=eq.${encodeURIComponent(body.product_id || '')}&active=eq.true&select=*`);
  const product = (await pr.json())?.[0];
  if (!product) return json({ error: 'Gói không tồn tại.' }, 404);

  // 3) Tạo đơn hàng
  const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const amount = provider === 'payos' ? product.price_vnd : product.price_jpy;
  const currency = provider === 'payos' ? 'VND' : 'JPY';
  const or = await rest('orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ order_code: orderCode, user_id: user.id, product_id: product.id, provider, amount, currency }),
  });
  if (!or.ok) return json({ error: 'Không tạo được đơn hàng.', detail: await or.text() }, 500);
  const order = (await or.json())[0];

  const site = env('SITE_URL').replace(/\/$/, '');
  const returnUrl = `${site}/#account`;
  const cancelUrl = `${site}/#pricing`;
  const setRef = (ref: string, status?: string) =>
    rest(`orders?id=eq.${order.id}`, { method: 'PATCH', body: JSON.stringify(status ? { provider_ref: ref, status } : { provider_ref: ref }) });

  try {
    if (provider === 'payos') {
      const req0 = { orderCode, amount, description: 'TUVUNGCK', returnUrl, cancelUrl };
      const signature = await hmacHex(env('PAYOS_CHECKSUM_KEY'), payosRequestString(req0));
      const r = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: { 'x-client-id': env('PAYOS_CLIENT_ID'), 'x-api-key': env('PAYOS_API_KEY'), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...req0,
          items: [{ name: product.name_vi, quantity: 1, price: amount }],
          buyerEmail: user.email || undefined,
          expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
          signature,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (j?.code !== '00' || !j?.data?.checkoutUrl) {
        await setRef('', 'cancelled');
        return json({ error: 'payOS từ chối tạo thanh toán: ' + (j?.desc || r.status) }, 502);
      }
      await setRef(String(j.data.paymentLinkId || ''));
      return json({ url: j.data.checkoutUrl, order_code: orderCode });
    }

    // Stripe Checkout (JPY là đơn vị không có số lẻ)
    const f = new URLSearchParams();
    f.set('mode', 'payment');
    f.set('success_url', returnUrl);
    f.set('cancel_url', cancelUrl);
    f.set('client_reference_id', order.id);
    if (user.email) f.set('customer_email', user.email);
    f.set('metadata[order_code]', String(orderCode));
    f.set('line_items[0][quantity]', '1');
    f.set('line_items[0][price_data][currency]', 'jpy');
    f.set('line_items[0][price_data][unit_amount]', String(amount));
    f.set('line_items[0][price_data][product_data][name]', product.name_vi);
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: f,
    });
    const s = await r.json().catch(() => ({}));
    if (!r.ok || !s?.url) {
      await setRef('', 'cancelled');
      return json({ error: 'Stripe từ chối tạo thanh toán: ' + (s?.error?.message || r.status) }, 502);
    }
    await setRef(s.id);
    return json({ url: s.url, order_code: orderCode });
  } catch (e) {
    await setRef('', 'cancelled');
    return json({ error: 'Lỗi kết nối cổng thanh toán.', detail: String(e) }, 502);
  }
}
