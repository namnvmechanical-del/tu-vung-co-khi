/* ===== UI v3: ảnh minh họa theo chủ đề / bài, bố cục mới ===== */
const ART = /*ART*/null;
const HUES = {'co-khi':212,'cntt':238,'tu-dong-hoa':178,'hoa-hoc':318,'vat-lieu':22,'nhiet-lanh':196,'dien-tu':40};
const hueOf = slug => HUES[slug] != null ? HUES[slug] : 214;
function hash32(s){ let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function icoG(n, x, y, sc, op){ const d = ART.icons[n]; return d ? `<g transform="translate(${x} ${y}) scale(${sc})" opacity="${op}"><path d="${d}" style="fill:var(--ic)"/></g>` : ''; }
function cover(key, icons, hue, deep, wide){
  const W = wide ? 960 : 320, r = hash32(key), shift = (r % 13) - 6, pat = (r >> 4) % 4, flip = wide ? 0 : (r >> 8) & 1;
  const h1 = (hue + shift + 360) % 360, h2 = (h1 + 10 + 360) % 360, id = 'cg' + r.toString(36) + (wide ? 'w' : '');
  const o1 = ((r % 5) - 2) + 5, o2 = -5 - ((r >> 3) % 3), dp = deep ? ' + var(--cdeep)' : '';
  let p = '';
  const cx = flip ? 20 : W - 20;
  if (pat === 0) for (let i = 0; i < 4; i++) p += `<circle cx="${cx}" cy="${flip?160:20}" r="${46+i*36}" fill="none" style="stroke:var(--pt)" stroke-opacity=".15" stroke-width="1.6"/>`;
  else if (pat === 1) for (let i = 0; i < W / 44; i++) p += `<path d="M${-60+i*46} 190L${50+i*46} -10" style="stroke:var(--pt)" stroke-opacity=".09" stroke-width="12"/>`;
  else if (pat === 2) for (let i = 0; i < W / 28; i++) for (let j = 0; j < 7; j++) p += `<circle cx="${12+i*28}" cy="${12+j*28}" r="1.7" style="fill:var(--pt)" fill-opacity=".2"/>`;
  else { for (let i = 1; i < W / 32; i++) p += `<path d="M${i*32} 0V180" style="stroke:var(--pt)" stroke-opacity=".08"/>`; for (let j = 1; j < 6; j++) p += `<path d="M0 ${j*32}H${W}" style="stroke:var(--pt)" stroke-opacity=".08"/>`; p += `<circle cx="${W-80}" cy="90" r="78" fill="none" style="stroke:var(--pt)" stroke-opacity=".16" stroke-dasharray="4 6"/>`; }
  const ic = icons && icons.length ? icons : [ART.art[MAJOR].d];
  const bx = flip ? 14 : W - 162;
  return `<svg class="cv" viewBox="0 0 ${W} 180" preserveAspectRatio="${wide ? 'xMaxYMid' : 'xMidYMid'} slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:hsl(var(--h) var(--cs) calc(var(--cl) + ${o1}%${dp}))"/><stop offset="1" style="stop-color:hsl(var(--h) var(--cs) calc(var(--cl) + ${o2}%${dp}))"/></linearGradient></defs>
    <rect width="${W}" height="180" fill="url(#${id})"/>${p}
    <circle cx="${bx+74}" cy="92" r="70" style="fill:var(--pt)" fill-opacity=".07"/>${icoG(ic[0], bx, 18, 6.2, .82)}${ic[1] ? icoG(ic[1], wide ? W - 290 : (flip ? 262 : 24), 112, 2.1, .45) : ''}</svg>`;
}
const topicIcons = id => (ART.art[MAJOR].t[String(id)] || []);
const lessonIcons = n => (ART.art[MAJOR].l[String(n)] || []);
function applyMajorTheme(){ document.documentElement.style.setProperty('--h', hueOf(MAJOR)); }
function setNav(k){ applyMajorTheme(); document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === k)); }
function ring(pct){ const c = 2 * Math.PI * 34; return `<svg class="ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="7"/><circle cx="40" cy="40" r="34" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c*pct/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 40 40)"/><text x="40" y="46" text-anchor="middle" font-size="19" font-weight="700" fill="#fff">${pct}%</text></svg>`; }

function viewRoadmap(){
  setNav('roadmap');
  const tr = PT(prefs.track), hue = hueOf(MAJOR);
  const done = LESSONS.filter(l => !l.pending && tr[l.n] && tr[l.n].best >= PASS);
  const words = done.reduce((s,l) => s + l.count, 0);
  const sc = Object.values(tr).filter(p => p && typeof p.best === 'number').map(p => p.best);
  const avg = sc.length ? Math.round(sc.reduce((a,b) => a + b, 0) / sc.length) : 0;
  const pct = Math.round(done.length / LESSONS.length * 100), nx = nextLesson();
  const ja = isJA(), langName = ja ? 'tiếng Nhật' : 'tiếng Anh', nTopics = MAN.modules.reduce((s,m) => s + m.topics.length, 0);
  let h = `${majorBar()}
  <section class="banner">
    <div class="bn-art">${cover('major:' + MAJOR, [ART.art[MAJOR].d].concat(lessonIcons(1).slice(0,1)), hue, true, true)}</div>
    <div class="bn-body">
      <span class="eyebrow">${esc(MAN.icon || '')} ${esc(MAN.en)} · <span class="jp">${esc(MAN.ja)}</span></span>
      <h1>${esc(MAN.vi)}<br><em>học bằng ${langName}</em></h1>
      <p>${LESSONS.length} bài · ${nTopics} chủ đề · ${TOTAL_WORDS.toLocaleString('vi-VN')} thuật ngữ. Mỗi bài có từ vựng, quiz, đọc hiểu, điền từ và hỏi đáp tình huống.</p>
      <div class="bn-act">
        ${nx ? `<a class="btn light" href="#lesson-${nx}">${tr[nx] ? 'Tiếp tục' : 'Bắt đầu'} bài ${nx} →</a>` : `<span class="chip">Đã xong toàn bộ lộ trình</span>`}
        <a class="btn ghost" href="#topics">Xem chủ đề</a>
      </div>
    </div>
  </section>
  <section class="kpis">
    <div><b>${done.length}<small>/${LESSONS.length} bài</small></b><span>Tiến độ ${pct}%</span><div class="bar2"><i style="width:${pct}%"></i></div></div>
    <div><b>${words.toLocaleString('vi-VN')}</b><span>Từ đã học</span></div>
    <div><b>${avg}%</b><span>Điểm trung bình</span></div>
    <div><b>${nx ?? '—'}</b><span>Bài tiếp theo</span></div>
  </section>`;
  MAN.modules.forEach(m => {
    const ls = LESSONS.filter(l => l.m === m.id);
    const d = ls.filter(l => !l.pending && tr[l.n] && tr[l.n].best >= PASS).length;
    const free = FREE.has(m.id);
    h += `<section class="mod">
      <div class="mod-h"><span class="mod-n">${m.id}</span>
        <div class="mod-t"><h2>${esc(m.vi)} ${free ? '<span class="chip free">Miễn phí</span>' : ''}</h2><div class="sub">${esc(m.en)} · <span class="jp">${esc(m.ja)}</span></div></div>
        <div class="mod-p"><span>${d}/${ls.length} bài</span><div class="bar2"><i style="width:${Math.round(d/ls.length*100)}%"></i></div></div></div>
      <div class="lgrid">${ls.map(l => {
        if (l.pending) return `<div class="lcard pending"><div class="lc-cover">${cover('p'+l.n,[],hue)}<span class="lc-no">${l.n}</span></div><div class="lc-body"><div class="lc-title">${esc(topicLabel(l))}</div><div class="lc-meta"><span>Đang soạn</span></div></div></div>`;
        const s = lessonStatus(l.n), lk = !unlocked(l.m), p = tr[l.n];
        const lab = lk ? 'Cần mở khóa' : (l.n === nx && !s.cls ? '▶ Học tiếp' : s.label);
        return `<a class="lcard ${lk ? 'locked' : s.cls} ${l.n === nx ? 'next' : ''}" href="${lk ? '#pricing' : '#lesson-' + l.n}">
          <div class="lc-cover">${cover('l' + MAJOR + l.n, lessonIcons(l.n), hue)}<span class="lc-no">${l.n}</span>${lk ? '<span class="lc-flag">🔒</span>' : (s.cls === 'done' ? '<span class="lc-flag ok">✓</span>' : '')}${p ? `<span class="lc-bar"><i style="width:${Math.min(100,p.best)}%"></i></span>` : ''}</div>
          <div class="lc-body"><div class="lc-title">${esc(topicLabel(l))}</div><div class="lc-meta"><span>${l.count} từ</span><span class="lc-st">${lab}</span></div></div></a>`; }).join('')}
      </div></section>`;
  });
  app.innerHTML = h;
}

function viewTopics(){
  setNav('topics');
  const hue = hueOf(MAJOR);
  let h = `${majorBar()}<div class="pg-h"><h1>100 chủ đề · ${esc(MAN.vi)}</h1><input class="search" id="q" placeholder="Tìm từ: tiếng Việt, Anh hoặc Nhật…" aria-label="Tìm từ"></div><div id="sr"></div>`;
  MAN.modules.forEach(m => {
    h += `<section class="mod"><div class="mod-h"><span class="mod-n">${m.id}</span><div class="mod-t"><h2>${esc(m.vi)}</h2><div class="sub">${esc(m.en)} · <span class="jp">${esc(m.ja)}</span></div></div></div>
      <div class="lgrid tg">${m.topics.map(t => `<a class="lcard tcard ${t.n ? '' : 'pending'}" href="#topic-${t.id}">
        <div class="lc-cover">${cover('t' + MAJOR + t.id, topicIcons(t.id), hue)}<span class="lc-no">${t.id}</span></div>
        <div class="lc-body"><div class="lc-title">${esc(t.vi)}</div><div class="lc-sub">${esc(t.en)}</div><div class="lc-meta"><span class="jp">${esc(t.ja)}</span><span>${t.n ? t.n + ' từ' : 'đang soạn'}</span></div></div></a>`).join('')}</div></section>`;
  });
  app.innerHTML = h;
  const q = document.getElementById('q'); let timer;
  q.oninput = () => { clearTimeout(timer); timer = setTimeout(() => search(q.value), 250); };
}

function viewMajors(){
  setNav('majors');
  const langName = isJA() ? 'tiếng Nhật' : 'tiếng Anh';
  app.innerHTML = `<div class="pg-h"><div><h1>Chọn chuyên ngành</h1><p class="muted" style="margin:6px 0 0;max-width:62ch">Mỗi ngành có 100 chủ đề, 120 bài và khoảng 3.000 thuật ngữ. Phần 1 của mọi ngành học miễn phí. Bạn đang học bằng <b>${langName}</b>.</p></div></div>
  <div class="mgrid2">${MANIFEST.majors.map(M => {
    const r = majorReady(M), d = majorDone(M), hue = hueOf(M.slug), a = ART.art[M.slug];
    const ic = [a.d].concat((a.l['1'] || []).slice(0,1));
    return `<a class="mcard2" href="#nganh-${M.slug}">
      <div class="mc-cover">${cover('major:' + M.slug, ic, hue, true)}</div>
      <div class="mc-body"><h2>${esc(M.vi)}</h2><div class="muted">${esc(M.en)} · <span class="jp">${esc(M.ja)}</span></div>
        <div class="bar2" style="margin-top:12px"><i style="width:${Math.round(d/120*100)}%"></i></div>
        <div class="mc-foot"><span>${d}/120 bài hoàn thành</span><span>${r < 120 ? (r ? r + '/120 sẵn sàng' : 'Đang soạn') : '120 bài · 3.000 từ'}</span></div></div></a>`; }).join('')}</div>`;
}

try{ const pl = localStorage.getItem('ew.palette'); if (pl) document.documentElement.setAttribute('data-palette', pl); }catch(e){}
