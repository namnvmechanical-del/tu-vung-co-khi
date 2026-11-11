/* ===== UI v3: ảnh minh họa theo chủ đề / bài, bố cục mới ===== */
const ART = /*ART*/null;
const HUES = {'co-khi':212,'cntt':238,'tu-dong-hoa':178,'hoa-hoc':318,'vat-lieu':22,'nhiet-lanh':196,'dien-tu':40};
const hueOf = slug => HUES[slug] != null ? HUES[slug] : 214;
function hash32(s){ let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function icoG(n, x, y, sc, op){ const d = ART.icons[n]; return d ? `<g transform="translate(${x} ${y}) scale(${sc})" opacity="${op}"><path d="${d}" style="fill:var(--ic)"/></g>` : ''; }
const IMGB = ((window.MV_CONFIG && window.MV_CONFIG.imgBase) || 'img/').replace(/\/?$/, '/');
const PHOTOS = !(window.MV_CONFIG && window.MV_CONFIG.photos === false);
const phT = (slug, id) => IMGB + slug + '/t' + id + '.jpg';
const phB = slug => IMGB + slug + '/banner.jpg';
const phL = l => { const t = (l && l.topics) || []; return t.length ? phT(MAJOR, t[((l.n || 1) - 1) % t.length]) : null; };
function cover(key, icons, hue, deep, wide, photo){
  const svg = coverSvg(key, icons, hue, deep, wide);
  return (PHOTOS && photo) ? svg + `<img class="ph" src="${photo}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : svg;
}
function coverSvg(key, icons, hue, deep, wide){
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
function applyMajorTheme(){ const cr = document.documentElement.getAttribute('data-palette') === 'coursera'; document.documentElement.style.setProperty('--h', cr ? 214 : hueOf(MAJOR)); }
function setNav(k){ applyMajorTheme(); document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === k)); }
function ring(pct){ const c = 2 * Math.PI * 34; return `<svg class="ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="7"/><circle cx="40" cy="40" r="34" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c*pct/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 40 40)"/><text x="40" y="46" text-anchor="middle" font-size="19" font-weight="700" fill="#fff">${pct}%</text></svg>`; }

/* ---- nhật ký ngày học (mục tiêu tuần) ---- */
const dayKey = d => { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); };
function studyDays(){ try { return JSON.parse(localStorage.getItem('ew.days') || '[]'); } catch(e){ return []; } }
function markToday(){ try { const k = dayKey(new Date()), a = studyDays(); if (!a.includes(k)){ a.push(k); localStorage.setItem('ew.days', JSON.stringify(a.slice(-120))); } } catch(e){} }
window.addEventListener('hashchange', () => { if (/^#(lesson|quiz|reading|cloze|qa)-\d+/.test(location.hash)) markToday(); });
if (/^#(lesson|quiz|reading|cloze|qa)-\d+/.test(location.hash)) markToday();
const minutesOf = l => Math.max(10, Math.round(l.count * 0.9));
function weekWidget(){
  const days = new Set(studyDays()), now = new Date(), dow = (now.getDay() + 6) % 7, names = ['T2','T3','T4','T5','T6','T7','CN'];
  let n = 0, cells = '';
  for (let i = 0; i < 7; i++){ const d = new Date(now); d.setDate(now.getDate() - dow + i); const on = days.has(dayKey(d)); if (on) n++;
    cells += `<div class="wd ${on ? 'on' : ''} ${i === dow ? 'today' : ''}"><span class="wd-c">${on ? '✓' : ''}</span><small>${names[i]}</small></div>`; }
  return `<div class="side-card"><h3>Mục tiêu tuần</h3><div class="wk">${cells}</div><p class="muted">${n}/7 ngày có học · mục tiêu: học ít nhất 5 ngày</p></div>`;
}

function viewMajors(){
  setNav('majors');
  const langName = isJA() ? 'tiếng Nhật' : 'tiếng Anh';
  app.innerHTML = `<div class="pg-h"><div><h1>Chọn chuyên ngành</h1><p class="muted" style="margin:6px 0 0;max-width:62ch">Mỗi ngành có 100 chủ đề, 120 bài và khoảng 3.000 thuật ngữ. Phần 1 của mọi ngành học miễn phí. Bạn đang học bằng <b>${langName}</b>.</p></div></div>
  <div class="mgrid2">${MANIFEST.majors.map(M => {
    const r = majorReady(M), d = majorDone(M), hue = hueOf(M.slug), a = ART.art[M.slug];
    const ic = [a.d].concat((a.l['1'] || []).slice(0,1));
    return `<a class="mcard2" href="#nganh-${M.slug}">
      <div class="mc-cover">${cover('major:' + M.slug, ic, hue, true, false, phB(M.slug))}</div>
      <div class="mc-body"><h2>${esc(M.vi)}</h2><div class="muted">${esc(M.en)} · <span class="jp">${esc(M.ja)}</span></div>
        <div class="bar2" style="margin-top:12px"><i style="width:${Math.round(d/120*100)}%"></i></div>
        <div class="mc-foot"><span>${d}/120 bài hoàn thành</span><span>${r < 120 ? (r ? r + '/120 sẵn sàng' : 'Đang soạn') : '120 bài · 3.000 từ'}</span></div></div></a>`; }).join('')}</div>`;
}

try{ const pl = localStorage.getItem('ew.palette') || 'coursera'; document.documentElement.setAttribute('data-palette', pl); }catch(e){ document.documentElement.setAttribute('data-palette', 'coursera'); }
