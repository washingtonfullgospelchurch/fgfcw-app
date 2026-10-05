(function () {
  'use strict';

  var TAGS = {
    '감사': ['#E6F6FD', '#005F85'], '행사': ['#EBEBF7', '#2E3092'], '예배': ['#FFF1E0', '#8A4B00'],
    '안내': ['#EEF0F3', '#3E4756'], '기도': ['#EBEBF7', '#2E3092'], '나눔': ['#FDECEC', '#9B2C2C']
  };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function chev() {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'chev');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M9 6l6 6-6 6'); s.appendChild(p); return s;
  }

  /* ---------- 탭 ---------- */
  function go(tab) {
    document.querySelectorAll('.page').forEach(function (p) { p.hidden = p.dataset.tab !== tab; });
    document.querySelectorAll('.tabbar button').forEach(function (b) {
      if (b.dataset.go === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) {
      e.preventDefault(); go(b.dataset.go);
      if (b.dataset.scroll) {
        var t = document.getElementById(b.dataset.scroll);
        if (t) setTimeout(function () { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
      }
    }
  });
  var start = (location.hash || '#home').slice(1);
  go(document.querySelector('.page[data-tab="' + start + '"]') ? start : 'home');

  /* ---------- 소식 ---------- */
  function openNews(i) {
    go('news');
    var head = document.getElementById('news-' + i);
    if (head && head.getAttribute('aria-expanded') !== 'true') head.click();
    if (head) head.scrollIntoView({ block: 'center' });
  }

  function render(data) {
    document.getElementById('bulletinDate').textContent = (data.bulletinDate || '') + ' · 눌러서 자세히 보기';

    var list = document.getElementById('newsList'); list.innerHTML = '';
    var home = document.getElementById('homeNews'); home.innerHTML = '';
    (data.news || []).forEach(function (n, i) {
      var c = TAGS[n.tag] || TAGS['안내'];
      var body = el('div', { class: 'news-body', id: 'news-body-' + i, text: n.body || '' });
      body.hidden = true;
      var head = el('button', { class: 'news-head', id: 'news-' + i, 'aria-expanded': 'false', 'aria-controls': 'news-body-' + i }, [
        el('span', { class: 'tag', style: 'background:' + c[0] + ';color:' + c[1], text: n.tag || '안내' }),
        el('span', { class: 'news-text' }, [el('strong', { text: n.title || '' }), el('small', { text: n.meta || '' })]),
        chev()
      ]);
      head.addEventListener('click', function () {
        var open = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', open ? 'false' : 'true');
        body.hidden = open;
      });
      list.appendChild(el('div', { class: 'card news' }, [head, body]));

      if (i < 3) {
        var row = el('button', { class: 'list-row' }, [el('strong', { text: n.title || '' }), el('small', { text: n.meta || '' })]);
        row.addEventListener('click', function () { openNews(i); });
        home.appendChild(row);
      }
    });

    renderGiving(data.giving || {});
    renderWorship(data);
    renderSermons(data.playlists || {});
    renderChurch(data);

    var ev = document.getElementById('eventList'); ev.innerHTML = '';
    (data.events || []).forEach(function (e) {
      ev.appendChild(el('div', { class: 'ev' }, [
        el('div', { class: 'ev-date' }, [document.createTextNode(e.date || ''), el('small', { text: e.day || '' })]),
        el('div', {}, [el('strong', { text: e.title || '' }), el('small', { text: e.meta || '' })])
      ]));
    });
  }


  /* ---------- 예배 시간 · 다음 예배 ---------- */
  var DAYS = ['주일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  function fmtTime(h, m) {
    var ap = h < 12 ? '오전' : '오후', hh = h % 12 || 12;
    return ap + ' ' + hh + ':' + (m < 10 ? '0' : '') + m;
  }
  function timeRow(w) {
    return el('div', { class: 'time-row' }, [
      el('div', {}, [el('strong', { text: w.name + (w.interp ? ' *' : '') }), w.en ? el('small', { text: w.en }) : document.createTextNode('')]),
      el('span', { class: 'time-val', text: w.time })
    ]);
  }
  function renderWorship(data) {
    var ws = data.worship || [];
    var home = document.getElementById('homeTimes'); home.innerHTML = '';
    ws.filter(function (w) { return w.name.indexOf('청년 영어예배') !== 0; }).forEach(function (w) {
      home.appendChild(el('div', { class: 'time-row' }, [el('strong', { text: w.name }), el('span', { class: 'time-val', text: w.time })]));
    });
    var full = document.getElementById('worshipTimes'); full.innerHTML = '';
    full.appendChild(el('div', { class: 'times-cap', text: '예배 시간 · Worship' }));
    ws.forEach(function (w) { full.appendChild(timeRow(w)); });
    var sch = document.getElementById('schoolTimes'); sch.innerHTML = '';
    sch.appendChild(el('div', { class: 'times-cap', text: '교회학교 · Sunday School' }));
    (data.schoolWorship || []).forEach(function (w) { sch.appendChild(timeRow(w)); });

    // 다음 예배 (주일 · 수요 · 금요)
    var now = new Date(), best = null;
    ws.forEach(function (w) {
      if (typeof w.day !== 'number') return;
      for (var add = 0; add < 8; add++) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add, w.h, w.m);
        if (d.getDay() !== w.day) continue;
        if (d.getTime() + 60 * 60 * 1000 < now.getTime()) continue; // 시작 후 1시간까지는 '지금'으로 표시
        if (!best || d < best.d) best = { d: d, w: w };
        break;
      }
    });
    if (best) {
      var diffDays = Math.round((new Date(best.d.getFullYear(), best.d.getMonth(), best.d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
      var when = diffDays === 0 ? '오늘' : diffDays === 1 ? '내일' : DAYS[best.d.getDay()];
      var live = best.d <= now;
      document.getElementById('nextName').textContent = best.w.name;
      document.getElementById('nextWhen').textContent = live ? '지금 예배 중이에요' : when + ' ' + fmtTime(best.w.h, best.w.m);
      document.getElementById('nextService').classList.toggle('is-live', live);
    }
  }

  /* ---------- 설교 재생목록 ---------- */
  function videoCard(p, cls) {
    var card = el('a', { class: cls, href: p.url }, [
      el('span', { class: 'thumb' }, [
        el('img', { src: p.thumb, alt: '', loading: 'lazy' }),
        p.count ? el('span', { class: 'count', text: p.count + '편' }) : document.createTextNode('')
      ]),
      el('span', { class: 'vc-text' }, [el('strong', { text: p.title }), p.en ? el('small', { text: p.en }) : document.createTextNode('')])
    ]);
    var img = card.querySelector('img');
    img.addEventListener('error', function () { img.parentNode.classList.add('noimg'); });
    return card;
  }
  function renderSermons(pls) {
    var main = document.getElementById('mainLists'); main.innerHTML = '';
    var hv = document.getElementById('homeVideos'); hv.innerHTML = '';
    (pls.main || []).forEach(function (p) {
      main.appendChild(videoCard(p, 'vcard big'));
      hv.appendChild(videoCard(p, 'vcard'));
    });
    var other = document.getElementById('otherLists'); other.innerHTML = '';
    (pls.groups || []).forEach(function (g) {
      var row = el('div', { class: 'hscroll' });
      g.items.forEach(function (p) { row.appendChild(videoCard(p, 'vcard')); });
      other.appendChild(el('div', { class: 'pl-group' }, [el('h2', { class: 'sec-title', text: g.title }), row]));
    });
  }

  /* ---------- 교회 · 부서 ---------- */
  var MIN_ICONS = {
    kids: 'M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M7 22v-6l-2-4 4-2h6l4 2-2 4v6 M10 22v-4h4v4',
    youth: 'M8 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 22v-5a5 5 0 0 1 10 0 M11 22v-5a5 5 0 0 1 10 0',
    em: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
    choir: 'M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    school: 'M2 8l10-5 10 5-10 5z M6 10v5c0 2 3 4 6 4s6-2 6-4v-5 M22 8v6',
    childcare: 'M12 3v2 M5.6 5.6l1.4 1.4 M3 12h2 M19 12h2 M17 7l1.4-1.4 M8 16a4 4 0 1 1 8 0 M4 20h16',
    mission: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3.6 9h16.8 M3.6 15h16.8 M12 3c-3 3-3 15 0 18 M12 3c3 3 3 15 0 18'
  };
  function iconSvg(key) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', MIN_ICONS[key] || MIN_ICONS.mission);
    s.appendChild(p); return s;
  }
  var minSheet = document.getElementById('minSheet');
  function openMinistry(m) {
    var ic = document.getElementById('minIcon'); ic.innerHTML = ''; ic.appendChild(iconSvg(m.icon));
    document.getElementById('minTitle').textContent = m.name;
    document.getElementById('minEn').textContent = m.en || '';
    document.getElementById('minIntro').textContent = m.intro || '';
    var pts = document.getElementById('minPoints'); pts.innerHTML = '';
    (m.points || []).forEach(function (t) { pts.appendChild(el('li', { text: t })); });
    pts.hidden = !(m.points && m.points.length);
    var info = document.getElementById('minInfo'); info.innerHTML = '';
    (m.info || []).forEach(function (r) { info.appendChild(el('div', {}, [el('span', { text: r[0] }), el('strong', { text: r[1] })])); });
    info.hidden = !(m.info && m.info.length);
    var ch = document.getElementById('minChips'); ch.innerHTML = '';
    (m.chips || []).forEach(function (t) { ch.appendChild(el('span', { class: 'chip', text: t })); });
    ch.hidden = !(m.chips && m.chips.length);
    var v = document.getElementById('minVerse'); v.textContent = m.verse ? '주제 말씀 · ' + m.verse : ''; v.hidden = !m.verse;
    var pl = document.getElementById('minPlaylist'); pl.hidden = !m.playlist; if (m.playlist) pl.href = m.playlist;
    minSheet.hidden = false;
  }
  document.getElementById('closeMin').addEventListener('click', function () { minSheet.hidden = true; });
  minSheet.addEventListener('click', function (e) { if (e.target === minSheet) minSheet.hidden = true; });

  function renderChurch(data) {
    var c = data.church || {};
    document.getElementById('greeting').textContent = c.greeting || '';
    var grid = document.getElementById('ministryGrid'); grid.innerHTML = '';
    (data.ministries || []).forEach(function (m) {
      var b = el('button', { class: 'min-card' }, [
        el('span', { class: 'min-icon' }, [iconSvg(m.icon)]),
        el('strong', { text: m.name }), el('small', { text: m.en || '' })
      ]);
      b.addEventListener('click', function () { openMinistry(m); });
      grid.appendChild(b);
    });
    var st = document.getElementById('staffList'); st.innerHTML = '';
    (data.staff || []).forEach(function (p) {
      st.appendChild(el('div', { class: 'staff-row' }, [
        el('span', { class: 'avatar', text: p[0].slice(0, 1) }),
        el('div', {}, [el('strong', { text: p[0] + ' ' + p[1] }), el('small', { text: p[2] || '' })])
      ]));
    });
    var tc = document.getElementById('teamChips'); tc.innerHTML = '';
    (data.teams || []).forEach(function (t) { tc.appendChild(el('span', { class: 'chip', text: t })); });
  }

  /* ---------- 헌금 ---------- */
  var giving = {};
  var freq = '한 번';
  var amountIn = document.getElementById('amount');
  var methodSel = document.getElementById('method');
  var fundSel = document.getElementById('fund');
  var giveGo = document.getElementById('giveGo');

  function amountVal() {
    var v = parseFloat((amountIn.value || '').replace(/[^0-9.]/g, ''));
    return isNaN(v) ? 0 : Math.round(v * 100) / 100;
  }
  function money(v) { return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function updateGo() {
    var v = amountVal();
    giveGo.textContent = money(v) + ' 헌금 계속하기';
    giveGo.disabled = !(v > 0 && fundSel.value && methodSel.value);
  }

  function renderGiving(g) {
    giving = g;
    methodSel.innerHTML = '';
    var methods = [];
    if (g.onlineUrl) methods.push(['online', '카드 / 은행계좌']);
    if (g.zelle) methods.push(['zelle', 'Zelle (은행 앱)']);
    methods.push(['check', '수표 / 헌금함']);
    methods.forEach(function (m) { var o = el('option', { value: m[0], text: m[1] }); methodSel.appendChild(o); });

    fundSel.innerHTML = '';
    fundSel.appendChild(el('option', { value: '', text: '헌금 종류 선택' }));
    (g.funds || []).forEach(function (grp) {
      var parent = fundSel;
      if (grp.group) { parent = el('optgroup', { label: grp.group }); fundSel.appendChild(parent); }
      (grp.items || []).forEach(function (it) { parent.appendChild(el('option', { value: it, text: it })); });
    });

    document.getElementById('giveFootNote').textContent = g.footNote || '';
    document.getElementById('giveContact').textContent = g.contact ? '헌금 문의: ' + g.contact : '';
    updateGo();
  }

  amountIn.addEventListener('input', function () {
    var c = amountIn.value.replace(/[^0-9.]/g, '');
    var parts = c.split('.');
    if (parts.length > 2) c = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1] && parts[1].length > 2) c = parts[0] + '.' + parts[1].slice(0, 2);
    if (c !== amountIn.value) amountIn.value = c;
    var shown = c ? c.split('.') : ['0'];
    shown[0] = (parseInt(shown[0] || '0', 10) || 0).toLocaleString('en-US');
    document.getElementById('amountText').textContent = shown.join('.');
    var txt = shown.join('.');
    document.querySelector('.amount-show').style.fontSize = txt.length > 9 ? '44px' : txt.length > 6 ? '56px' : '';
    try { amountIn.setSelectionRange(c.length, c.length); } catch (e) {}
    updateGo();
  });
  amountIn.addEventListener('focus', function () {
    setTimeout(function () { try { amountIn.setSelectionRange(amountIn.value.length, amountIn.value.length); } catch (e) {} }, 0);
  });
  methodSel.addEventListener('change', updateGo);
  fundSel.addEventListener('change', updateGo);
  document.querySelectorAll('.freq button').forEach(function (b) {
    b.addEventListener('click', function () {
      freq = b.dataset.freq;
      document.querySelectorAll('.freq button').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
    });
  });

  var giveSheet = document.getElementById('giveSheet');
  giveGo.addEventListener('click', function () {
    var v = amountVal(), fund = fundSel.value, m = methodSel.value;
    var name = document.getElementById('giver').value.trim();
    var memo = fund.replace(/\s*\(.*$/, '') + (freq !== '한 번' ? ' (' + freq + ')' : '') + (name ? ' ' + name : '');
    document.getElementById('sumAmount').textContent = money(v);
    document.getElementById('sumFund').textContent = fund;
    document.getElementById('sumFreq').textContent = freq;
    document.getElementById('stepZelle').hidden = m !== 'zelle';
    document.getElementById('stepOnline').hidden = m !== 'online';
    document.getElementById('stepCheck').hidden = m !== 'check';
    if (m === 'zelle') {
      document.getElementById('zelleId').textContent = giving.zelle;
      document.getElementById('zelleNameLabel').textContent = giving.zelleName ? '받는 사람 · ' + giving.zelleName : '받는 사람';
      document.getElementById('memoZelle').textContent = memo;
      document.getElementById('zelleRecurring').hidden = freq === '한 번';
    }
    if (m === 'online') {
      document.getElementById('onlineLink').href = giving.onlineUrl;
      document.getElementById('onAmount').textContent = money(v);
      var fmap = { '한 번': 'One-time', '매월': 'Monthly', '분기마다': 'Quarterly', '매년': 'Yearly' };
      document.getElementById('onFreq').textContent = freq + ' (' + fmap[freq] + ')';
      document.getElementById('memoOnline').textContent = memo;
    }
    if (m === 'check') {
      document.getElementById('checkPayee').textContent = giving.checkPayee || '';
      document.getElementById('mailAddress').textContent = giving.mailAddress || '';
      document.getElementById('memoCheck').textContent = memo;
    }
    giveSheet.hidden = false;
  });
  document.getElementById('closeGive').addEventListener('click', function () { giveSheet.hidden = true; });
  giveSheet.addEventListener('click', function (e) { if (e.target === giveSheet) giveSheet.hidden = true; });

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = document.getElementById(btn.dataset.copy).textContent;
      function done() { btn.textContent = '복사됨'; setTimeout(function () { btn.textContent = '복사'; }, 1800); }
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
      else {
        var ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text;
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {}
        ta.remove(); done();
      }
    });
  });

  fetch('data.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function () {
      document.getElementById('newsList').appendChild(el('p', { class: 'sub', text: '소식을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.' }));
    });


  /* ---------- 리딩지저스 통독 (날짜에 맞춰 자동으로 바뀜) ---------- */
  var plan = null, rjOffset = 0;
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function planIndex(date) {
    var rest = plan.restDays || [];
    if (rest.indexOf(date.getDay()) >= 0) return null;
    var a = parseYmd(plan.anchorDate), t = dayStart(date), idx = plan.anchorIndex;
    var step = t > a ? 1 : -1, d = new Date(a);
    while (d.getTime() !== t.getTime()) {
      d.setDate(d.getDate() + step);
      if (rest.indexOf(d.getDay()) < 0) idx += step;
    }
    return idx;
  }
  function renderReading() {
    if (!plan) return;
    var date = dayStart(new Date()); date.setDate(date.getDate() + rjOffset);
    document.getElementById('rjDate').textContent = (date.getMonth() + 1) + '월 ' + date.getDate() + '일 (' + WD[date.getDay()] + ')';
    document.getElementById('rjToday').hidden = rjOffset === 0;
    var idx = planIndex(date), n = plan.days.length;
    var link = document.getElementById('rjLink'), rest = document.getElementById('rjRest');
    var dayEl = document.getElementById('rjDay'), pas = document.getElementById('rjPassage');
    var showDay = function (i) {
      var d = plan.days[i];
      link.hidden = false; rest.hidden = true;
      link.href = 'https://www.youtube.com/watch?v=' + d[2];
      document.getElementById('rjThumb').src = 'https://i.ytimg.com/vi/' + d[2] + '/hqdefault.jpg';
      dayEl.textContent = d[0]; pas.textContent = d[1];
      document.getElementById('rjCountWrap').hidden = false;
      document.getElementById('rjCount').textContent = i + 1;
      document.getElementById('rjTotal').textContent = '/ ' + n + '일';
      document.getElementById('rjProgWrap').hidden = false;
      document.getElementById('rjBar').style.width = Math.round((i + 1) / n * 100) + '%';
      document.getElementById('rjProg').textContent = Math.round((i + 1) / n * 100) + '% 완료';
    };
    var message = function (msg, sub) {
      link.hidden = true; rest.hidden = false; rest.textContent = msg;
      dayEl.textContent = ''; pas.textContent = sub || '';
      document.getElementById('rjCountWrap').hidden = true;
      document.getElementById('rjProgWrap').hidden = true;
    };
    if (idx === null) {
      var nd = new Date(date); nd.setDate(nd.getDate() + 1);
      var ni = planIndex(nd);
      message('주일에는 통독을 쉬어요. 예배 가운데 은혜 받는 하루 되세요!', ni !== null && ni >= 0 && ni < n ? '내일 본문 · ' + plan.days[ni][1] : '');
    } else if (idx < 0) {
      message('이 날은 통독 일정이 없어요.');
    } else if (idx >= n) {
      message('45주 성경 통독을 모두 마쳤어요. 함께 완주하신 것을 축하드립니다! 다음 통독 시작은 교회 광고를 확인해 주세요.');
    } else {
      showDay(idx);
    }
  }
  document.getElementById('rjPrev').addEventListener('click', function () { rjOffset--; renderReading(); });
  document.getElementById('rjNext').addEventListener('click', function () { rjOffset++; renderReading(); });
  document.getElementById('rjToday').addEventListener('click', function () { rjOffset = 0; renderReading(); });
  document.getElementById('rjThumb').addEventListener('error', function () { this.parentNode.classList.add('noimg'); });
  document.getElementById('rjThumb').addEventListener('load', function () { this.parentNode.classList.remove('noimg'); });
  fetch('reading.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (p) { plan = p; renderReading(); });
  // 앱을 켜 둔 채 날짜가 바뀌어도 다시 열면 오늘 본문으로
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { rjOffset = 0; renderReading(); } });

  /* ---------- 설치 ---------- */
  var ua = navigator.userAgent;
  var isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var deferred = null;
  var sheet = document.getElementById('sheet');
  var chip = document.getElementById('installTop');
  var installNow = document.getElementById('installNow');

  function openSheet() {
    document.getElementById('installIos').hidden = !isIos && !!deferred;
    document.getElementById('installAndroid').hidden = isIos;
    installNow.hidden = !deferred;
    sheet.hidden = false;
  }
  function closeSheet() { sheet.hidden = true; }

  if (!standalone) chip.hidden = false;
  chip.addEventListener('click', openSheet);
  document.getElementById('openInstall').addEventListener('click', openSheet);
  document.getElementById('closeInstall').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
  });
  installNow.addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(function () { deferred = null; closeSheet(); });
  });
  window.addEventListener('appinstalled', function () { chip.hidden = true; closeSheet(); });

  /* 사이트 주소 뒤에 ?install 을 붙여 공유하면 설치 안내가 바로 열립니다 */
  if (!standalone && /[?&]install/.test(location.search)) setTimeout(openSheet, 600);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js'); });
  }
})();
