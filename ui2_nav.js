function lessonNav(n, active){
  const ps = partStatus(n);
  const qz = PT(prefs.track)[n];
  const stat = v => { const m = /(\d+)/.exec(String(v||'')); return !m ? '' : (+m[1] >= 70 ? 'done' : 'tried'); };
  const step = (i, href, label, val, on, ok) => {
    const st = ok ? stat(val) : 'off';
    const sub = !ok ? 'sắp có' : (/\d/.test(String(val||'')) ? val : '');
    const inner = `<span class="dot">${st === 'done' ? '✓' : i}</span><span class="lbl">${label}</span><small>${sub}</small>`;
    return ok ? `<a class="step ${st} ${on?'on':''}" href="${href}"${on?' aria-current="step"':''}>${inner}</a>` : `<span class="step off" title="Đang soạn">${inner}</span>`;
  };
  return `<nav class="steps" aria-label="Các phần của bài ${n}">
    ${step(1, '#lesson-' + n, 'Từ vựng', '', active === 'words', true)}
    ${step(2, '#quiz-' + n, 'Quiz', qz ? qz.best + '%' : '', active === 'quiz', true)}
    ${step(3, '#reading-' + n, 'Đọc hiểu', ps.r, active === 'reading', hasReading(n))}
    ${step(4, '#cloze-' + n, 'Điền từ', ps.c, active === 'cloze', hasReading(n))}
    ${step(5, '#qa-' + n, 'Hỏi đáp', ps.q, active === 'qa', hasQA(n))}
  </nav>`;
}
