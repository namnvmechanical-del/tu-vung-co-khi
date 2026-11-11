TẠO ẢNH THẬT BẰNG AI CHO ENGIWORDS  (707 ảnh: 700 chủ đề + 7 banner ngành)

1) Lấy API key (chọn một):
   - Google AI Studio (Gemini/Imagen): https://aistudio.google.com/apikey  -> model mặc định imagen-4.0-fast-generate-001
   - OpenAI: https://platform.openai.com/api-keys                           -> model mặc định gpt-image-1 (chất lượng low)
2) Cài Pillow:  pip install pillow
3) Thử 5 ảnh trước, mở public/img/ xem có ưng không:
     python3 gen_images.py --provider gemini --key KEY_CUA_BAN --limit 5
4) Ưng rồi thì chạy hết (bỏ --limit). Chạy lại bất cứ lúc nào, ảnh đã có sẽ được bỏ qua:
     python3 gen_images.py --provider gemini --key KEY_CUA_BAN
5) Đổi ảnh nào: sửa câu mô tả trong prompts.json, xóa file jpg đó, chạy lại.
6) Ảnh nằm ở public/img/<nganh>/t<số chủ đề>.jpg và banner.jpg. Web tự dùng ảnh khi có file,
   nếu thiếu thì hiện hình vẽ cũ. Ảnh chiếm khoảng 60-100 KB/ảnh, tổng chừng 50-70 MB.
Chi phí tham khảo: vài đô cho cả bộ (tùy model; xem bảng giá hiện hành của nhà cung cấp).
Lưu ý: ảnh AI nên xem lướt qua một lượt, ảnh nào có chữ/hình lạ thì tạo lại.
