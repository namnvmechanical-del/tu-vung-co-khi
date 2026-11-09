import { env, grantOrder, hmacHex, json, payosQueryString, safeEqual } from '../_shared/lib.ts';

// payOS gọi URL này khi có giao dịch. Xác minh chữ ký rồi cấp quyền.
export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: true });
  let body: { code?: string; success?: boolean; data?: Record<string, unknown>; signature?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  if (!body?.data || !body?.signature) return json({ error: 'missing data' }, 400);

  const expected = await hmacHex(env('PAYOS_CHECKSUM_KEY'), payosQueryString(body.data));
  if (!safeEqual(expected, String(body.signature))) return json({ error: 'invalid signature' }, 400);

  const d = body.data as { code?: string; orderCode?: number; amount?: number; reference?: string; paymentLinkId?: string };
  if (body.code === '00' && d.code === '00' && d.orderCode) {
    const result = await grantOrder(Number(d.orderCode), String(d.reference || d.paymentLinkId || ''), Number(d.amount));
    return json({ success: true, result });
  }
  return json({ success: true, result: 'ignored' });
}
