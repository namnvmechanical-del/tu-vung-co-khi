import { env, grantOrder, hmacHex, json, safeEqual } from '../_shared/lib.ts';

const TOLERANCE_S = 300;

// Stripe gọi URL này khi thanh toán xong. Xác minh header Stripe-Signature rồi cấp quyền.
export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: true });
  const raw = await req.text();
  const header = req.headers.get('stripe-signature') || '';
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const v1s = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !v1s.length) return json({ error: 'missing signature' }, 400);
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_S) return json({ error: 'timestamp out of tolerance' }, 400);
  const expected = await hmacHex(env('STRIPE_WEBHOOK_SECRET'), `${t}.${raw}`);
  if (!v1s.some((v) => safeEqual(v, expected))) return json({ error: 'invalid signature' }, 400);

  const event = JSON.parse(raw);
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data?.object || {};
    if (s.payment_status === 'paid' && s.metadata?.order_code) {
      const result = await grantOrder(Number(s.metadata.order_code), s.id, s.amount_total ?? null);
      return json({ received: true, result });
    }
  }
  return json({ received: true });
}
