-- Gói mua riêng cho 4 ngành mới: Bán dẫn, Trí tuệ nhân tạo, Vật lý, Toán học
insert into public.products (id, name_vi, desc_vi, scope, days, price_vnd, price_jpy, sort, highlight) values
  ('m_ban-dan',  'Ngành Bán dẫn',         'Trọn đời ngành Bán dẫn, cả tiếng Anh và tiếng Nhật',         'm:ban-dan',  null, 390000, 2400, 18, false),
  ('m_ai',       'Ngành Trí tuệ nhân tạo', 'Trọn đời ngành Trí tuệ nhân tạo, cả tiếng Anh và tiếng Nhật', 'm:ai',       null, 390000, 2400, 19, false),
  ('m_vat-ly',   'Ngành Vật lý',          'Trọn đời ngành Vật lý, cả tiếng Anh và tiếng Nhật',          'm:vat-ly',   null, 390000, 2400, 20, false),
  ('m_toan-hoc', 'Ngành Toán học',        'Trọn đời ngành Toán học, cả tiếng Anh và tiếng Nhật',        'm:toan-hoc', null, 390000, 2400, 21, false)
on conflict (id) do nothing;
