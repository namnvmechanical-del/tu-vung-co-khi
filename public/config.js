// Cấu hình kết nối máy chủ. Lấy 2 giá trị này trong Supabase: Project Settings → API.
// "anon/publishable key" là khóa công khai, được phép để ở đây. KHÔNG dán service_role/secret key vào file này.
window.MV_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
  freeModules: [1]   // Phần học miễn phí (phải khớp hàm is_free_module trong SQL)
};
