/* ============================================================
   Political Expenses Tracker — application logic
   Pure vanilla JS. No build step, no external runtime deps.
   ============================================================ */
(function () {
  'use strict';

  // ---- state -------------------------------------------------
  var CATS = window.EXPENSES_DATA.meta.categories; // [{key,label}]
  var CAT_COLOURS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#8a7bd8']; // validated categorical set
  var DEFAULT_PARTY_COLOUR = '#6b6a66';
  var state = {
    meta: window.EXPENSES_DATA.meta,
    mps: window.EXPENSES_DATA.mps.slice(),
    sortKey: 'total',
    sortDir: -1,
    search: '',
    partyFilter: '',
    activeView: 'overview',
  };

  // ---- helpers -----------------------------------------------
  function total(m) { return CATS.reduce(function (s, c) { return s + (+m[c.key] || 0); }, 0); }
  function gbp(n) {
    return '£' + Math.round(n).toLocaleString('en-GB');
  }
  function gbpShort(n) {
    var a = Math.abs(n);
    if (a >= 1e9) return '£' + (n / 1e9).toFixed(1) + 'bn';
    if (a >= 1e6) return '£' + (n / 1e6).toFixed(1) + 'm';
    if (a >= 1e3) return '£' + Math.round(n / 1e3) + 'k';
    return '£' + Math.round(n);
  }
  function partyColour(name) {
    var p = state.meta.parties[name];
    return (p && p.colour) || DEFAULT_PARTY_COLOUR;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function el(id) { return document.getElementById(id); }

  // ---- aggregation -------------------------------------------
  function nationalAvg() {
    if (!state.mps.length) return 0;
    return state.mps.reduce(function (s, m) { return s + total(m); }, 0) / state.mps.length;
  }
  function partyAggregates() {
    var by = {};
    state.mps.forEach(function (m) {
      var g = by[m.party] || (by[m.party] = { party: m.party, count: 0, total: 0, cats: {}, mps: [] });
      g.count++; g.total += total(m); g.mps.push(m);
      CATS.forEach(function (c) { g.cats[c.key] = (g.cats[c.key] || 0) + (+m[c.key] || 0); });
    });
    var list = Object.keys(by).map(function (k) {
      var g = by[k]; g.avg = g.total / g.count; return g;
    });
    list.sort(function (a, b) { return b.avg - a.avg; });
    return list;
  }

  // ---- tooltip -----------------------------------------------
  var tip = el('tip');
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.style.opacity = '1';
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = x + 14; if (left + w > window.innerWidth - 8) left = x - w - 14;
    var top = y + 14; if (top + h > window.innerHeight - 8) top = y - h - 14;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.style.opacity = '0'; }

  // ============================================================
  //  SVG chart builders
  // ============================================================
  function svgOpen(w, h) {
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMinYMin meet" role="img">';
  }

  // Horizontal bar chart. rows: [{label, value, colour, tip}]
  function hBarChart(rows, opts) {
    opts = opts || {};
    var labelW = opts.labelW || 150;
    var valW = 78;
    var barH = 26, gap = 12, padT = 8, padB = 8;
    var chartW = 1000;
    var plotX = labelW, plotW = chartW - labelW - valW - 8;
    var h = padT + padB + rows.length * (barH + gap) - gap;
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    // "nice" max
    var niceMax = niceCeil(max);
    var s = svgOpen(chartW, h);
    // gridlines
    var ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var gx = plotX + (plotW * t) / ticks;
      s += '<line class="grid-line" x1="' + gx + '" y1="' + padT + '" x2="' + gx + '" y2="' + (h - padB) + '"/>';
      s += '<text class="axis-text" x="' + gx + '" y="' + (h - padB + 12) + '" text-anchor="middle">' + gbpShort((niceMax * t) / ticks) + '</text>';
    }
    rows.forEach(function (r, i) {
      var y = padT + i * (barH + gap);
      var bw = Math.max(2, (r.value / niceMax) * plotW);
      var rad = Math.min(4, bw);
      s += '<text class="bar-label" x="' + (labelW - 10) + '" y="' + (y + barH / 2 + 4) + '" text-anchor="end">' + esc(r.label) + '</text>';
      s += '<rect class="bar" x="' + plotX + '" y="' + y + '" width="' + bw + '" height="' + barH +
           '" rx="' + rad + '" fill="' + r.colour + '" data-tip="' + esc(r.tip || '') + '"/>';
      s += '<text class="val-label" x="' + (plotX + bw + 8) + '" y="' + (y + barH / 2 + 4) + '">' + esc(r.valLabel || gbpShort(r.value)) + '</text>';
    });
    s += '</svg>';
    return s;
  }

  // Diverging horizontal bars around a centre baseline. rows:[{label,value,colour,tip}]
  function divergingChart(rows) {
    var labelW = 150, chartW = 1000;
    var barH = 24, gap = 12, padT = 20, padB = 8;
    var plotX = labelW, plotW = chartW - labelW - 10;
    var centre = plotX + plotW / 2;
    var h = padT + padB + rows.length * (barH + gap) - gap;
    var maxAbs = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value); }).concat([1]));
    var niceMax = niceCeil(maxAbs);
    var s = svgOpen(chartW, h);
    // zero line + scale ends
    s += '<line class="grid-line" x1="' + centre + '" y1="' + (padT - 6) + '" x2="' + centre + '" y2="' + (h - padB) + '" style="stroke:var(--border-strong)"/>';
    s += '<text class="axis-text" x="' + centre + '" y="' + (padT - 10) + '" text-anchor="middle">national average</text>';
    s += '<text class="axis-text" x="' + plotX + '" y="' + (padT - 10) + '" text-anchor="start">−' + gbpShort(niceMax) + '</text>';
    s += '<text class="axis-text" x="' + (chartW - 4) + '" y="' + (padT - 10) + '" text-anchor="end">+' + gbpShort(niceMax) + '</text>';
    rows.forEach(function (r, i) {
      var y = padT + i * (barH + gap);
      var frac = r.value / niceMax; // -1..1
      var bw = Math.abs(frac) * (plotW / 2);
      var x = frac >= 0 ? centre : centre - bw;
      s += '<text class="bar-label" x="' + (labelW - 10) + '" y="' + (y + barH / 2 + 4) + '" text-anchor="end">' + esc(r.label) + '</text>';
      s += '<rect class="bar" x="' + x + '" y="' + y + '" width="' + Math.max(2, bw) + '" height="' + barH +
           '" rx="3" fill="' + r.colour + '" data-tip="' + esc(r.tip || '') + '"/>';
      var lx = frac >= 0 ? x + bw + 8 : x - 8;
      var anchor = frac >= 0 ? 'start' : 'end';
      var sign = r.value >= 0 ? '+' : '−';
      s += '<text class="val-label" x="' + lx + '" y="' + (y + barH / 2 + 4) + '" text-anchor="' + anchor + '">' + sign + gbpShort(Math.abs(r.value)) + '</text>';
    });
    s += '</svg>';
    return s;
  }

  function niceCeil(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / mag;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * mag;
  }

  // wire tooltips for any chart container (event delegation)
  function wireChart(container) {
    container.addEventListener('mousemove', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-tip')) {
        showTip(t.getAttribute('data-tip'), e.clientX, e.clientY);
      } else hideTip();
    });
    container.addEventListener('mouseleave', hideTip);
  }

  // ============================================================
  //  OVERVIEW
  // ============================================================
  function renderOverview() {
    var parties = partyAggregates();
    var natAvg = nationalAvg();
    var grand = state.mps.reduce(function (s, m) { return s + total(m); }, 0);
    var top = parties[0];

    el('tiles').innerHTML = tile('Total spend', gbpShort(grand), state.mps.length + ' MPs · ' + parties.length + ' parties') +
      tile('Average per MP', gbp(natAvg), 'across all members') +
      tile('Highest-claiming party', top ? top.party : '—', top ? gbp(top.avg) + ' avg / MP' : '') +
      tile('Members tracked', String(state.mps.length), 'individual records');

    // avg per MP chart
    var avgRows = parties.map(function (p) {
      return {
        label: p.party, value: p.avg, colour: partyColour(p.party),
        tip: '<div class="t-title">' + esc(p.party) + '</div>' +
             '<div class="t-row"><span>Avg / MP</span><b>' + gbp(p.avg) + '</b></div>' +
             '<div class="t-row"><span>Members</span><b>' + p.count + '</b></div>' +
             '<div class="t-row"><span>Total</span><b>' + gbpShort(p.total) + '</b></div>',
      };
    });
    el('chartPartyAvg').innerHTML = hBarChart(avgRows);
    wireChart(el('chartPartyAvg'));
    el('legendPartyAvg').innerHTML = parties.map(function (p) {
      return '<span class="item"><span class="swatch" style="background:' + partyColour(p.party) + '"></span>' + esc(p.party) + '</span>';
    }).join('');

    // total chart
    var totalRows = parties.slice().sort(function (a, b) { return b.total - a.total; }).map(function (p) {
      return {
        label: p.party, value: p.total, colour: partyColour(p.party),
        tip: '<div class="t-title">' + esc(p.party) + '</div><div class="t-row"><span>Total</span><b>' + gbp(p.total) + '</b></div>',
      };
    });
    el('chartPartyTotal').innerHTML = hBarChart(totalRows);
    wireChart(el('chartPartyTotal'));

    // category chart
    var catTotals = CATS.map(function (c, i) {
      var v = state.mps.reduce(function (s, m) { return s + (+m[c.key] || 0); }, 0);
      return {
        label: c.label, value: v, colour: CAT_COLOURS[i % CAT_COLOURS.length],
        valLabel: gbpShort(v) + '  (' + Math.round((v / grand) * 100) + '%)',
        tip: '<div class="t-title">' + esc(c.label) + '</div><div class="t-row"><span>Total</span><b>' + gbp(v) + '</b></div>' +
             '<div class="t-row"><span>Share</span><b>' + ((v / grand) * 100).toFixed(1) + '%</b></div>',
      };
    }).sort(function (a, b) { return b.value - a.value; });
    el('chartCategory').innerHTML = hBarChart(catTotals);
    wireChart(el('chartCategory'));
    el('legendCategory').innerHTML = CATS.map(function (c, i) {
      return '<span class="item"><span class="swatch" style="background:' + CAT_COLOURS[i % CAT_COLOURS.length] + '"></span>' + esc(c.label) + '</span>';
    }).join('');
  }
  function tile(k, v, s) {
    return '<div class="tile"><div class="k">' + esc(k) + '</div><div class="v num">' + esc(v) + '</div><div class="s">' + esc(s || '') + '</div></div>';
  }

  // ============================================================
  //  BY PARTY
  // ============================================================
  function renderParties() {
    var parties = partyAggregates();
    var natAvg = nationalAvg();
    el('partyGrid').innerHTML = parties.map(function (p) {
      var delta = p.avg - natAvg;
      var cls = delta >= 0 ? 'up' : 'down';
      var sign = delta >= 0 ? '+' : '−';
      return '<div class="party-card" data-party="' + esc(p.party) + '">' +
        '<div class="top" style="background:' + partyColour(p.party) + '"></div>' +
        '<div class="body">' +
        '<h3><span class="dot" style="background:' + partyColour(p.party) + '"></span>' + esc(p.party) + '</h3>' +
        '<div class="avg num">' + gbp(p.avg) + '</div>' +
        '<div class="meta">avg / MP · <span class="delta ' + cls + '">' + sign + gbp(Math.abs(delta)) + '</span> vs national</div>' +
        '<div class="meta" style="margin-top:6px">' + p.count + ' members · ' + gbpShort(p.total) + ' total</div>' +
        '</div></div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.party-card'), function (c) {
      c.addEventListener('click', function () { renderPartyDetail(c.getAttribute('data-party')); });
    });
    el('partyDetail').innerHTML = '<div class="card"><div class="empty">Select a party above to see its category breakdown and members.</div></div>';
  }

  function renderPartyDetail(name) {
    var parties = partyAggregates();
    var p = parties.filter(function (x) { return x.party === name; })[0];
    if (!p) return;
    var natAvg = nationalAvg();
    var maxCat = Math.max.apply(null, CATS.map(function (c) { return p.cats[c.key]; }));
    var breakdown = CATS.map(function (c, i) {
      var v = p.cats[c.key];
      return '<li><span>' + esc(c.label) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + ((v / maxCat) * 100) + '%;background:' + CAT_COLOURS[i % CAT_COLOURS.length] + '"></span></span>' +
        '<span class="amt num">' + gbpShort(v) + '</span></li>';
    }).join('');

    var members = p.mps.slice().sort(function (a, b) { return total(b) - total(a); });
    var rows = members.map(function (m) {
      var d = total(m) - p.avg;
      var cls = d >= 0 ? 'up' : 'down';
      return '<tr data-id="' + m.id + '"><td>' + esc(m.name) + '</td><td>' + esc(m.constituency) + '</td>' +
        '<td class="num">' + gbp(total(m)) + '</td>' +
        '<td class="num delta ' + cls + '">' + (d >= 0 ? '+' : '−') + gbpShort(Math.abs(d)) + '</td></tr>';
    }).join('');

    var delta = p.avg - natAvg;
    el('partyDetail').innerHTML =
      '<div class="card">' +
      '<h2><span class="dot" style="background:' + partyColour(name) + ';display:inline-block;vertical-align:middle;margin-right:8px"></span>' + esc(name) + '</h2>' +
      '<div class="sub">' + p.count + ' members · ' + gbp(p.total) + ' total · ' + gbp(p.avg) + ' average per MP (' +
      (delta >= 0 ? 'spends ' + gbp(delta) + ' more' : 'spends ' + gbp(-delta) + ' less') + ' than the national average)</div>' +
      '<div class="detail">' +
      '<div><h3 style="font-size:13px;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Category breakdown</h3><ul class="breakdown">' + breakdown + '</ul></div>' +
      '<div><h3 style="font-size:13px;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Members (by total claimed)</h3>' +
      '<div class="table-scroll" style="max-height:340px;overflow-y:auto;box-shadow:none"><table class="data" style="min-width:0"><thead><tr><th>MP</th><th>Constituency</th><th class="num">Total</th><th class="num">vs party avg</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '</div></div>';
    el('partyDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    Array.prototype.forEach.call(el('partyDetail').querySelectorAll('tbody tr'), function (tr) {
      tr.addEventListener('click', function () { gotoMp(+tr.getAttribute('data-id')); });
    });
  }

  // ============================================================
  //  BY INDIVIDUAL
  // ============================================================
  function filteredMps() {
    var natAvg = nationalAvg();
    var partyAvg = {};
    partyAggregates().forEach(function (p) { partyAvg[p.party] = p.avg; });
    var q = state.search.trim().toLowerCase();
    var rows = state.mps.filter(function (m) {
      if (state.partyFilter && m.party !== state.partyFilter) return false;
      if (q && (m.name + ' ' + m.constituency).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).map(function (m) {
      var t = total(m);
      return { m: m, total: t, vsParty: t - partyAvg[m.party], vsNational: t - natAvg };
    });
    var k = state.sortKey, dir = state.sortDir;
    rows.sort(function (a, b) {
      var av, bv;
      if (k === 'name') { av = a.m.name; bv = b.m.name; }
      else if (k === 'party') { av = a.m.party; bv = b.m.party; }
      else if (k === 'constituency') { av = a.m.constituency; bv = b.m.constituency; }
      else { av = a[k]; bv = b[k]; }
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    return rows;
  }

  function renderIndividuals() {
    var rows = filteredMps();
    el('rowCount').textContent = rows.length + ' of ' + state.mps.length + ' members';
    el('mpTbody').innerHTML = rows.length ? rows.map(function (r) {
      var m = r.m;
      return '<tr data-id="' + m.id + '">' +
        '<td><b>' + esc(m.name) + '</b> <span class="tag">' + esc(m.role || '') + '</span></td>' +
        '<td><span class="pill"><span class="dot" style="background:' + partyColour(m.party) + '"></span>' + esc(m.party) + '</span></td>' +
        '<td>' + esc(m.constituency) + '</td>' +
        '<td class="num"><b>' + gbp(r.total) + '</b></td>' +
        '<td class="num delta ' + (r.vsParty >= 0 ? 'up' : 'down') + '">' + (r.vsParty >= 0 ? '+' : '−') + gbpShort(Math.abs(r.vsParty)) + '</td>' +
        '<td class="num delta ' + (r.vsNational >= 0 ? 'up' : 'down') + '">' + (r.vsNational >= 0 ? '+' : '−') + gbpShort(Math.abs(r.vsNational)) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty">No members match your filters.</div></td></tr>';
    Array.prototype.forEach.call(el('mpTbody').querySelectorAll('tr[data-id]'), function (tr) {
      tr.addEventListener('click', function () { renderMpDetail(+tr.getAttribute('data-id')); });
    });
    // sort header state
    Array.prototype.forEach.call(document.querySelectorAll('#mpTable thead th'), function (th) {
      var sk = th.getAttribute('data-sort');
      th.classList.toggle('sorted', sk === state.sortKey);
      th.classList.toggle('asc', sk === state.sortKey && state.sortDir === 1);
    });
  }

  function renderMpDetail(id) {
    var m = state.mps.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    var t = total(m);
    var parties = partyAggregates();
    var pAgg = parties.filter(function (p) { return p.party === m.party; })[0];
    var natAvg = nationalAvg();
    var maxCat = Math.max.apply(null, CATS.map(function (c) { return +m[c.key] || 0; }).concat([1]));
    var breakdown = CATS.map(function (c, i) {
      var v = +m[c.key] || 0;
      return '<li><span>' + esc(c.label) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + ((v / maxCat) * 100) + '%;background:' + CAT_COLOURS[i % CAT_COLOURS.length] + '"></span></span>' +
        '<span class="amt num">' + gbp(v) + '</span></li>';
    }).join('');

    var cmpRows = [
      { label: esc(m.name), value: t, colour: partyColour(m.party) },
      { label: m.party + ' avg', value: pAgg.avg, colour: partyColour(m.party) + 'aa' },
      { label: 'National avg', value: natAvg, colour: '#8a8880' },
    ].map(function (r) { r.tip = '<div class="t-title">' + r.label + '</div><div class="t-row"><span>Total</span><b>' + gbp(r.value) + '</b></div>'; return r; });

    var dP = t - pAgg.avg, dN = t - natAvg;
    el('mpDetail').innerHTML =
      '<div class="card">' +
      '<h2><span class="dot" style="background:' + partyColour(m.party) + ';display:inline-block;vertical-align:middle;margin-right:8px"></span>' + esc(m.name) + '</h2>' +
      '<div class="sub">' + esc(m.party) + ' · ' + esc(m.constituency) + ' · ' + esc(m.region || '') + ' · ' + esc(m.role || '') + '</div>' +
      '<div class="tiles" style="grid-template-columns:repeat(3,1fr);margin:6px 0 18px">' +
        tile('Total claimed', gbp(t), '') +
        tileDelta('vs ' + m.party + ' avg', dP) +
        tileDelta('vs national avg', dN) +
      '</div>' +
      '<div class="detail">' +
      '<div><h3 style="font-size:13px;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Category breakdown</h3><ul class="breakdown">' + breakdown + '</ul></div>' +
      '<div><h3 style="font-size:13px;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">This MP vs averages</h3><div class="chartHere"></div></div>' +
      '</div></div>';
    var holder = el('mpDetail').querySelector('.chartHere');
    holder.innerHTML = hBarChart(cmpRows, { labelW: 170 });
    wireChart(holder);
    el('mpDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function tileDelta(k, d) {
    var cls = d >= 0 ? 'up' : 'down';
    var sign = d >= 0 ? '+' : '−';
    var word = d >= 0 ? 'above' : 'below';
    return '<div class="tile"><div class="k">' + esc(k) + '</div><div class="v num delta ' + cls + '">' + sign + gbp(Math.abs(d)) +
      '</div><div class="s">' + word + ' average</div></div>';
  }

  function gotoMp(id) {
    switchView('individuals');
    renderIndividuals();
    renderMpDetail(id);
  }

  // ============================================================
  //  COMPARE
  // ============================================================
  function renderCompareControls() {
    var parties = partyAggregates();
    var opts = parties.map(function (p) { return '<option value="' + esc(p.party) + '">' + esc(p.party) + '</option>'; }).join('');
    el('cmpA').innerHTML = opts;
    el('cmpB').innerHTML = opts;
    if (parties.length > 1) el('cmpB').selectedIndex = 1;
    el('cmpA').onchange = el('cmpB').onchange = renderCompareResult;
  }
  function renderCompare() {
    renderCompareControls();
    renderCompareResult();
    // deviation chart
    var parties = partyAggregates();
    var natAvg = nationalAvg();
    var rows = parties.map(function (p) {
      return {
        label: p.party, value: p.avg - natAvg, colour: partyColour(p.party),
        tip: '<div class="t-title">' + esc(p.party) + '</div><div class="t-row"><span>Avg / MP</span><b>' + gbp(p.avg) + '</b></div>' +
             '<div class="t-row"><span>vs national</span><b>' + (p.avg - natAvg >= 0 ? '+' : '−') + gbp(Math.abs(p.avg - natAvg)) + '</b></div>',
      };
    });
    el('chartDeviation').innerHTML = divergingChart(rows);
    wireChart(el('chartDeviation'));
  }
  function renderCompareResult() {
    var parties = partyAggregates();
    var byName = {}; parties.forEach(function (p) { byName[p.party] = p; });
    var a = byName[el('cmpA').value], b = byName[el('cmpB').value];
    if (!a || !b) { el('cmpResult').innerHTML = ''; return; }
    var natAvg = nationalAvg();
    var rows = [
      { label: a.party, value: a.avg, colour: partyColour(a.party) },
      { label: b.party, value: b.avg, colour: partyColour(b.party) },
      { label: 'National avg', value: natAvg, colour: '#8a8880' },
    ].map(function (r) { r.tip = '<div class="t-title">' + esc(r.label) + '</div><div class="t-row"><span>Avg / MP</span><b>' + gbp(r.value) + '</b></div>'; return r; });

    var diff = a.avg - b.avg;
    var pct = b.avg ? (diff / b.avg) * 100 : 0;
    var verdict = diff === 0 ? 'claim the same on average' :
      esc(a.party) + ' claims <b class="delta ' + (diff > 0 ? 'up' : 'down') + '">' + gbp(Math.abs(diff)) + '</b> ' +
      (diff > 0 ? 'more' : 'less') + ' per MP than ' + esc(b.party) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)';

    // category side-by-side: two stacked bars per category, shared scale
    var catMax = Math.max.apply(null, CATS.map(function (c) {
      return Math.max(a.cats[c.key] / a.count, b.cats[c.key] / b.count);
    }).concat([1]));
    var catCmp = CATS.map(function (c) {
      var av = a.cats[c.key] / a.count, bv = b.cats[c.key] / b.count;
      function bar(val, colour, name) {
        return '<div class="cbar-row">' +
          '<span class="cbar-track"><span class="fill" style="width:' + ((val / catMax) * 100) + '%;background:' + colour + '"></span></span>' +
          '<span class="cbar-val num">' + gbpShort(val) + '</span></div>';
      }
      return '<div class="cbar-group"><div class="cbar-label">' + esc(c.label) + '</div>' +
        bar(av, partyColour(a.party), a.party) +
        bar(bv, partyColour(b.party), b.party) +
        '</div>';
    }).join('');

    el('cmpResult').innerHTML =
      '<p style="font-size:15px;margin:6px 0 16px">' + verdict + '</p>' +
      '<div class="chartHere2"></div>' +
      '<h3 style="font-size:13px;color:var(--text-muted);margin:18px 0 12px;text-transform:uppercase;letter-spacing:.04em">Average per MP by category &nbsp;<span class="pill"><span class="dot" style="background:' + partyColour(a.party) + '"></span>' + esc(a.party) + '</span> &nbsp;vs&nbsp; <span class="pill"><span class="dot" style="background:' + partyColour(b.party) + '"></span>' + esc(b.party) + '</span></h3>' +
      '<div class="cbar">' + catCmp + '</div>';
    var holder = el('cmpResult').querySelector('.chartHere2');
    holder.innerHTML = hBarChart(rows, { labelW: 150 });
    wireChart(holder);
  }

  // ============================================================
  //  CSV import / export
  // ============================================================
  // Robust-enough CSV line parser (handles quotes + embedded commas).
  function parseCSV(text) {
    var rows = [], row = [], cur = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { row.push(cur); cur = ''; }
        else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (ch === '\r') { /* skip */ }
        else cur += ch;
      }
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1 || (r.length === 1 && r[0].trim() !== ''); });
  }

  function findCol(headers, candidates) {
    var lower = headers.map(function (h) { return h.toLowerCase().trim(); });
    for (var i = 0; i < candidates.length; i++) {
      var idx = lower.indexOf(candidates[i]);
      if (idx >= 0) return idx;
      // partial contains
      for (var j = 0; j < lower.length; j++) if (lower[j].indexOf(candidates[i]) >= 0) return j;
    }
    return -1;
  }
  function num(v) { return +String(v == null ? '' : v).replace(/[£,\s]/g, '') || 0; }

  function importCSV(text, filename) {
    var rows = parseCSV(text);
    if (rows.length < 2) { alert('Could not read any rows from that CSV.'); return; }
    var headers = rows[0];
    var col = {
      name: findCol(headers, ['mp name', 'name', 'member', 'mp']),
      party: findCol(headers, ['party']),
      constituency: findCol(headers, ['constituency', 'seat']),
      region: findCol(headers, ['region', 'area']),
      staffing: findCol(headers, ['staffing', 'staff']),
      office: findCol(headers, ['office costs', 'office', 'accommodation office']),
      accommodation: findCol(headers, ['accommodation', 'housing']),
      travel: findCol(headers, ['travel', 'travel & subsistence', 'travel and subsistence']),
      other: findCol(headers, ['other', 'winding', 'startup', 'start-up']),
      total: findCol(headers, ['total', 'grand total', 'amount', 'total claimed']),
    };
    if (col.name < 0 || col.party < 0) {
      alert('CSV needs at least an MP name column and a party column.\nDetected headers:\n' + headers.join(', '));
      return;
    }
    var hasCats = col.staffing >= 0 || col.office >= 0 || col.accommodation >= 0 || col.travel >= 0;
    var mps = [], id = 0, seen = {};
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row[col.name] || !String(row[col.name]).trim()) continue;
      var key = row[col.name] + '|' + (row[col.party] || '');
      var m = seen[key];
      if (!m) {
        m = seen[key] = {
          id: id++, name: String(row[col.name]).trim(),
          party: String(row[col.party] || 'Unknown').trim(),
          constituency: col.constituency >= 0 ? String(row[col.constituency] || '').trim() : '',
          region: col.region >= 0 ? String(row[col.region] || '').trim() : '',
          role: '', staffing: 0, office: 0, accommodation: 0, travel: 0, other: 0,
        };
        mps.push(m);
      }
      if (hasCats) {
        if (col.staffing >= 0) m.staffing += num(row[col.staffing]);
        if (col.office >= 0) m.office += num(row[col.office]);
        if (col.accommodation >= 0) m.accommodation += num(row[col.accommodation]);
        if (col.travel >= 0) m.travel += num(row[col.travel]);
        if (col.other >= 0) m.other += num(row[col.other]);
      } else if (col.total >= 0) {
        m.other += num(row[col.total]); // dump into "other" so totals still work
      }
    }
    if (!mps.length) { alert('No usable rows found in the CSV.'); return; }
    // assign colours to any unknown parties
    assignPartyColours(mps);
    state.mps = mps;
    state.meta.source = 'Imported from ' + esc(filename) + ' · ' + mps.length + ' members';
    state.meta.period = 'imported data';
    refreshAll();
    var distinctParties = {};
    mps.forEach(function (m) { distinctParties[m.party] = 1; });
    alert('Imported ' + mps.length + ' members across ' + Object.keys(distinctParties).length + ' parties.');
  }

  var FALLBACK_COLOURS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#8a7bd8', '#e34948', '#e87ba4', '#eb6834', '#6b6a66'];
  function assignPartyColours(mps) {
    var known = state.meta.parties;
    var next = 0;
    mps.forEach(function (m) {
      if (!known[m.party]) {
        known[m.party] = { colour: FALLBACK_COLOURS[next % FALLBACK_COLOURS.length], short: m.party.slice(0, 3) };
        next++;
      }
    });
  }

  function exportCSV() {
    var rows = filteredMps();
    var head = ['MP Name', 'Party', 'Constituency', 'Region'].concat(CATS.map(function (c) { return c.label; })).concat(['Total']);
    var lines = [head.join(',')];
    rows.forEach(function (r) {
      var m = r.m;
      var cells = [m.name, m.party, m.constituency, m.region || ''].concat(CATS.map(function (c) { return +m[c.key] || 0; })).concat([r.total]);
      lines.push(cells.map(function (v) {
        var s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'political-expenses.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  //  navigation + boot
  // ============================================================
  function switchView(view) {
    state.activeView = view;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.setAttribute('aria-selected', t.getAttribute('data-view') === view ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (v) {
      v.classList.toggle('active', v.id === 'view-' + view);
    });
    if (view === 'overview') renderOverview();
    else if (view === 'parties') renderParties();
    else if (view === 'individuals') renderIndividuals();
    else if (view === 'compare') renderCompare();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function refreshAll() {
    // rebuild party filter options
    var parties = partyAggregates();
    el('partyFilter').innerHTML = '<option value="">All parties</option>' +
      parties.map(function (p) { return '<option value="' + esc(p.party) + '">' + esc(p.party) + '</option>'; }).join('');
    el('dataBanner').innerHTML = '<span>ℹ️</span><div><b>Data:</b> ' + esc(state.meta.period) + '. ' + esc(state.meta.source) +
      ' &nbsp;Use <b>Import CSV</b> (top right) to load an official IPSA export — the app auto-detects name, party, constituency and category columns.</div>';
    el('periodLabel').textContent = state.meta.period;
    switchView(state.activeView);
  }

  function boot() {
    // theme
    var saved = null;
    try { saved = localStorage.getItem('petheme'); } catch (e) {}
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    el('themeBtn').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var isDark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      var next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('petheme', next); } catch (e) {}
      switchView(state.activeView); // recolour charts against new tokens if needed
    });

    // tabs
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.addEventListener('click', function () { switchView(t.getAttribute('data-view')); });
    });

    // controls
    el('search').addEventListener('input', function () { state.search = this.value; renderIndividuals(); });
    el('partyFilter').addEventListener('change', function () { state.partyFilter = this.value; renderIndividuals(); });
    el('sortBy').addEventListener('change', function () {
      var v = this.value;
      var map = { total: ['total', -1], totalAsc: ['total', 1], name: ['name', 1], party: ['party', 1], vsParty: ['vsParty', -1] };
      state.sortKey = map[v][0]; state.sortDir = map[v][1]; renderIndividuals();
    });
    Array.prototype.forEach.call(document.querySelectorAll('#mpTable thead th'), function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        if (state.sortKey === k) state.sortDir *= -1;
        else { state.sortKey = k; state.sortDir = (k === 'name' || k === 'party' || k === 'constituency') ? 1 : -1; }
        renderIndividuals();
      });
    });

    // import/export
    el('importBtn').addEventListener('click', function () { el('csvInput').click(); });
    el('csvInput').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { importCSV(String(reader.result), f.name); };
      reader.readAsText(f);
      e.target.value = '';
    });
    // drag & drop onto the page
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /\.csv$/i.test(f.name)) {
        var reader = new FileReader();
        reader.onload = function () { importCSV(String(reader.result), f.name); };
        reader.readAsText(f);
      }
    });
    el('exportBtn').addEventListener('click', exportCSV);

    // footer
    el('footer').innerHTML = 'Built as a self-contained analysis tool for MPs’ business costs &amp; expenses. ' +
      'Ships with an <b>illustrative synthetic dataset</b> — import the official <a href="https://www.theipsa.org.uk/mp-staffing-business-costs" target="_blank" rel="noopener">IPSA</a> CSV for real figures. ' +
      'Averages are total claims ÷ member count; “vs average” compares an entity to its party and to all members.';

    refreshAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
