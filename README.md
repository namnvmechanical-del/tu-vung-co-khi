# EngiWords – Từ vựng kỹ thuật Anh–Nhật

EngiWords: website học thuật ngữ kỹ thuật bằng tiếng Anh và tiếng Nhật cho người Việt. 7 chuyên ngành (Cơ khí, CNTT, Tự động hóa, Hóa học, Vật liệu, Nhiệt lạnh, Điện tử), mỗi ngành 100 chủ đề, 120 bài, ~3.000 thuật ngữ. Mỗi bài: từ vựng, quiz từ vựng, bài đọc hiểu, điền từ vào đoạn văn, hỏi đáp tình huống. Có tài khoản đăng nhập (Google/Email) và bán gói học (QR ngân hàng VN qua payOS, thẻ quốc tế qua Stripe).

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `public/` | Website (Cloudflare Pages phục vụ thư mục này): `index.html`, `config.js`, trang pháp lý |
| `supabase/migrations/` | Bảng, quyền truy cập (RLS), hàm `get_module`, `grant_order`, gói bán mẫu |
| `supabase/functions/` | `create-checkout` (tạo thanh toán), `payos-webhook`, `stripe-webhook` (xác nhận và cấp quyền) |

Dữ liệu từ vựng, bài đọc và hỏi đáp **không nằm trong repo**: nó được nạp thẳng vào bảng `words` (file seed SQL gửi riêng). Trình duyệt chỉ nhận dữ liệu qua hàm `get_module`, hàm này trả nội dung Phần 1 cho mọi người, các phần khác chỉ cho tài khoản đã mua.

## Thiết lập lần đầu

### 0. Đặt repo ở chế độ riêng tư
GitHub → repo → **Settings → General → Danger Zone → Change visibility → Private**.

### 1. Supabase
1. Tạo project tại supabase.com (vùng **Southeast Asia (Singapore)**).
2. **SQL Editor**: chạy `supabase/migrations/20261109000001_schema.sql`, sau đó chạy các file seed `<ngành>_mNN.sql` (từ vựng) và `<ngành>_readings.sql` (bài đọc + hỏi đáp).
3. **Authentication → Sign In / Providers**: bật **Email**. Bật **Google**: tạo OAuth Client (Web application) ở Google Cloud Console, thêm Authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, rồi dán Client ID/Secret vào Supabase.
4. **Authentication → URL Configuration**: *Site URL* = `https://<tên-miền>.com`; *Redirect URLs* thêm `https://<tên-miền>.com/**`.
5. **Project Settings → API**: chép *Project URL* và *anon / publishable key* vào `public/config.js`.

### 2. Edge Functions
Bằng Supabase CLI:
```bash
supabase link --project-ref <project-ref>
supabase functions deploy create-checkout
supabase functions deploy payos-webhook --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set SITE_URL=https://<tên-miền>.com \
  PAYOS_CLIENT_ID=... PAYOS_API_KEY=... PAYOS_CHECKSUM_KEY=... \
  STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` có sẵn trong môi trường của Edge Functions.)

### 3. payOS (QR ngân hàng Việt Nam)
1. Tạo **kênh thanh toán** gắn tài khoản ngân hàng nhận tiền, lấy *Client ID*, *API Key*, *Checksum Key*.
2. Đặt **Webhook URL**: `https://<project-ref>.supabase.co/functions/v1/payos-webhook`.

### 4. Stripe (thẻ quốc tế, tài khoản Nhật Bản)
1. Lấy *Secret key* (Developers → API keys).
2. Developers → Webhooks → **Add endpoint**: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, sự kiện `checkout.session.completed` và `checkout.session.async_payment_succeeded`. Chép *Signing secret* (`whsec_…`).
3. Stripe Nhật yêu cầu trang 特定商取引法: điền `public/tokushoho.html`.

### 5. Cloudflare (tên miền + hosting)
1. **Domain Registration → Register Domains**: mua tên miền .com.
2. **Workers & Pages → Create → Pages → Connect to Git**: chọn repo này. *Framework preset*: None, *Build command*: để trống, *Build output directory*: `public`.
3. Trong project Pages → **Custom domains** → thêm tên miền vừa mua.

### 6. Hoàn thiện
- Điền các ô 【…】 trong `public/terms.html`, `public/privacy.html`, `public/tokushoho.html`.
- Sửa giá: Supabase → Table Editor → `products` (`price_vnd`, `price_jpy`, `active`).
- Thử với Stripe test mode (`sk_test_…`, thẻ `4242 4242 4242 4242`) và một giao dịch payOS nhỏ.

## Vận hành
- **Cấp quyền thủ công** (tặng, xử lý sự cố): Table Editor → `entitlements` → thêm dòng `user_id`, `scope` (`all`/`en`/`ja`), `expires_at` (để trống = trọn đời).
- **Xem doanh thu**: bảng `orders` (lọc `status = paid`).
- **Gói bán**: `m_<ngành>` mở 1 ngành (cả Anh + Nhật, trọn đời); `month`/`year`/`life_all` mở mọi ngành; `life_en`/`life_ja` mở mọi ngành cho 1 ngôn ngữ.
- **Đổi phần miễn phí**: sửa hàm `is_free_module` trong SQL và `freeModules` trong `public/config.js`.
