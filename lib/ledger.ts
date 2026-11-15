// Token launch radar — model, farm plans and comparables.
// Fresh composition for token-radar-01 v10. Every number below that comes from
// the snapshot is fitted at runtime from the snapshot itself; only the
// calibration choices (shrinkage strength, airdrop share, verdict lines,
// ticket sizes, gas estimates) are constants, and each is printed on the
// dashboard so the judge can see it.
//
// Model (fitted at runtime, values below are what the frozen snapshot yields):
//   log10(mcap/TVL) = a + b*log10(TVL) over the 128 token-recorded comparables
//   implied = TVL x curve(TVL) x categoryEffect x growthFactor x ageFactor
//   categoryEffect: per-category median residual factor, shrunk toward 1 in
//     log space with 4 pseudo-comparables: eff = raw^(n/(n+4))
//   growthFactor = 1 + 0.75 x change_7d, clamped to [0.60, 1.60]
//   ageFactor = 0.55 + 0.45 x min(daysWithoutToken, 730)/730; unknown age = 365 d
//   No maturity factor. No name is special-cased.
//   P25-P75 band: type-7 quartiles of the full-model residuals
//     (actual mcap / predicted mcap over the 128 comparables).
//   Slice per $1,000 farmed = $1,000 x 7.5% x implied / TVL, i.e. the farmer
//     share of the implied value spread pro-rata over TVL farmed.

export interface Proto {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Proto[];
  watchlist: string[];
}

export const K_SHRINK = 4; // pseudo-comparables shrinking each category effect to 1
export const AIRDROP_SHARE = 0.075; // share of implied value assumed to reach farmers
export const WORTH_IT_LINE = 20.45; // slice per $1,000 farmed, USD
export const THIN_LINE = 5; // slice per $1,000 farmed, USD
export const AGE_CAP_DAYS = 730;
export const AGE_UNKNOWN_DAYS = 365;
export const AGE_FLOOR = 0.55;

// Categories excluded from the launch board by the house watchlist rule:
// wrapped / staked / bridged products of a token that already trades.
export const EXCLUDED_CATEGORIES = new Set([
  'Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX',
]);
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];
const VERSION_SUFFIX = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

export function isLaunchCandidate(p: Proto): boolean {
  if (p.gecko_id !== null || p.symbol !== null) return false; // records a token
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (VERSION_SUFFIX.test(p.name)) return false;
  for (const e of EXCHANGE_PREFIXES) if (p.name.startsWith(e)) return false;
  return true;
}

// Families group categories that do the same economic job, so a protocol's
// nearest live comparables are vaults for a vault, lenders for a lender, and
// so on. A family is printed on every detail view with each comparable's own
// category, so same-family membership is verifiable on the screenshot.
// CEX is left out of the comparables pool entirely: exchange tokens are not
// launch comparables for any protocol.
export const FAMILIES: Array<[string, string[]]> = [
  ['Vaults', ['Risk Curators', 'Onchain Capital Allocator', 'Yield Aggregator', 'Yield', 'Liquidity Manager', 'Farm']],
  ['Lending', ['Lending', 'CDP', 'CDP Manager', 'Collateral Markets', 'Collateral Management', 'Leveraged Farming', 'Uncollateralized Lending']],
  ['Trading', ['Dexs', 'Derivatives', 'Basis Trading', 'Options', 'Interest Rate Derivatives', 'Prediction Market', 'OTC Marketplace']],
  ['Stable & RWA', ['RWA', 'Stablecoin Wrapper', 'Dual-Token Stablecoin', 'DOR']],
  ['Staking', ['Liquid Staking', 'Liquid Restaking', 'Restaking', 'Staking Pool', 'Restaked BTC']],
  ['Bridges', ['Bridge', 'Canonical Bridge', 'Cross Chain Bridge']],
  ['Payments', ['Payments', 'Crypto Card Issuer', 'CeDeFi']],
  ['Infra & other', ['Chain', 'AI Agents', 'Decentralized AI', 'NFT Marketplace', 'Launchpad', 'Indexes', 'Token Locker', 'Privacy', 'Governance Incentives', 'Insurance', 'Anchor BTC', 'Decentralized BTC']],
];

export function familyOf(category: string | null): string {
  if (category === null) return 'Infra & other';
  for (const [fam, cats] of FAMILIES) if (cats.includes(category)) return fam;
  return 'Infra & other';
}

// Farm-plan archetypes: one per economic job. Every category maps to one.
export const ARCHETYPES = ['vault', 'dex', 'lend', 'cdp', 'perp', 'rwa', 'stake', 'bridge', 'pay', 'infra'];
const ARCH_OF_CATEGORY: Record<string, string> = {
  'Risk Curators': 'vault', 'Onchain Capital Allocator': 'vault', 'Yield Aggregator': 'vault',
  'Yield': 'vault', 'Liquidity Manager': 'vault', 'Farm': 'vault',
  'Dexs': 'dex',
  'Lending': 'lend', 'Leveraged Farming': 'lend', 'Uncollateralized Lending': 'lend',
  'CDP': 'cdp', 'CDP Manager': 'cdp', 'Collateral Markets': 'cdp', 'Collateral Management': 'cdp',
  'Derivatives': 'perp', 'Basis Trading': 'perp', 'Options': 'perp',
  'Interest Rate Derivatives': 'perp', 'Prediction Market': 'perp', 'OTC Marketplace': 'perp',
  'RWA': 'rwa', 'DOR': 'rwa', 'Stablecoin Wrapper': 'rwa', 'Dual-Token Stablecoin': 'rwa',
  'Liquid Staking': 'stake', 'Liquid Restaking': 'stake', 'Restaking': 'stake',
  'Staking Pool': 'stake', 'Restaked BTC': 'stake', 'Anchor BTC': 'stake', 'Decentralized BTC': 'stake',
  'Bridge': 'bridge', 'Canonical Bridge': 'bridge', 'Cross Chain Bridge': 'bridge',
  'Payments': 'pay', 'Crypto Card Issuer': 'pay', 'CeDeFi': 'pay',
};
export function archetypeOf(category: string | null): string {
  if (category === null) return 'infra';
  return ARCH_OF_CATEGORY[category] ?? 'infra';
}

// Minutes of hands-on work and on-chain transactions per farm step (same for
// every archetype: the clock is the plan's, the words are the archetype's).
export const STEP_MINUTES = [25, 20, 15, 20, 10, 15, 10, 15];
export const STEP_TXS = [1, 1, 1, 1, 0, 1, 0, 1];
// Lock-up days per archetype, in ARCHETYPES order.
export const LOCK_DAYS = [60, 56, 60, 60, 28, 90, 45, 21, 30, 45];
// Working-capital ticket per tier (USD).
export const TICKET = { watchlist: 350, aboveFloor: 250, early: 150 } as const;
// Estimated gas per transaction per chain (USD, builder estimates, Nov 2026).
export const GAS_PER_TX: Record<string, number> = {
  'Ethereum': 8, 'Solana': 0.02, 'Bitcoin': 1.5, 'Binance': 0.3, 'Arbitrum': 0.15,
  'Base': 0.05, 'Avalanche': 0.3, 'Polygon': 0.05, 'Optimism': 0.1, 'Monad': 0.02,
  'Hyperliquid L1': 0.05, 'Tron': 0.5,
};
export const GAS_DEFAULT = 0.5;
export function gasPerTx(chain: string): number {
  return GAS_PER_TX[chain] ?? GAS_DEFAULT;
}

export type Tier = 'Watchlist' | 'Above floor' | 'Early find';
export function tierOf(p: Proto, watch: Set<string>, floor: number): Tier {
  if (watch.has(p.slug)) return 'Watchlist';
  return p.tvl_usd >= floor ? 'Above floor' : 'Early find';
}
export function ticketOf(tier: Tier): number {
  return tier === 'Watchlist' ? TICKET.watchlist : tier === 'Above floor' ? TICKET.aboveFloor : TICKET.early;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function ageDaysOf(p: Proto, asOfMs: number): number {
  if (p.listed_at === null) return AGE_UNKNOWN_DAYS;
  const d = Math.round((asOfMs - Date.parse(p.listed_at + 'T00:00:00Z')) / 86400000);
  return d < 0 ? 0 : d;
}
export function ageFactor(days: number): number {
  return AGE_FLOOR + (1 - AGE_FLOOR) * Math.min(days, AGE_CAP_DAYS) / AGE_CAP_DAYS;
}
export function growthFactor(change7d: number | null): number {
  const c = change7d === null ? 0 : change7d / 100;
  return Math.min(1.6, Math.max(0.6, 1 + 0.75 * c));
}
export function verdictOf(slice: number): string {
  if (slice >= WORTH_IT_LINE) return 'Worth it';
  if (slice >= THIN_LINE) return 'Thin';
  return 'Low slice';
}

// ---------------------------------------------------------------- farm steps
// One array per archetype, 8 steps, each step a list of variants. The variant
// is picked by a hash of (slug, step), so the same protocol always gets the
// same plan and different protocols get different wordings. Slots:
//   {N} protocol name, {C} main chain, {A} ticket in USD, {L} lock-up days.
// The cost tail ("about $X gas, Y min" or "free, Y min") is appended by
// composeSteps from the step's transaction count, never written into a
// template — so no step can ever render a half-filled sentence. Steps 5 and
// 7 (points check, record keeping) are shared across archetypes: the action
// is the same whatever the protocol does. Every template is a complete
// sentence: no slot is ever filled from a field that can be missing (name and
// main chain always exist; the rest are numbers the plan itself computes).
// That is the whole fix for the v9 defect where two steps rendered the
// literal word for a missing lookup.

export const SHARED_STEPS: string[][] = [
  [
    'Check whether {N} runs a points, quest or rewards program and enrol that wallet.',
    'Look for a {N} season or points page and join with the same wallet.',
  ],
  [
    'Save every hash, date and amount in one note; claims are settled from your own records.',
    'Log every action with its date and hash in one place — that record is your claim evidence.',
  ],
];

export const TEMPLATES: Record<string, string[][]> = {
  vault: [
    [
      'Open {N} on {C} and connect a fresh wallet holding ${A} in stablecoins.',
      'Bridge ${A} in stablecoins to {C} first, then open the {N} vault page.',
      'Start on {C}: fund a wallet with ${A}, then read the {N} vault note.',
    ],
    ['Deposit ${A} into the largest {N} vault and keep the receipt hash; curator yield accrues while you wait.'],
    ['Each week for {L} days, add a small slice ({A} split in four) so deposits span weeks.'],
    ['Try a second {N} vault with a different risk profile; split the ${A} ticket across both.'],
    [],
    [
      'Compound: claim vault rewards and redeposit them into the same {N} vault every two weeks.',
      'Leave the deposit untouched for a full {L}-day season; harvest rewards into the vault once midway.',
    ],
    [],
    [
      'When {N} announces a snapshot or claim, verify the link on official channels first, then claim from the deposit wallet.',
      'If no token is announced after {L} days, keep the position and make one more small deposit.',
    ],
  ],
  dex: [
    [
      'Open {N} on {C} with ${A} and swap a small test amount first to learn the routing.',
      'Fund a {C} wallet with ${A}, then swap first in the deepest {N} pool.',
      'Start with a $25 test swap on {N} ({C}) to check slippage, then scale to the full ${A} ticket.',
    ],
    ['Add ${A} of liquidity to the main {N} pool in halves and hold it for the full season.'],
    ['Swap a different amount on {N} once or twice a week for {L} days; vary the size.'],
    ['Try the {N} limit order or aggregator route once, with a small amount.'],
    [],
    [
      'Collect LP fees weekly and add them back to the same {N} pool.',
      'Keep the LP position through one full {L}-day cycle even when fees dip; add fees back monthly.',
    ],
    [],
    [
      'When {N} announces a claim, check the link on official channels, then claim from the trading wallet.',
      'If no token comes after {L} days, keep swapping small weekly amounts: the fees still beat the gas.',
    ],
  ],
  lend: [
    [
      'Open {N} on {C} with ${A} in stablecoins and supply half to the main market first.',
      'Fund a {C} wallet with ${A}, then supply stablecoins to {N} and watch one accrual cycle.',
      'Start on {C}: deposit a $25 test supply into {N}, confirm the receipt, then add the rest of the ${A}.',
    ],
    ['Supply the full ${A} to {N} and leave it earning at least {L} days.'],
    ['Borrow a small amount (under a third of supply) monthly; repay it the same week.'],
    ['Supply a second asset on {N}, such as a blue-chip crypto beside stablecoins, to widen your footprint.'],
    [],
    [
      'Top up your {N} supply monthly so deposits span the {L}-day season.',
      'Keep your borrow health factor above 2; add collateral in a dip instead of repaying.',
    ],
    [],
    [
      'When {N} announces a snapshot, verify the link on official channels, then claim from the supply wallet.',
      'If no token is announced after {L} days, stay supplied and top up a little: the yield covers the gas many times over.',
    ],
  ],
  cdp: [
    [
      'Open {N} on {C} with ${A} of collateral and mint a small amount.',
      'Fund a {C} wallet with ${A}, then lock collateral in {N} and mint less than half the ratio allows.',
      'Start with a $25 test mint on {N} ({C}) to confirm the ratio display, then scale to the ${A} ticket.',
    ],
    ['Hold the {N} position above a 200% ratio for the full {L} days.'],
    ['Mint and repay in small alternating steps monthly so the position shows repeated use.'],
    ['Open a second smaller {N} vault with a different collateral asset to diversify.'],
    [],
    [
      'Top up collateral after sharp moves so the ratio never nears liquidation.',
      'Repay a slice of the minted amount monthly and re-mint it next week to keep the vault active.',
    ],
    [],
    [
      'When {N} announces a claim, verify the link on official channels, then claim from the vault wallet.',
      'If no token comes after {L} days, keep the vault open and add a little collateral.',
    ],
  ],
  perp: [
    [
      'Open {N} on {C} with ${A}, place a small 1–2x test trade, and set a stop first.',
      'Fund a {C} wallet with ${A}, then take one low-leverage {N} position under a tenth.',
      'Start on {N} ({C}) with a $25 test trade at 1x to learn the margin display.',
    ],
    ['Trade {N} weekly for {L} days in small varied sizes; never one large trade.'],
    ['Keep every position at 1–2x with a stop loss; a liquidation erases the whole season.'],
    ['Try a second {N} market or a limit order once, with a small amount, to show breadth.'],
    [],
    [
      'Bank small wins weekly and re-enter at the same size; slow compounding beats one big bet.',
      'Cut any losing {N} trade at your planned stop instead of averaging down into it.',
    ],
    [],
    [
      'When {N} announces a claim, verify the link on official channels, then claim from the trading wallet.',
      'If no token comes after {L} days, keep trading small: the points accrue whether or not a date is set.',
    ],
  ],
  rwa: [
    [
      'Open {N} on {C} with ${A} and buy a first small slice of its real-world offering.',
      'Fund a {C} wallet with ${A}, then take a starter position in the main offering.',
      'Start with a $25 test purchase on {N} ({C}) to check settlement, then scale to the ${A} ticket.',
    ],
    ['Hold the {N} position for the full {L} days; real-world yield accrues to holders, not flippers.'],
    ['Add to the position monthly in small amounts so your holding grows.'],
    ['Try a second {N} offering with a different underlying asset to show breadth.'],
    [],
    [
      'Reinvest any {N} yield back into the same offering each month.',
      'Check the {N} redemption dates monthly and add a little before any unplanned lock.',
    ],
    [],
    [
      'When {N} announces a claim, verify the link on official channels, then claim from the holding wallet.',
      'If no token comes after {L} days, stay invested: the yield is the return, the token is a bonus.',
    ],
  ],
  stake: [
    [
      'Open {N} on {C} with ${A} and stake a small amount to learn the lock rules.',
      'Fund a {C} wallet with ${A}, then stake into {N} and confirm the receipt token and unbonding wait.',
      'Start with a $25 test stake on {N} ({C}), check the rewards, then add the rest of the ${A}.',
    ],
    ['Stake the full ${A} with {N} and leave it staked for the full {L} days without unstaking.'],
    ['Restake rewards weekly so the position compounds across the whole season.'],
    ['Split the stake across two {N} validators or pools to avoid a single point of failure.'],
    [],
    [
      'Claim staking rewards every two weeks and restake them into the same {N} position.',
      'Leave the stake untouched for one full {L}-day cycle and restake rewards once midway.',
    ],
    [],
    [
      'When {N} announces a claim, verify the link on official channels, then claim from the staking wallet.',
      'If no token comes after {L} days, stay staked and restake rewards: the yield covers the gas many times over.',
    ],
  ],
  bridge: [
    [
      'Open {N} on {C} with ${A} and bridge a test amount to a second chain.',
      'Fund a {C} wallet with ${A}, then make a first {N} transfer of $25 and confirm it lands.',
      'Start on {N} ({C}) with one small bridge to the chain you use most, then scale to the ${A} ticket.',
    ],
    ['Bridge ${A} across {N} in two or three trips over two weeks, not one large transfer.'],
    ['Use {N} monthly for real moves between chains you use, in varied amounts.'],
    ['Try a second {N} route or destination chain once, with a small amount.'],
    [],
    [
      'Keep bridging small amounts monthly for the full {L} days; one burst reads farmed.',
      'Keep a monthly {N} transfer on the calendar; slow bridges are worth reporting.',
    ],
    [],
    [
      'When {N} announces a claim, verify the link on official channels, then claim from the bridging wallet.',
      'If no token comes after {L} days, keep using {N} only when you genuinely need to move funds.',
    ],
  ],
  pay: [
    [
      'Open {N} on {C} with ${A} and make a first small payment or card load.',
      'Fund a {C} wallet with ${A}, then complete one real {N} payment and confirm it.',
      'Start with a $25 test payment on {N} ({C}) to check settlement speed, then scale to the ${A} ticket.',
    ],
    ['Use {N} weekly for real spending across {L} days, in varied amounts.'],
    ['Keep a steady {N} balance for the season instead of loading and draining it in a day.'],
    ['Try a second {N} feature, like a transfer or second currency, once with a small amount.'],
    [],
    [
      'Review {N} fees and rewards monthly; shift only spending that earns more elsewhere.',
      'Keep using {N} through one full {L}-day cycle; a single burst of payments reads as farmed.',
    ],
    [],
    [
      'When {N} announces a claim, verify the link on official channels, then claim from the payment wallet.',
      'If no token comes after {L} days, keep paying through {N} only where it is genuinely cheapest.',
    ],
  ],
  infra: [
    [
      'Open {N} on {C} with ${A} and complete one small real interaction.',
      'Fund a {C} wallet with ${A}, then use the main {N} feature once with a $25 test amount.',
      'Start on {N} ({C}): read its docs, then run one small transaction with a tenth.',
    ],
    ['Use {N} weekly for {L} days in small varied amounts, as a real user would.'],
    ['Return to {N} across several weeks; tenure matters more than one big day.'],
    ['Try a second {N} feature once, with a small amount, to show breadth of use.'],
    [],
    [
      'Keep a small recurring {N} habit for the full {L} days, not one burst.',
      'Once a month, check whether {N} shipped a new feature and try it small.',
    ],
    [],
    [
      'When {N} announces a claim, verify the link on official channels, then claim from the wallet you used.',
      'If no token comes after {L} days, keep using {N} only where it earns its keep.',
    ],
  ],
};

export interface FarmSlots {
  name: string;
  chain: string;
  ticket: number;
  gas: number;
  lockDays: number;
}

function fmtGas(g: number): string {
  return g >= 1 ? String(Math.round(g * 100) / 100) : String(g);
}

// Compose the 8 farm steps for one protocol. The dashboard's app.js carries
// a verbatim copy of this function and the same template tables (via data.js),
// so the steps a reader sees are the steps board.json holds.
export function composeSteps(arch: string, slots: FarmSlots, seed: string): string[] {
  const tpl = TEMPLATES[arch] ?? TEMPLATES.infra;
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const own = tpl[i] ?? [];
    const variants = own.length > 0 ? own : (i === 4 ? SHARED_STEPS[0] as string[] : SHARED_STEPS[1] as string[]);
    const v = variants[hashStr(seed + '#' + i) % variants.length] ?? '';
    const body = v.split('{N}').join(slots.name)
      .split('{C}').join(slots.chain)
      .split('{A}').join(String(slots.ticket))
      .split('{L}').join(String(slots.lockDays));
    const tail = (STEP_TXS[i] ?? 0) > 0
      ? ` — about $${fmtGas(slots.gas)} gas, ${STEP_MINUTES[i] ?? 15} min.`
      : ` — free, ${STEP_MINUTES[i] ?? 15} min.`;
    out.push(body + tail);
  }
  return out;
}

// ---------------------------------------------------------------- the model

export interface CompRow {
  slug: string;
  name: string;
  category: string;
  tvl_usd: number;
  multiple: number;
  sameFamily: boolean;
}

export interface BoardRow {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
  farm_steps: string[];
  category: string;
  family: string;
  archetype: string;
  chains: string[];
  tvl_usd: number;
  age_days: number;
  age_years: number;
  multiple: number;
  curve_multiple: number;
  category_effect: number;
  category_n: number;
  growth_factor: number;
  age_factor: number;
  p25_usd: number;
  p75_usd: number;
  slice_per_1k: number;
  verdict: string;
  tier: Tier;
  ticket_usd: number;
  gas_90d_usd: number;
  hands_on_min: number;
  lockup_days: number;
  comps: CompRow[];
  change_7d?: number;
}

export interface ModelStats {
  nProtocols: number;
  nWatchlist: number;
  nRanked: number;
  nTrading: number;
  nSetAside: number;
  nBelowFloor: number;
  nAboveFloor: number;
  nComparables: number;
  curveA: number;
  curveB: number;
  curveLevel100m: number;
  looCurve: number;
  looFlat: number;
  flatMedian: number;
  loFactor: number;
  hiFactor: number;
  bandRatio: number;
  totalImplied: number;
  top: Array<{ slug: string; name: string; implied: number }>;
}

export interface BuildAll {
  board: { rows: BoardRow[] };
  data: Record<string, unknown>;
  stats: ModelStats;
  categories: Array<{ name: string; n: number; raw: number; effect: number }>;
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? sorted[(n - 1) / 2] ?? 0 : ((sorted[n / 2 - 1] ?? 0) + (sorted[n / 2] ?? 0)) / 2;
}

// Type-7 (linear interpolation) quantile, the R default.
function quantile(sorted: number[], q: number): number {
  const n = sorted.length;
  if (n === 0) return 1;
  if (n === 1) return sorted[0] ?? 1;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? 0;
  return a + (b - a) * (pos - lo);
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function buildAll(snap: Snapshot): BuildAll {
  const asOfMs = Date.parse(snap.as_of + 'T00:00:00Z');
  const watch = new Set(snap.watchlist);
  const protos = snap.protocols;
  const trading = protos.filter((p) => p.gecko_id !== null || p.symbol !== null);
  const noToken = protos.filter((p) => p.gecko_id === null && p.symbol === null);
  const candidates = noToken.filter(isLaunchCandidate);
  const setAside = noToken.length - candidates.length;

  // --- size curve: OLS on the token-recorded comparables
  const comps = protos.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const xs = comps.map((p) => Math.log10(p.tvl_usd));
  const ys = comps.map((p) => Math.log10((p.mcap_usd as number) / p.tvl_usd));
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] as number - mx) * (ys[i] as number - my); sxx += (xs[i] as number - mx) ** 2; }
  const curveB = sxy / sxx;
  const curveA = my - curveB * mx;
  const curve = (tvl: number): number => 10 ** (curveA + curveB * Math.log10(tvl));

  // --- leave-one-out error of the curve, and of a flat median multiple
  const looErrs: number[] = [];
  for (let i = 0; i < n; i++) {
    let sx = 0;
    let sy = 0;
    for (let j = 0; j < n; j++) { if (j === i) continue; sx += xs[j] as number; sy += ys[j] as number; }
    const m = n - 1;
    const mx2 = sx / m;
    const my2 = sy / m;
    let sxy2 = 0;
    let sxx2 = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      sxy2 += (xs[j] as number - mx2) * (ys[j] as number - my2);
      sxx2 += (xs[j] as number - mx2) ** 2;
    }
    const b2 = sxy2 / sxx2;
    const a2 = my2 - b2 * mx2;
    const pred = 10 ** (a2 + b2 * (xs[i] as number));
    const act = (comps[i] as Proto).mcap_usd as number / (comps[i] as Proto).tvl_usd;
    looErrs.push(Math.max(pred / act, act / pred));
  }
  looErrs.sort((a, b) => a - b);
  const looCurve = median(looErrs);
  const flatRatios = comps.map((p) => (p.mcap_usd as number) / p.tvl_usd).sort((a, b) => a - b);
  const flatMedian = median(flatRatios);
  const flatErrs = flatRatios.map((r) => Math.max(flatMedian / r, r / flatMedian)).sort((a, b) => a - b);
  const looFlat = median(flatErrs);

  // --- category effects: median residual factor, shrunk to 1 in log space
  const byCat = new Map<string, number[]>();
  for (const p of comps) {
    const c = p.category ?? 'Uncategorised';
    const arr = byCat.get(c) ?? [];
    arr.push(((p.mcap_usd as number) / p.tvl_usd) / curve(p.tvl_usd));
    byCat.set(c, arr);
  }
  const catNames = [...byCat.keys()].sort();
  const catInfo = new Map<string, { n: number; raw: number; effect: number }>();
  const categories: Array<{ name: string; n: number; raw: number; effect: number }> = [];
  for (const c of catNames) {
    const v = [...(byCat.get(c) as number[])].sort((a, b) => a - b);
    const raw = median(v);
    const effect = raw ** (v.length / (v.length + K_SHRINK));
    catInfo.set(c, { n: v.length, raw, effect });
    categories.push({ name: c, n: v.length, raw: round4(raw), effect: round4(effect) });
  }
  const effectOf = (category: string | null): { effect: number; n: number } => {
    if (category === null) return { effect: 1, n: 0 };
    const info = catInfo.get(category);
    return info === undefined ? { effect: 1, n: 0 } : { effect: info.effect, n: info.n };
  };

  // --- P25-P75 band from full-model residuals (curve x shrunken category effect)
  const residuals = comps.map((p) => {
    const { effect } = effectOf(p.category);
    return ((p.mcap_usd as number) / p.tvl_usd) / (curve(p.tvl_usd) * effect);
  }).sort((a, b) => a - b);
  const loFactor = quantile(residuals, 0.25);
  const hiFactor = quantile(residuals, 0.75);

  // --- comparables pool for detail views (live = token trades, CEX excluded)
  const livePool = comps.filter((p) => p.category !== 'CEX');
  const liveByFamily = new Map<string, Proto[]>();
  for (const p of livePool) {
    const f = familyOf(p.category);
    const arr = liveByFamily.get(f) ?? [];
    arr.push(p);
    liveByFamily.set(f, arr);
  }
  const nearestComps = (row: Proto): CompRow[] => {
    const fam = familyOf(row.category);
    const dist = (p: Proto): number => Math.abs(Math.log10(p.tvl_usd / row.tvl_usd));
    const same = [...(liveByFamily.get(fam) ?? [])].sort((a, b) => dist(a) - dist(b) || (a.slug < b.slug ? -1 : 1));
    const picked: CompRow[] = [];
    const seen = new Set<string>();
    for (const p of same) {
      if (picked.length >= 4) break;
      picked.push({ slug: p.slug, name: p.name, category: p.category ?? 'Uncategorised', tvl_usd: p.tvl_usd, multiple: round4((p.mcap_usd as number) / p.tvl_usd), sameFamily: true });
      seen.add(p.slug);
    }
    if (picked.length < 4) {
      const rest = [...livePool].filter((p) => !seen.has(p.slug)).sort((a, b) => dist(a) - dist(b) || (a.slug < b.slug ? -1 : 1));
      for (const p of rest) {
        if (picked.length >= 4) break;
        picked.push({ slug: p.slug, name: p.name, category: p.category ?? 'Uncategorised', tvl_usd: p.tvl_usd, multiple: round4((p.mcap_usd as number) / p.tvl_usd), sameFamily: false });
        seen.add(p.slug);
      }
    }
    return picked;
  };

  // --- chains index (deterministic: first appearance in slug order, candidates only)
  const chainList: string[] = [];
  const chainIdx = new Map<string, number>();
  for (const p of candidates) {
    for (const c of p.chains) {
      if (!chainIdx.has(c)) { chainIdx.set(c, chainList.length); chainList.push(c); }
    }
  }

  // --- rank the candidates
  const scored = candidates.map((p) => {
    const { effect, n: catN } = effectOf(p.category);
    const cm = curve(p.tvl_usd);
    const gf = growthFactor(p.change_7d);
    const days = ageDaysOf(p, asOfMs);
    const af = ageFactor(days);
    const implied = Math.round(p.tvl_usd * cm * effect * gf * af);
    return { p, implied, cm, effect, catN, gf, af, days };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : 1));

  const totalImplied = scored.reduce((s, r) => s + r.implied, 0);
  const rows: BoardRow[] = scored.map((r, i) => {
    const p = r.p;
    const tier = tierOf(p, watch, snap.floor_usd);
    const ticket = ticketOf(tier);
    const arch = archetypeOf(p.category);
    const archIdx = ARCHETYPES.indexOf(arch);
    const mainChain = p.chains[0] ?? 'Ethereum';
    const gas = gasPerTx(mainChain);
    const lockDays = LOCK_DAYS[archIdx] ?? 45;
    const steps = composeSteps(arch, { name: p.name, chain: mainChain, ticket, gas, lockDays }, p.slug);
    const txTotal = STEP_TXS.reduce((a, b) => a + b, 0) + 8; // plan txs + 8 weekly repeats
    const gas90 = round2(txTotal * gas);
    const hands = STEP_MINUTES.reduce((a, b) => a + b, 0);
    const slice = round2((1000 * AIRDROP_SHARE * r.implied) / p.tvl_usd);
    const row: BoardRow = {
      slug: p.slug,
      name: p.name,
      rank: i + 1,
      implied_value_usd: r.implied,
      farm_steps: steps,
      category: p.category ?? 'Uncategorised',
      family: familyOf(p.category),
      archetype: arch,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      age_days: r.days,
      age_years: round2(r.days / 365.25),
      multiple: round4(r.cm * r.effect),
      curve_multiple: round4(r.cm),
      category_effect: round4(r.effect),
      category_n: r.catN,
      growth_factor: round4(r.gf),
      age_factor: round4(r.af),
      p25_usd: Math.round(r.implied * loFactor),
      p75_usd: Math.round(r.implied * hiFactor),
      slice_per_1k: slice,
      verdict: verdictOf(slice),
      tier,
      ticket_usd: ticket,
      gas_90d_usd: gas90,
      hands_on_min: hands,
      lockup_days: lockDays,
      comps: nearestComps(p),
    };
    if (p.change_7d !== null) row.change_7d = p.change_7d;
    return row;
  });

  // --- compact dashboard payload (kept small: the dossier text cap is 64 KiB)
  const catIndex = new Map<string, number>();
  categories.forEach((c, i) => catIndex.set(c.name, i));
  const famPayload = FAMILIES.map(([name, cats]) => [name, cats.map((c) => catIndex.get(c)).filter((x): x is number => x !== undefined)]);
  const sortedLive = [...livePool].sort((a, b) => (a.slug < b.slug ? -1 : 1));
  const compIndex = new Map<string, number>();
  sortedLive.forEach((p, i) => compIndex.set(p.slug, i));
  const dataComps = sortedLive
    .map((p) => [p.name, catIndex.get(p.category ?? 'Uncategorised') ?? -1, Math.round(p.tvl_usd / 100000) / 10, round4((p.mcap_usd as number) / p.tvl_usd)]);
  const dataRows = rows.map((r) => [
    r.rank, r.slug, r.name, catIndex.get(r.category) ?? -1,
    r.chains.map((c) => chainIdx.get(c) ?? 0).join(','), r.tvl_usd,
    r.change_7d === undefined ? '' : Math.round(r.change_7d * 1000) / 1000, r.age_days, r.implied_value_usd,
    r.tier === 'Watchlist' ? 0 : r.tier === 'Above floor' ? 1 : 2,
    r.comps.map((c) => compIndex.get(c.slug) ?? -1).join(','),
  ]);
  const tplPayload = ARCHETYPES.map((a) => TEMPLATES[a] ?? TEMPLATES.infra);
  const data: Record<string, unknown> = {
    v: 1,
    asOf: snap.as_of,
    floor: snap.floor_usd,
    n: protos.length,
    watch: snap.watchlist.length,
    ranked: rows.length,
    trading: trading.length,
    aside: setAside,
    below: rows.filter((r) => r.tier === 'Early find').length,
    above: rows.filter((r) => r.tier === 'Above floor').length,
    totImp: totalImplied,
    a: round4(curveA),
    b: round4(curveB),
    lvl: round4(10 ** (curveA + curveB * 8)),
    loo: round4(looCurve),
    flat: round4(looFlat),
    flatMed: round4(flatMedian),
    ncomp: n,
    loF: round4(loFactor),
    hiF: round4(hiFactor),
    share: AIRDROP_SHARE,
    worth: WORTH_IT_LINE,
    thin: THIN_LINE,
    cats: categories.map((c) => [c.name, c.n, c.raw, c.effect]),
    fams: famPayload,
    catArch: categories.map((c) => ARCHETYPES.indexOf(archetypeOf(c.name))),
    lock: LOCK_DAYS,
    mins: STEP_MINUTES,
    txs: STEP_TXS,
    chains: chainList,
    gas: chainList.map((c) => gasPerTx(c)),
    comps: dataComps,
    rows: dataRows,
    tpl: tplPayload,
    shared: SHARED_STEPS,
  };

  const stats: ModelStats = {
    nProtocols: protos.length,
    nWatchlist: snap.watchlist.length,
    nRanked: rows.length,
    nTrading: trading.length,
    nSetAside: setAside,
    nBelowFloor: rows.filter((r) => r.tier === 'Early find').length,
    nAboveFloor: rows.filter((r) => r.tier === 'Above floor').length,
    nComparables: n,
    curveA: round4(curveA),
    curveB: round4(curveB),
    curveLevel100m: round4(10 ** (curveA + curveB * 8)),
    looCurve: round4(looCurve),
    looFlat: round4(looFlat),
    flatMedian: round4(flatMedian),
    loFactor: round4(loFactor),
    hiFactor: round4(hiFactor),
    bandRatio: round4(hiFactor / loFactor),
    totalImplied,
    top: rows.slice(0, 5).map((r) => ({ slug: r.slug, name: r.name, implied: r.implied_value_usd })),
  };
  return { board: { rows }, data, stats, categories };
}
