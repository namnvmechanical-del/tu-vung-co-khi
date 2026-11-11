/* ===== UI v4: ôn tập 5 phút, tab Ghi chú / Từ điển / Bản dịch, thu gọn mục lục ===== */
const _route0 = route;
route = async function(){
  clearInterval(window.__rvT);
  document.getElementById('app').classList.remove('side-off');
  const h = location.hash.replace('#', '') || 'roadmap';
  if (h === 'review'){ try { await viewReview(); } catch(e){ if (e.locked) return viewPaywall(); app.innerHTML = `<div class="empty">${esc(e.message)}</div>`; } return; }
  await _route0();
  try { await ui4After(); } catch(e){}
};

/* ---- Ôn tập nhanh 5 phút: thẻ ghi nhớ từ các bài đã học ---- */
async function viewReview(){
  setNav('roadmap');
  const tr = PT(prefs.track);
  let ls = READY.filter(l => unlocked(l.m) && tr[l.n] && tr[l.n].best >= PASS);
  if (!ls.length) ls = READY.filter(l => unlocked(l.m) && tr[l.n]);
  if (!ls.length){ app.innerHTML = `<div class="crumbs"><a href="#roadmap">← Lộ trình</a></div><div class="empty">Hãy làm quiz ít nhất một bài, rồi quay lại để ôn tập nhanh.</div>`; return; }
  app.innerHTML = '<div class="empty">Đang chuẩn bị thẻ ôn tập…</div>';
  const pool = (await Promise.all(ls.map(l => lessonWords(l.n)))).flat();
  const cards = shuffle(pool).slice(0, 20);
  rvStart(cards, 300);
}
function rvStart(cards, secs){
  const ja = isJA(), S = {cards, i: 0, flip: false, known: [], unknown: [], end: Date.now() + secs * 1000};
  const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const finish = () => {
    clearInterval(window.__rvT);
    const k = S.known.length, tot = S.cards.length, un = S.cards.filter(w => !S.known.includes(w));
    app.innerHTML = `<div class="quiz"><div class="crumbs"><a href="#roadmap">← Lộ trình</a></div><div class="card result">
      <div class="q-type">Ôn tập nhanh · kết quả</div><div class="score ${k / tot >= .7 ? 'pass' : 'fail'}">${k}/${tot}</div>
      <p>${k} thuật ngữ đã nhớ${un.length ? `, ${un.length} thuật ngữ cần ôn thêm.` : '. Rất tốt!'}</p>
      <div class="hero-actions" style="justify-content:center">${un.length ? '<button class="btn primary" id="rv-again">Ôn lại các từ chưa nhớ</button>' : ''}<button class="btn" id="rv-new">Bộ thẻ mới</button><a class="btn" href="#roadmap" style="text-decoration:none">Về lộ trình</a></div>
      ${un.length ? `<div class="review"><h3 style="font-size:1em">Chưa nhớ (${un.length})</h3>${un.map(w => `<div class="r"><b class="${ja ? 'jp' : ''}">${esc(term(w))}</b> <span class="mono muted ${ja ? 'jp' : ''}">${esc(reading(w))}</span> — ${esc(w.vi)}</div>`).join('')}</div>` : ''}
    </div></div>`;
    const a = document.getElementById('rv-again'); if (a) a.onclick = () => rvStart(shuffle(un), 300);
    document.getElementById('rv-new').onclick = () => viewReview();
  };
  const draw = () => {
    if (S.i >= S.cards.length) return finish();
    const w = S.cards[S.i];
    app.innerHTML = `<div class="quiz"><div class="crumbs"><a href="#roadmap">← Thoát ôn tập</a></div>
      <div class="q-top"><span>Ôn tập nhanh · thẻ ${S.i + 1}/${S.cards.length}</span><span class="rv-t">⏱ <b id="rv-t">${fmt(S.end - Date.now())}</b></span></div>
      <div class="prog-bar" style="margin-bottom:14px"><i style="width:${Math.round(S.i / S.cards.length * 100)}%"></i></div>
      <div class="fc-wrap"><div class="fc" id="fc" role="button" tabindex="0" aria-label="Lật thẻ">
        ${!S.flip ? `<div class="big ${ja ? 'jp' : ''}">${esc(term(w))}</div><div class="mono muted ${ja ? 'jp' : ''}">${esc(reading(w))}</div>${sayBtn(w)}<div class="hint">Nhớ nghĩa chưa? Nhấn để lật thẻ</div>`
          : `<div class="big" style="font-size:1.6em">${esc(w.vi)}</div><p style="max-width:46ch;margin:0">${esc(w.def_vi)}</p><div class="${ja ? 'jp' : ''} muted">${esc(ja ? w.ex_ja : w.ex_en)}</div>`}
      </div>
      <div class="rv-btns">${S.flip ? '<button class="btn rv-no" id="rv-no">✗ Chưa nhớ</button><button class="btn primary rv-yes" id="rv-yes">✓ Đã nhớ</button>' : '<button class="btn primary" id="rv-flip">Lật thẻ</button>'}</div></div></div>`;
    const flip = () => { S.flip = true; draw(); };
    document.getElementById('fc').onclick = e => { if (e.target.closest('[data-say]')) return; if (!S.flip) flip(); };
    const f = document.getElementById('rv-flip'); if (f) f.onclick = flip;
    const y = document.getElementById('rv-yes'), n = document.getElementById('rv-no');
    if (y) y.onclick = () => { S.known.push(w); S.i++; S.flip = false; draw(); };
    if (n) n.onclick = () => { S.unknown.push(w); S.i++; S.flip = false; draw(); };
  };
  clearInterval(window.__rvT);
  window.__rvT = setInterval(() => { const left = S.end - Date.now(); const el = document.getElementById('rv-t'); if (left <= 0){ finish(); return; } if (el) el.textContent = fmt(left); }, 1000);
  draw();
}

/* ---- Tab: Bản dịch song ngữ · Ghi chú · Từ điển tra nhanh ---- */
let _dictPool = null, _dictKey = '';
async function dictPool(){
  const key = MAJOR + ':' + prefs.track + ':' + MAN.modules.filter(m => unlocked(m.id)).map(m => m.id).join(',');
  if (_dictPool && _dictKey === key) return _dictPool;
  const mods = await Promise.all(MAN.modules.filter(m => unlocked(m.id)).map(m => loadModule(m.id)));
  _dictKey = key; return _dictPool = mods.flatMap(m => m.flat);
}
async function ui4After(){
  const h = location.hash.replace('#', ''), m = h.match(/^(lesson|reading|cloze)-(\d+)$/);
  // thu gọn mục lục bên trái (màn hình rộng)
  const st = app.querySelector('.steps');
  if (st && !app.querySelector('.quiz') && !st.querySelector('.steps-tg')){
    const b = document.createElement('button'); b.className = 'steps-tg'; b.type = 'button'; b.setAttribute('aria-label', 'Thu gọn / mở mục lục');
    b.innerHTML = '<span class="tg-ico">‹</span><span class="tg-lbl">Thu gọn</span>';
    b.onclick = () => { const off = app.classList.toggle('side-off'); store.set('ew.sideoff', off); b.querySelector('.tg-ico').textContent = off ? '›' : '‹'; };
    st.prepend(b);
    if (store.get('ew.sideoff', false)){ app.classList.add('side-off'); b.querySelector('.tg-ico').textContent = '›'; }
  }
  if (!m || app.querySelector('.quiz') || app.querySelector('.stabs')) return;
  const n = +m[2], kind = m[1];
  let r = null;
  if (kind === 'reading' && hasReading(n)){ try { r = await loadExtra(n); } catch(e){} }
  const hasTr = !!(r && r.text && r.text_vi);
  const tabs = [];
  if (hasTr) tabs.push(['tr', '🌐 Bản dịch song ngữ']);
  tabs.push(['nt', '📝 Ghi chú'], ['dc', '🔎 Từ điển tra nhanh']);
  const ja = isJA();
  const paras = hasTr ? r.text.split(/\n\n+/).map((p, i) => [p, (r.text_vi.split(/\n\n+/)[i] || '')]) : [];
  const el = document.createElement('section'); el.className = 'card stabs';
  el.innerHTML = `<div class="stab-h" role="tablist">${tabs.map((t, i) => `<button type="button" role="tab" class="${i ? '' : 'on'}" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
    ${hasTr ? `<div class="stab-p" data-p="tr">${paras.map(([a, b]) => `<div class="tr-row"><div class="${ja ? 'jp' : ''}">${esc(a)}</div><div class="muted">${esc(b)}</div></div>`).join('')}</div>` : ''}
    <div class="stab-p" data-p="nt" ${hasTr ? 'hidden' : ''}><textarea id="note-t" rows="5" placeholder="Ghi chú cá nhân cho bài ${n} (tự lưu trên trình duyệt này)…" aria-label="Ghi chú"></textarea><div class="muted" id="note-s" style="font-size:.78rem;margin-top:4px"></div></div>
    <div class="stab-p" data-p="dc" hidden><input class="search" id="dict-q" placeholder="Tra thuật ngữ: tiếng Việt, Anh hoặc Nhật…" aria-label="Tra từ"><div id="dict-r" class="dict-r"></div></div>`;
  app.appendChild(el);
  if (hasTr){ el.querySelector('[data-t="tr"]').classList.add('on'); } else { el.querySelector('.stab-h button').classList.add('on'); }
  el.querySelectorAll('.stab-h button').forEach(b => b.onclick = () => {
    el.querySelectorAll('.stab-h button').forEach(x => x.classList.toggle('on', x === b));
    el.querySelectorAll('.stab-p').forEach(p => p.hidden = p.dataset.p !== b.dataset.t);
  });
  const nt = el.querySelector('#note-t'), ns = el.querySelector('#note-s'), nk = 'ew.note.' + MAJOR + '.' + n; let tm;
  try { nt.value = localStorage.getItem(nk) || ''; } catch(e){}
  nt.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { try { if (nt.value.trim()) localStorage.setItem(nk, nt.value); else localStorage.removeItem(nk); ns.textContent = 'Đã lưu'; } catch(e){ ns.textContent = 'Không lưu được'; } }, 400); };
  const dq = el.querySelector('#dict-q'), dr = el.querySelector('#dict-r'); let dt;
  dq.oninput = () => { clearTimeout(dt); dt = setTimeout(async () => {
    const s = dq.value.trim().toLowerCase(); if (s.length < 2){ dr.innerHTML = ''; return; }
    const pool = await dictPool(); const hits = pool.filter(w => [w.en, w.vi, w.ja, w.kana, w.romaji].join(' ').toLowerCase().includes(s));
    dr.innerHTML = hits.length ? `<div class="muted" style="font-size:.78rem;margin:8px 0">${hits.length} kết quả${hits.length > 8 ? ' (hiện 8 đầu tiên)' : ''}</div>` + hits.slice(0, 8).map(w => `<div class="dict-i"><div><b class="${ja ? 'jp' : ''}">${esc(term(w))}</b> <span class="mono muted ${ja ? 'jp' : ''}">${esc(reading(w))}</span><div>${esc(w.vi)}</div><div class="muted" style="font-size:.82rem">${esc(w.def_vi)}</div></div>${sayBtn(w)}</div>`).join('') : '<div class="muted" style="margin-top:8px">Không tìm thấy.</div>';
  }, 220); };
}
