#!/usr/bin/env python3
"""Tạo ảnh thật bằng AI cho từng chủ đề + banner ngành.
Chạy:  python3 gen_images.py --provider gemini --key YOUR_KEY            (hoặc đặt biến môi trường GEMINI_API_KEY / OPENAI_API_KEY)
Thử 5 ảnh trước:  python3 gen_images.py --provider gemini --limit 5
Chỉ một ngành:   python3 gen_images.py --provider gemini --only co-khi
Ảnh lưu ở  ../public/img/<ngành>/<t12|banner>.jpg  (960x540). Chạy lại sẽ bỏ qua ảnh đã có.
Muốn đổi ảnh nào: sửa câu mô tả trong prompts.json, xóa file jpg đó rồi chạy lại.
Chỉ dùng thư viện chuẩn + Pillow (pip install pillow)."""
import argparse, base64, io, json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'img')

def post(url, body, headers):
    req = urllib.request.Request(url, json.dumps(body).encode(), headers, method='POST')
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)

def gen_gemini(prompt, key, model):
    model = model or 'imagen-4.0-fast-generate-001'
    d = post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={key}',
             {'instances': [{'prompt': prompt}], 'parameters': {'sampleCount': 1, 'aspectRatio': '16:9'}},
             {'Content-Type': 'application/json'})
    return base64.b64decode(d['predictions'][0]['bytesBase64Encoded'])

def gen_openai(prompt, key, model):
    d = post('https://api.openai.com/v1/images/generations',
             {'model': model or 'gpt-image-1', 'prompt': prompt, 'size': '1536x1024', 'quality': 'low', 'n': 1},
             {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key})
    return base64.b64decode(d['data'][0]['b64_json'])

def save(raw, path):
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w, h = im.size; tw, th = 16, 9
    if w * th > h * tw:  # crop to 16:9
        nw = h * tw // th; im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = w * th // tw; im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((960, 540), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'JPEG', quality=80, optimize=True, progressive=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--provider', choices=['gemini', 'openai'], required=True)
    ap.add_argument('--key'); ap.add_argument('--model')
    ap.add_argument('--only'); ap.add_argument('--limit', type=int); ap.add_argument('--workers', type=int, default=3)
    a = ap.parse_args()
    key = a.key or os.environ.get('GEMINI_API_KEY' if a.provider == 'gemini' else 'OPENAI_API_KEY')
    if not key: sys.exit('Thiếu API key (--key hoặc biến môi trường).')
    fn = gen_gemini if a.provider == 'gemini' else gen_openai
    cfg = json.load(open(os.path.join(HERE, 'prompts.json'), encoding='utf-8'))
    todo = []
    for k, p in cfg['prompts'].items():
        if a.only and not k.startswith(a.only + '/'): continue
        path = os.path.join(OUT, k + '.jpg')
        if not os.path.exists(path): todo.append((k, p + cfg['style'], path))
    if a.limit: todo = todo[:a.limit]
    print(f'Cần tạo {len(todo)} ảnh'); done = fail = 0
    def work(item):
        k, p, path = item
        for i in range(4):
            try: save(fn(p, key, a.model), path); return k, None
            except urllib.error.HTTPError as e:
                msg = e.read().decode()[:200]
                if e.code in (429, 500, 503): time.sleep(5 * (i + 1)); continue
                return k, f'HTTP {e.code}: {msg}'
            except Exception as e:
                time.sleep(3)
                err = str(e)
        return k, err
    with ThreadPoolExecutor(a.workers) as ex:
        for f in as_completed([ex.submit(work, t) for t in todo]):
            k, err = f.result()
            if err: fail += 1; print('LỖI', k, err)
            else: done += 1; print(f'ok {done}/{len(todo)} {k}')
    print(f'Xong: {done} ảnh, lỗi: {fail}. Chạy lại lệnh để thử lại các ảnh lỗi.')
main()
