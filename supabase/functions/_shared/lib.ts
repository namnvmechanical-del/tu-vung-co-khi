// Tiện ích dùng chung cho Edge Functions (không phụ thuộc thư viện ngoài).

// deno-lint-ignore no-explicit-any
const G = globalThis as any;
export const env = (k: string): string => (G.Deno?.env?.get(k) ?? G.process?.env?.[k] ?? '') as string;

export const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export async function hmacHex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---- payOS: chữ ký giống SDK chính thức (@payos/node) ----
// deno-lint-ignore no-explicit-any
const sortObj = (o: any) => Object.keys(o).sort().reduce((a: any, k) => { a[k] = o[k]; return a; }, {});

// deno-lint-ignore no-explicit-any
export function payosQueryString(data: Record<string, any>): string {
  const s = sortObj(data);
  return Object.keys(s)
    .filter((k) => s[k] !== undefined)
    .map((k) => {
      let v = s[k];
      if (v && Array.isArray(v)) v = JSON.stringify(v.map((x) => sortObj(x)));
      if ([null, undefined, 'undefined', 'null'].includes(v)) v = '';
      return `${k}=${v}`;
    })
    .join('&');
}

export const payosRequestString = (d: { amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string }) =>
  `amount=${d.amount}&cancelUrl=${d.cancelUrl}&description=${d.description}&orderCode=${d.orderCode}&returnUrl=${d.returnUrl}`;

// ---- Supabase REST với service role ----
export async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export async function grantOrder(orderCode: number, ref: string | null, amount: number | null): Promise<string> {
  const r = await rest('rpc/grant_order', {
    method: 'POST',
    body: JSON.stringify({ p_order_code: orderCode, p_provider_ref: ref, p_amount: amount }),
  });
  if (!r.ok) throw new Error(`grant_order failed: ${r.status} ${await r.text()}`);
  return await r.json();
}
