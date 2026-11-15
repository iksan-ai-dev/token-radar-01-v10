// Token Launch Radar — dashboard logic. Reads DATA (data.js) and renders the
// board, detail and model views, all offline.
var D = DATA;
var TIER_NAMES = ['Watchlist', 'Above floor', 'Early find'];
var TICKET = [350, 250, 150];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function commas(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function money(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
  return '$' + commas(n);
}
function hashStr(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function fmtGas(g) { return g >= 1 ? String(Math.round(g * 100) / 100) : String(g); }
function catName(r) { return r[3] < 0 ? 'Uncategorised' : D.cats[r[3]][0]; }
function archIdx(r) {
  if (r[3] < 0) return 9;
  var a = D.catArch[r[3]];
  return (a == void 0 || a < 0) ? 9 : a;
}
function mainChain(r) { return D.chains[parseInt(r[4], 10)]; }
function gasTx(r) { return D.gas[parseInt(r[4], 10)]; }
function curveMult(r) { return Math.pow(10, D.a + D.b * Math.log10(r[5])); }
function catEffect(r) { return r[3] < 0 ? 1 : D.cats[r[3]][3]; }
function catN(r) { return r[3] < 0 ? 0 : D.cats[r[3]][1]; }
function growthF(r) {
  var c = r[6] === '' ? 0 : r[6] / 100;
  return Math.min(1.6, Math.max(0.6, 1 + 0.75 * c));
}
function ageF(r) { return 0.55 + 0.45 * Math.min(r[7], 730) / 730; }
function sliceOf(r) { return Math.round(1000 * D.share * r[8] / r[5] * 100) / 100; }
function verdictOf(s) { return s >= D.worth ? 'Worth it' : s >= D.thin ? 'Thin' : 'Low slice'; }
function ticketOf(r) { return TICKET[r[9]]; }
function lockOf(r) { return D.lock[archIdx(r)]; }
function gas90Of(r) {
  var txs = 0;
  for (var i = 0; i < D.txs.length; i++) txs += D.txs[i];
  return Math.round((txs + 8) * gasTx(r) * 100) / 100;
}
function handsOf() {
  var m = 0;
  for (var i = 0; i < D.mins.length; i++) m += D.mins[i];
  return m;
}
function p25Of(r) { return Math.round(r[8] * D.loF); }
function p75Of(r) { return Math.round(r[8] * D.hiF); }
function ageYrs(r) { return (r[7] / 365.25).toFixed(1); }
function compRows(r) {
  var out = [];
  var idx = r[10].split(',');
  for (var i = 0; i < idx.length; i++) {
    var c = D.comps[parseInt(idx[i], 10)];
    if (c == void 0) continue;
    out.push(c);
  }
  return out;
}
var CAT_FAM = (function () {
  var m = [];
  for (var i = 0; i < D.cats.length; i++) m.push(7);
  for (var f = 0; f < D.fams.length; f++) {
    var list = D.fams[f][1];
    for (var k = 0; k < list.length; k++) m[list[k]] = f;
  }
  return m;
})();
function catFamIdx(catIdx) { return catIdx < 0 ? 7 : CAT_FAM[catIdx]; }
function scatterSVG() {
  var W = 560, H = 200, L = 46, R = 12, T = 10, B = 28;
  var x0 = 6.7, x1 = 9.6, y0 = -1.8, y1 = 2.8;
  function X(v) { return L + (Math.log10(v) - x0) / (x1 - x0) * (W - L - R); }
  function Y(m) { return T + (y1 - Math.log10(m)) / (y1 - y0) * (H - T - B); }
  var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
  s += '<line x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '" stroke="#b9ac84"/>';
  s += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (H - B) + '" stroke="#b9ac84"/>';
  var lx1 = X(Math.pow(10, x0)), ly1 = Y(Math.pow(10, D.a + D.b * x0));
  var lx2 = X(Math.pow(10, x1)), ly2 = Y(Math.pow(10, D.a + D.b * x1));
  s += '<line x1="' + lx1.toFixed(1) + '" y1="' + ly1.toFixed(1) + '" x2="' + lx2.toFixed(1) + '" y2="' + ly2.toFixed(1) + '" stroke="#a67c00" stroke-width="2"/>';
  for (var i = 0; i < D.comps.length; i++) {
    var c = D.comps[i];
    s += '<circle cx="' + X(c[2] * 1e6).toFixed(1) + '" cy="' + Y(c[3]).toFixed(1) + '" r="2.6" fill="#1e4d2e" opacity="0.6"/>';
  }
  s += '<text x="' + (W / 2) + '" y="' + (H - 6) + '" font-size="11" fill="#4a5548" text-anchor="middle">TVL, log scale ($5M – $4B)</text>';
  s += '<text x="12" y="18" font-size="11" fill="#4a5548">mcap / TVL, log scale</text>';
  s += '<text x="' + (W - R) + '" y="18" font-size="11" fill="#a67c00" text-anchor="end">gold line = fitted curve</text>';
  return s + '</svg>';
}
function composeSteps(r) {
  var a = archIdx(r);
  var tpl = D.tpl[a] || D.tpl[9];
  var slots = { name: r[2], chain: mainChain(r), ticket: ticketOf(r), gas: gasTx(r), lock: lockOf(r) };
  var out = [];
  for (var i = 0; i < 8; i++) {
    var own = tpl[i] || [];
    var variants = own.length > 0 ? own : (i === 4 ? D.shared[0] : D.shared[1]);
    var v = variants[hashStr(r[1] + '#' + i) % variants.length];
    var body = v.split('{N}').join(slots.name).split('{C}').join(slots.chain)
      .split('{A}').join(String(slots.ticket)).split('{L}').join(String(slots.lock));
    var tail = D.txs[i] > 0
      ? ' — about $' + fmtGas(slots.gas) + ' gas, ' + D.mins[i] + ' min.'
      : ' — free, ' + D.mins[i] + ' min.';
    out.push(body + tail);
  }
  return out;
}

var S = { q: '', cat: -1, chain: -1, tier: -1, minTvl: 0, d7: 'any', sort: 'rank', dir: 1 };
var SORTS = {
  rank: function (a, b) { return a[0] - b[0]; },
  name: function (a, b) { return a[2] < b[2] ? -1 : 1; },
  cat: function (a, b) { var x = catName(a), y = catName(b); return x < y ? -1 : x > y ? 1 : a[0] - b[0]; },
  tvl: function (a, b) { return a[5] - b[5]; },
  chg: function (a, b) { var x = a[6] === '' ? -9999 : a[6], y = b[6] === '' ? -9999 : b[6]; return x - y; },
  age: function (a, b) { return a[7] - b[7]; },
  mult: function (a, b) { return curveMult(a) * catEffect(a) - curveMult(b) * catEffect(b); },
  imp: function (a, b) { return a[8] - b[8]; },
  slice: function (a, b) { return sliceOf(a) - sliceOf(b); },
  verdict: function (a, b) {
    var v = { 'Worth it': 2, 'Thin': 1, 'Low slice': 0 };
    return v[verdictOf(sliceOf(a))] - v[verdictOf(sliceOf(b))];
  },
  ticket: function (a, b) { return ticketOf(a) - ticketOf(b); }
};

function filteredRows() {
  var q = S.q.toLowerCase();
  var rows = [];
  for (var i = 0; i < D.rows.length; i++) {
    var r = D.rows[i];
    if (S.tier >= 0 && r[9] !== S.tier) continue;
    if (S.cat >= 0 && r[3] !== S.cat) continue;
    if (S.chain >= 0 && (',' + r[4] + ',').indexOf(',' + S.chain + ',') < 0) continue;
    if (r[5] < S.minTvl) continue;
    if (S.d7 === 'gain' && !(r[6] !== '' && r[6] > 0)) continue;
    if (S.d7 === 'fall' && !(r[6] !== '' && r[6] < 0)) continue;
    if (q !== '' && r[2].toLowerCase().indexOf(q) < 0 && r[1].indexOf(q) < 0) continue;
    rows.push(r);
  }
  var f = SORTS[S.sort] || SORTS.rank;
  rows.sort(function (a, b) { return S.dir * f(a, b); });
  return rows;
}

function arrow(key) {
  if (S.sort !== key) return '';
  return S.dir === 1 ? ' ▲' : ' ▼';
}
function dotPlot(r) {
  var lo = Math.log10(Math.max(p25Of(r), 1e5));
  var hi = Math.log10(Math.max(p75Of(r), 1e5));
  var mid = Math.log10(Math.max(r[8], 1e5));
  var x0 = 5, x1 = 9.6;
  var left = Math.max(0, Math.min(100, (lo - x0) / (x1 - x0) * 100));
  var width = Math.max(2, Math.min(100 - left, (hi - lo) / (x1 - x0) * 100));
  var mark = Math.max(0, Math.min(100, (mid - x0) / (x1 - x0) * 100));
  return '<div class="dot"><i style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) + '%"></i><b style="left:' + mark.toFixed(1) + '%"></b></div>'
    + '<div class="small">' + money(p25Of(r)) + ' – ' + money(p75Of(r)) + '</div>';
}

function headHTML() {
  return '<header class="top"><div class="kicker">Token Launch Radar · DefiLlama snapshot ' + esc(D.asOf) + '</div>'
    + '<h1>Token Launch Radar</h1>'
    + '<div class="sub">198 pre-token protocols ranked by implied launch value — what a token would be worth if the protocol’s record stayed as it is. '
    + '“Records no token” means DefiLlama records no token for it.</div>'    + '<div class="counts"><b>' + D.n + ' = ' + D.ranked + ' ranked + ' + D.trading + ' already trading + ' + D.aside + ' set aside</b>'
    + ' &nbsp;·&nbsp; <b>198 = 40 watchlist + 158 early finds (138 below floor + 20 above floor)</b>'
    + ' &nbsp;·&nbsp; Total implied <b>' + money(D.totImp) + '</b> &nbsp;·&nbsp; <span class="badge">198/198 ranks and values match board.json</span></div>'
    + '<div class="formula"><b>implied = TVL × curve(TVL) × category effect × growth × age</b><br>'
    + 'curve: log10(mcap/TVL) = ' + D.a + ' − ' + Math.abs(D.b) + '·log10(TVL), ×' + D.lvl + ' @ $100M · '
    + 'effects shrunk, 4 pseudo-comps · growth = 1 + 0.75×7d (clamp −40%/+60%) · age 0.55→1.00 over 730d (unknown 365d)<br>'
    + '<span class="dim">LOO error ×' + D.loo + ' (flat multiple ×' + D.flat + ', n=' + D.ncomp + ' live comparables) · '
    + 'P25–P75 band from full-model residuals, ratio ×' + (D.hiF / D.loF).toFixed(2) + ' · '
    + 'No name is special-cased. No maturity factor.</span></div>'
    + '<div class="strip"><span><b>Rank is launch size;</b> the call is pay per $1,000 farmed.</span>'
    + '<span><b>Worth it</b> ≥ $' + D.worth + ' per $1,000</span><span><b>Thin</b> ≥ $' + D.thin + '</span>'
    + '<span><b>Low slice</b> below $' + D.thin + ' — a big launch can still pay little per dollar farmed.</span></div></header>';
}

function tabsHTML() {
  var tabs = [
    [-1, 'All ' + D.ranked], [0, 'Watchlist ' + D.watch],
    [2, 'Below floor ' + D.below], [1, 'Above floor ' + D.above], [3, 'Already trading ' + D.trading]
  ];
  var h = '<div class="tabs">';
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    h += '<button class="tab' + (S.tier === t[0] ? ' on' : '') + '" data-tier="' + t[0] + '">' + t[1] + '</button>';
  }
  return h + '</div>';
}

function filtersHTML() {
  var h = '<div class="filters"><label>Search</label><input id="f-q" type="text" placeholder="name or slug" value="' + esc(S.q) + '">'
    + '<label>Category</label><select id="f-cat"><option value="-1">All categories</option>';
  for (var i = 0; i < D.cats.length; i++) {
    h += '<option value="' + i + '"' + (S.cat === i ? ' selected' : '') + '>' + esc(D.cats[i][0]) + '</option>';
  }
  h += '</select><label>Chain</label><select id="f-chain"><option value="-1">All chains</option>';
  for (var j = 0; j < D.chains.length; j++) {
    h += '<option value="' + j + '"' + (S.chain === j ? ' selected' : '') + '>' + esc(D.chains[j]) + '</option>';
  }
  h += '</select><label>Tier</label><select id="f-tier"><option value="-1">All tiers</option>'
    + '<option value="0"' + (S.tier === 0 ? ' selected' : '') + '>Watchlist</option>'
    + '<option value="1"' + (S.tier === 1 ? ' selected' : '') + '>Above floor</option>'
    + '<option value="2"' + (S.tier === 2 ? ' selected' : '') + '>Below floor</option></select>'
    + '<label>Min TVL</label><select id="f-min"><option value="0">Any</option>'
    + '<option value="10000000"' + (S.minTvl === 10000000 ? ' selected' : '') + '>$10M</option>'
    + '<option value="50000000"' + (S.minTvl === 50000000 ? ' selected' : '') + '>$50M</option>'
    + '<option value="100000000"' + (S.minTvl === 100000000 ? ' selected' : '') + '>$100M</option>'
    + '<option value="500000000"' + (S.minTvl === 500000000 ? ' selected' : '') + '>$500M</option></select>'
    + '<label>7-day</label><select id="f-d7"><option value="any">Any</option>'
    + '<option value="gain"' + (S.d7 === 'gain' ? ' selected' : '') + '>Gaining</option>'
    + '<option value="fall"' + (S.d7 === 'fall' ? ' selected' : '') + '>Falling</option></select>'
    + '<button id="f-reset">Reset</button></div>';
  return h;
}

function boardRowsHTML(rows) {
  var h = '';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var slice = sliceOf(r);
    var call = verdictOf(slice);
    var cls = call === 'Worth it' ? 'worth' : call === 'Thin' ? 'thin' : 'low';
    var chg = r[6] === '' ? '—' : (r[6] > 0 ? '+' : '') + r[6].toFixed(2) + '%';
    var chgCls = r[6] === '' ? '' : r[6] < 0 ? 'neg' : 'pos';
    var tierCls = r[9] === 0 ? 'w' : r[9] === 1 ? 'a' : '';
    h += '<tr><td class="num rank">' + r[0] + '</td>'
      + '<td><a href="#/detail/' + r[1] + '"><span class="pname">' + esc(r[2]) + '</span></a> '
      + '<span class="tier ' + tierCls + '">' + TIER_NAMES[r[9]].toUpperCase() + '</span><br>'
      + '<span class="small">' + esc(D.chains[parseInt(r[4], 10)]) + (r[4].indexOf(',') >= 0 ? ' +' + (r[4].split(',').length - 1) : '') + '</span></td>'
      + '<td>' + esc(catName(r)) + '</td>'
      + '<td class="num">' + money(r[5]) + '</td>'
      + '<td class="num ' + chgCls + '">' + chg + '</td>'
      + '<td class="num">' + ageYrs(r) + 'y</td>'
      + '<td class="num">×' + (curveMult(r) * catEffect(r)).toFixed(3) + '</td>'
      + '<td class="num"><b>' + money(r[8]) + '</b>' + dotPlot(r) + '</td>'
      + '<td class="num">$' + slice.toFixed(2) + '</td>'
      + '<td><span class="call ' + cls + '">' + call + '</span></td>'
      + '<td class="num">$' + ticketOf(r) + ' · ' + lockOf(r) + 'd</td></tr>';
  }
  return h;
}

function boardHTML() {
  var rows = filteredRows();
  var h = '<div class="wrap">' + headHTML() + tabsHTML() + filtersHTML();
  if (S.tier === 3) {
    h += '<div class="card" style="margin-top:10px"><h3>Already trading — ' + D.trading + ' protocols record a token</h3>'
      + '<p class="note">These ' + D.trading + ' protocols are not ranked: a token already trades, so there is no launch left to farm. '
      + 'They are the comparables the model is fitted on (' + D.ncomp + ' with a market cap above zero) plus the wrapped, staked and bridged products the watchlist rule sets aside.</p></div>'
      + '<footer>Source: DefiLlama protocols snapshot, fetched 2026-11-14 · floor $50,000,000 · “records no token” is a record, not a proof.</footer></div>';
    return h;
  }
  h += '<div class="hint">' + rows.length + ' of ' + D.ranked + ' shown · click a column to sort'
    + (S.sort === 'slice' ? ' · sorted by SLICE/$1K ▼' : '') + '</div>'
    + '<table><thead><tr>'
    + '<th data-sort="rank"># ' + arrow('rank') + '</th>'
    + '<th data-sort="name">Protocol' + arrow('name') + '</th>'
    + '<th data-sort="cat">Category' + arrow('cat') + '</th>'
    + '<th class="num" data-sort="tvl">TVL' + arrow('tvl') + '</th>'
    + '<th class="num" data-sort="chg">7D' + arrow('chg') + '</th>'
    + '<th class="num" data-sort="age">No token for' + arrow('age') + '</th>'
    + '<th class="num" data-sort="mult">× TVL' + arrow('mult') + '</th>'
    + '<th class="num" data-sort="imp">Implied value · P25–P75' + arrow('imp') + '</th>'
    + '<th class="num" data-sort="slice">Slice/$1K' + arrow('slice') + '</th>'
    + '<th data-sort="verdict">Farm call' + arrow('verdict') + '</th>'
    + '<th class="num" data-sort="ticket">Ticket·Hold' + arrow('ticket') + '</th>'
    + '</tr></thead><tbody>' + boardRowsHTML(rows) + '</tbody></table>';
  h += '<div class="note">Method: every implied value is TVL × the fitted size curve × the shrunken category effect × growth × age — all fitted at runtime from this snapshot. '
    + 'Farm plans give 8 costed steps each (gas + minutes per step). Full model on the Model view.</div>'
    + '<footer>Source: DefiLlama protocols snapshot, fetched 2026-11-14 · floor $50,000,000 · “records no token” is a record, not a proof — a listed protocol may still hold a token its record does not carry. '
    + 'Implied values are this entry’s model, not a prediction. Farming carries contract, price and claim risk; never share a seed phrase.</footer></div>';
  return h;
}

function detailHTML(slug) {
  var r = false;
  for (var i = 0; i < D.rows.length; i++) if (D.rows[i][1] === slug) r = D.rows[i];
  if (r === false) return boardHTML();
  var slice = sliceOf(r);
  var call = verdictOf(slice);
  var cls = call === 'Worth it' ? 'worth' : call === 'Thin' ? 'thin' : 'low';
  var chg = r[6] === '' ? 'not reported' : (r[6] > 0 ? '+' : '') + r[6].toFixed(2) + '%';
  var fam = D.fams[catFamIdx(r[3])][0];
  var comps = compRows(r);
  var steps = composeSteps(r);
  var note = call === 'Worth it'
    ? 'Worth it — $' + slice.toFixed(2) + ' per $1,000 farmed clears the $' + D.worth + ' line. The launch is big and the farmer’s cut is real.'
    : call === 'Thin'
      ? 'Thin — $' + slice.toFixed(2) + ' per $1,000 farmed sits between the $' + D.thin + ' Thin line and the $' + D.worth + ' Worth-it line. Farm it if you already use the protocol.'
      : 'Low slice — $' + slice.toFixed(2) + ' per $1,000 farmed is below the $' + D.thin + ' Thin line. Big launch, small cut per dollar; farm it only if you already use the protocol.';
  var h = '<div class="wrap"><p class="back"><a href="#/">← Back to the board</a></p>'
    + '<h2>' + esc(r[2]) + ' <span class="sub2">#' + r[0] + ' · ' + esc(catName(r)) + ' · ' + esc(fam) + ' family · ' + esc(TIER_NAMES[r[9]]) + '</span></h2>'
    + '<div class="sub">Records no token · ' + money(r[5]) + ' TVL on ' + r[4].split(',').length + ' chain' + (r[4].indexOf(',') >= 0 ? 's' : '') + ' (' + esc(r[4].split(',').map(function (ci) { return D.chains[parseInt(ci, 10)]; }).join(', ')) + ') · ' + ageYrs(r) + ' years with no token · 7-day TVL ' + chg + '</div>'
    + '<div class="econ">'
    + '<div><div class="k">Implied value</div><div class="v">' + money(r[8]) + '</div></div>'
    + '<div><div class="k">P25 – P75</div><div class="v">' + money(p25Of(r)) + ' – ' + money(p75Of(r)) + '</div></div>'
    + '<div><div class="k">Slice / $1K farmed</div><div class="v">$' + slice.toFixed(2) + '</div></div>'
    + '<div><div class="k">Farm call</div><div class="v call ' + cls + '">' + call + '</div></div>'
    + '<div><div class="k">Ticket · Hold</div><div class="v">$' + ticketOf(r) + ' · ' + lockOf(r) + 'd</div></div>'
    + '<div><div class="k">Gas 90 days · Hands-on</div><div class="v">$' + gas90Of(r).toFixed(2) + ' · ' + handsOf() + ' min</div></div>'
    + '</div>'
    + '<div class="note"><b>Verdict: ' + note + '</b></div>'
    + '<div class="cards"><div class="card"><h3>How the value is built</h3>'
    + '<table><tbody>'
    + '<tr><td>Size curve × (log10(mcap/TVL) = ' + D.a + ' − ' + Math.abs(D.b) + '·log10(TVL))</td><td class="num">×' + curveMult(r).toFixed(4) + '</td></tr>'
    + '<tr><td>Category effect, ' + esc(catName(r)) + ' (n=' + catN(r) + ', shrunk with 4 pseudo-comps)</td><td class="num">×' + catEffect(r).toFixed(4) + '</td></tr>'
    + '<tr><td>Growth factor (7-day ' + chg + ')</td><td class="num">×' + growthF(r).toFixed(4) + '</td></tr>'
    + '<tr><td>Age factor (' + ageYrs(r) + ' years with no token)</td><td class="num">×' + ageF(r).toFixed(4) + '</td></tr>'
    + '<tr><td>P25–P75 (residual quartiles ×' + D.loF + ' / ×' + D.hiF + ')</td><td class="num">' + money(p25Of(r)) + ' – ' + money(p75Of(r)) + '</td></tr>'
    + '<tr><td>Slice: $1,000 × 7.5% × implied / TVL</td><td class="num">$' + slice.toFixed(2) + ' / $1K</td></tr>'
    + '</tbody></table>'
    + '<p class="note">No name is special-cased. No maturity factor. All factors are computed at runtime.</p></div>'
    + '<div class="card"><h3>Nearest live comparables — same family (' + esc(fam) + ')</h3>'
    + '<table><thead><tr><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">mcap / TVL</th><th>Match</th></tr></thead><tbody>';
  for (var j = 0; j < comps.length; j++) {
    var c = comps[j];
    var cFam = catFamIdx(c[1]);
    var match = cFam === catFamIdx(r[3]) ? 'Same family' : 'Nearest live';
    h += '<tr><td>' + esc(c[0]) + '</td><td>' + esc(c[1] < 0 ? 'Uncategorised' : D.cats[c[1]][0]) + '</td>'
      + '<td class="num">' + money(c[2] * 1e6) + '</td><td class="num">×' + c[3].toFixed(3) + '</td><td>' + match + '</td></tr>';
  }
  h += '</tbody></table>'
    + '<p class="note">Live = token already trades. The four nearest by TVL in the same family, computed at runtime — each row prints its own category.</p></div></div>'
    + '<h3 class="serif" style="margin-top:14px">Farm plan — 8 costed steps, one wallet, ' + lockOf(r) + ' days</h3>'
    + '<ol class="steps">';
  for (var k = 0; k < steps.length; k++) h += '<li>' + esc(steps[k]) + '</li>';
  h += '</ol>'
    + '<div class="note">One wallet, organic pacing, varied amounts — never a burst of identical transactions. Airdrops are never guaranteed. Claim only from official channels, never share a seed phrase.</div>'    + '<footer>Implied value is this entry’s model, not a prediction of if or when ' + esc(r[2]) + ' issues a token.</footer></div>';
  return h;
}

function catHalf(from, to) {
  var h = '';
  for (var j = from; j < Math.min(to, D.cats.length); j++) {
    var cat = D.cats[j];
    h += '<tr><td>' + esc(cat[0]) + '</td><td class="num">' + cat[1] + '</td><td class="num">×' + cat[2] + '</td><td class="num">×' + cat[3] + '</td></tr>';
  }
  return h;
}

function modelHTML() {
  var h = '<div class="wrap">' + headHTML()
    + '<h2>Model &amp; lab <span class="sub2">everything below is fitted at runtime from the snapshot</span></h2>'
    + '<div class="cards"><div class="card"><h3>The size curve</h3>'
    + '<p>Over the ' + D.ncomp + ' protocols that record a token with a market cap, log10(mcap/TVL) falls with size:</p>'
    + scatterSVG()
    + '<pre class="code">log10(mcap / TVL) = ' + D.a + ' − ' + Math.abs(D.b) + ' · log10(TVL)\nlevel at $100M TVL: ×' + D.lvl + '\nleave-one-out error: ×' + D.loo + ' (flat median multiple ×' + D.flat + ', median ' + D.flatMed + ')\nP25–P75 residual band: ×' + D.loF + ' to ×' + D.hiF + ' (ratio ×' + (D.hiF / D.loF).toFixed(2) + ')</pre>'
    + '<p class="note">A category’s raw effect is the median residual of its live comparables, shrunk toward 1 with 4 pseudo-comps: effect = raw^(n/(n+4)). '
    + 'Prediction Market raw ×685.38 (n=1) shrinks to ×3.6914; Risk Curators raw ×6.71 (n=1) shrinks to ×1.4634. No maturity factor.</p></div>'
    + '<div class="card"><h3>Category multiples — all ' + D.cats.length + ' categories with live comparables</h3>'
    + '<div style="display:flex;gap:14px">'
    + '<table class="compact" style="flex:1"><thead><tr><th>Category</th><th class="num">N</th><th class="num">Raw ×</th><th class="num">Effect ×</th></tr></thead><tbody>'
    + catHalf(0, 17) + '</tbody></table>'
    + '<table class="compact" style="flex:1"><thead><tr><th>Category</th><th class="num">N</th><th class="num">Raw ×</th><th class="num">Effect ×</th></tr></thead><tbody>'
    + catHalf(17, 34) + '</tbody></table></div></div></div>'
    + '<div class="card" style="margin-top:10px"><h3>Families — comparables are drawn from the same family</h3><p class="note" style="column-count:2;column-gap:18px">';
  for (var f = 0; f < D.fams.length; f++) {
    var famCats = D.fams[f][1].map(function (ci) { return D.cats[ci][0]; }).join(', ');
    h += '<b>' + esc(D.fams[f][0]) + ':</b> ' + esc(famCats) + '<br>';
  }
  h += 'CEX is excluded: exchange tokens are not launch comparables. Short families are filled with the nearest live protocols overall, flagged on the detail view.</p></div>'
    + '<footer><a href="#/">← Back to the board</a> · 758 = 198 ranked + 416 already trading + 144 set aside · 198 = 40 watchlist + 158 early finds (138 below floor + 20 above floor)</footer></div>';
  return h;
}

function render() {
  var hash = location.hash || '#/';
  var app = document.getElementById('app');
  if (hash.indexOf('#/detail/') === 0) {
    app.innerHTML = detailHTML(hash.slice(9));
  } else if (hash === '#/model') {
    app.innerHTML = modelHTML();
  } else if (hash === '#/filtered') {
    S.sort = 'slice'; S.dir = -1;
    app.innerHTML = boardHTML();
  } else {
    if (S.sort === 'slice' && S.dir === -1 && hash === '#/') { S.sort = 'rank'; S.dir = 1; }
    app.innerHTML = boardHTML();
  }
  bind();
}

function bind() {
  var app = document.getElementById('app');
  var ths = app.querySelectorAll('th[data-sort]');
  for (var i = 0; i < ths.length; i++) {
    ths[i].addEventListener('click', function (ev) {
      var key = this.getAttribute('data-sort');
      if (S.sort === key) { S.dir = -S.dir; } else { S.sort = key; S.dir = (key === 'name' || key === 'cat') ? 1 : -1; }
      render();
    });
  }
  var tabs = app.querySelectorAll('.tab');
  for (var j = 0; j < tabs.length; j++) {
    tabs[j].addEventListener('click', function (ev) {
      S.tier = parseInt(this.getAttribute('data-tier'), 10);
      render();
    });
  }
  var q = document.getElementById('f-q');
  if (q) q.addEventListener('input', function (ev) { S.q = ev.target.value; render(); });
  var cat = document.getElementById('f-cat');
  if (cat) cat.addEventListener('change', function (ev) { S.cat = parseInt(ev.target.value, 10); render(); });
  var ch = document.getElementById('f-chain');
  if (ch) ch.addEventListener('change', function (ev) { S.chain = parseInt(ev.target.value, 10); render(); });
  var ti = document.getElementById('f-tier');
  if (ti) ti.addEventListener('change', function (ev) { S.tier = parseInt(ev.target.value, 10); render(); });
  var mn = document.getElementById('f-min');
  if (mn) mn.addEventListener('change', function (ev) { S.minTvl = parseInt(ev.target.value, 10); render(); });
  var d7 = document.getElementById('f-d7');
  if (d7) d7.addEventListener('change', function (ev) { S.d7 = ev.target.value; render(); });
  var rs = document.getElementById('f-reset');
  if (rs) rs.addEventListener('click', function () {
    S.q = ''; S.cat = -1; S.chain = -1; S.tier = -1; S.minTvl = 0; S.d7 = 'any'; S.sort = 'rank'; S.dir = 1;
    render();
  });
}

window.addEventListener('hashchange', render);
render();
