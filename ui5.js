/* ===== UI v5: tối giản theo tầng – bậc ===== */
const TIERS = [
  {k: 1, name: 'Nền tảng', sub: 'Kiến thức cơ sở của ngành', from: 0, to: 3},
  {k: 2, name: 'Chuyên sâu', sub: 'Các mảng chuyên môn chính', from: 3, to: 7},
  {k: 3, name: 'Ứng dụng', sub: 'Nâng cao & thực hành nghề', from: 7, to: 10}
];
const tierMods = t => MAN.modules.slice(t.from, t.to);
const tierOfMod = id => { const i = MAN.modules.findIndex(m => m.id === id); return (TIERS.find(t => i >= t.from && i < t.to) || TIERS[0]).k; };
const tierKey = () => 'ew.tier.' + MAJOR;
function tierLessons(t){ const ids = new Set(tierMods(t).map(m => m.id)); return LESSONS.filter(l => ids.has(l.m)); }
function tierDone(t){ const tr = PT(prefs.track); const ls = tierLessons(t).filter(l => !l.pending); return [ls.filter(l => tr[l.n] && tr[l.n].best >= PASS).length, ls.length]; }
function curTier(nxL){
  let k = 0; try { k = +sessionStorage.getItem(tierKey()) || 0; } catch(e){}
  if (!k) k = nxL ? tierOfMod(nxL.m) : 1;
  return k;
}
function tierTabs(k, extra){
  return `<div class="tiers" role="tablist" aria-label="Bậc học">${TIERS.map(t => {
    const [d, n] = tierDone(t), p = n ? Math.round(d / n * 100) : 0;
    return `<button type="button" role="tab" class="tier ${t.k === k ? 'on' : ''}" data-tier="${t.k}" aria-selected="${t.k === k}">
      <span class="t-n">Bậc ${t.k}</span><span class="t-name">${t.name}</span><span class="t-sub">${t.sub}</span>
      <span class="t-p"><i style="width:${p}%"></i></span><span class="t-c">${d}/${n} bài</span></button>`; }).join('')}</div>`;
}
function bindTiers(){
  const btns = app.querySelectorAll('.tier'), panels = app.querySelectorAll('[data-tp]');
  btns.forEach(b => b.onclick = () => {
    const k = b.dataset.tier; try { sessionStorage.setItem(tierKey(), k); } catch(e){}
    btns.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    panels.forEach(p => p.hidden = p.dataset.tp !== k);
  });
}

/* chọn ngành: một nút gọn thay cho 7 chip */
function majorBar(){
  return `<details class="msw"><summary><span aria-hidden="true">${esc(MAN.icon || '')}</span><b>${esc(MAN.vi)}</b><span class="msw-c">Đổi ngành ▾</span></summary>
    <div class="msw-list">${MANIFEST.majors.map(M => { const r = majorReady(M);
      return `<a href="#nganh-${M.slug}" class="${M.slug === MAJOR ? 'on' : ''}"><span aria-hidden="true">${M.icon}</span>${esc(M.vi)}${r < 120 ? `<small>${r ? r + '/120 bài' : 'sắp có'}</small>` : ''}</a>`; }).join('')}</div></details>`;
}

function viewRoadmap(){
  setNav('roadmap');
  const tr = PT(prefs.track), hue = hueOf(MAJOR);
  const done = LESSONS.filter(l => !l.pending && tr[l.n] && tr[l.n].best >= PASS);
  const words = done.reduce((s, l) => s + l.count, 0);
  const pct = Math.round(done.length / LESSONS.length * 100), nx = nextLesson();
  const ja = isJA(), langName = ja ? 'tiếng Nhật' : 'tiếng Anh';
  const nxL = nx ? lessonByN(nx) : null, tk = curTier(nxL);
  let h = `${majorBar()}
  <div class="rm2"><div class="rm-main">
    <section class="rm-head">
      <div class="rm-art">${cover('major:' + MAJOR, [ART.art[MAJOR].d].concat(lessonIcons(1).slice(0, 1)), hue, true, true, phB(MAJOR))}</div>
      <div class="rm-body">
        <h1>${esc(MAN.vi)} <em>học bằng ${langName}</em></h1>
        <div class="rm-prog"><div class="bar2"><i style="width:${pct}%"></i></div><b>${done.length}/${LESSONS.length} bài · ${pct}%</b></div>
        <div class="rm-act">${nx ? `<a class="btn primary" href="#lesson-${nx}">${tr[nx] ? 'Tiếp tục học' : 'Bắt đầu học'} · Bài ${nx} →</a><span class="rm-nx muted">${esc(topicLabel(nxL))}</span>` : `<span class="chip">Đã xong toàn bộ lộ trình</span>`}</div>
      </div>
    </section>
    ${tierTabs(tk)}`;
  TIERS.forEach(t => {
    h += `<div data-tp="${t.k}" ${t.k === tk ? '' : 'hidden'}>`;
    tierMods(t).forEach(m => {
      const ls = LESSONS.filter(l => l.m === m.id), d = ls.filter(l => !l.pending && tr[l.n] && tr[l.n].best >= PASS).length;
      const open = nxL ? nxL.m === m.id : m === tierMods(t)[0];
      h += `<details class="acc" ${open ? 'open' : ''}><summary><span class="mod-n">${m.id}</span>
        <div class="mod-t"><h2>${esc(m.vi)} ${FREE.has(m.id) ? '<span class="chip free">Miễn phí</span>' : ''}</h2></div>
        <span class="mod-c ${d === ls.length ? 'full' : ''}">${d}/${ls.length}</span><span class="chev" aria-hidden="true"></span></summary>
        <div class="lrows">${ls.map(l => {
          if (l.pending) return `<div class="lrow pending"><div class="lr-th">${cover('p' + l.n, [], hue)}</div><div class="lr-b"><div class="lr-t">Bài ${l.n} · ${esc(topicLabel(l))}</div><div class="lr-m">Đang soạn</div></div></div>`;
          const s = lessonStatus(l.n), lk = !unlocked(l.m), p = tr[l.n];
          const st = lk ? '<span class="st lock" title="Cần mở khóa">🔒</span>' : (s.cls === 'done' ? '<span class="st ok" title="Đã hoàn thành">✓</span>' : (s.cls === 'tried' ? '<span class="st mid" title="Đang học dở">◐</span>' : '<span class="st"></span>'));
          return `<a class="lrow ${lk ? 'locked' : s.cls} ${l.n === nx ? 'next' : ''}" href="${lk ? '#pricing' : '#lesson-' + l.n}">
            <div class="lr-th">${cover('l' + MAJOR + l.n, lessonIcons(l.n), hue, false, false, phL(l))}</div>
            <div class="lr-b"><div class="lr-t">Bài ${l.n} · ${esc(topicLabel(l))}</div><div class="lr-m"><span>${l.count} từ · ~${minutesOf(l)} phút</span>${p ? `<span class="sc">${p.best}%</span>` : ''}</div></div>
            ${l.n === nx && !lk ? '<span class="lr-go">Học tiếp</span>' : ''}${st}</a>`; }).join('')}</div></details>`;
    });
    h += '</div>';
  });
  h += `</div><aside class="rm-side">${weekWidget()}
    <div class="side-card"><h3>Kho từ vựng</h3><div class="big">${words.toLocaleString('vi-VN')}</div><p class="muted">thuật ngữ đã học</p>
      ${(done.length || Object.keys(tr).length) ? '<a class="btn primary wide" href="#review">⏱ Ôn tập nhanh 5 phút</a>' : '<p class="muted">Làm quiz bài đầu tiên để bắt đầu ôn tập.</p>'}</div></aside></div>`;
  app.innerHTML = h; bindTiers();
}

function viewTopics(){
  setNav('topics');
  const hue = hueOf(MAJOR), nxL = nextLesson() ? lessonByN(nextLesson()) : null, tk = curTier(nxL);
  let h = `${majorBar()}<div class="pg-h"><h1>Tra cứu chủ đề · ${esc(MAN.vi)}</h1><input class="search" id="q" placeholder="Tìm từ: tiếng Việt, Anh hoặc Nhật…" aria-label="Tìm từ"></div><div id="sr"></div>${tierTabs(tk)}`;
  TIERS.forEach(t => {
    h += `<div data-tp="${t.k}" ${t.k === tk ? '' : 'hidden'}>`;
    tierMods(t).forEach((m, i) => {
      h += `<details class="acc" ${i === 0 ? 'open' : ''}><summary><span class="mod-n">${m.id}</span><div class="mod-t"><h2>${esc(m.vi)}</h2><div class="sub">${esc(m.en)}</div></div><span class="mod-c">${m.topics.length} chủ đề</span><span class="chev" aria-hidden="true"></span></summary>
        <div class="lgrid tg" style="padding:14px 16px">${m.topics.map(t2 => `<a class="lcard tcard ${t2.n ? '' : 'pending'}" href="#topic-${t2.id}">
          <div class="lc-cover">${cover('t' + MAJOR + t2.id, topicIcons(t2.id), hue, false, false, phT(MAJOR, t2.id))}<span class="lc-no">${t2.id}</span></div>
          <div class="lc-body"><div class="lc-title">${esc(t2.vi)}</div><div class="lc-sub">${esc(t2.en)}</div></div></a>`).join('')}</div></details>`;
    });
    h += '</div>';
  });
  app.innerHTML = h; bindTiers();
  const q = document.getElementById('q'); let timer;
  q.oninput = () => { clearTimeout(timer); timer = setTimeout(() => search(q.value), 250); };
}
