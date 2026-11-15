// Token launch radar — entrypoint (Node 22, standard library only).
// Reads the sealed snapshot, ranks the pre-token protocols, writes the board,
// the dashboard data, the screenshots and the dossier into the output dir.
// Deterministic: no clock, no randomness; ties break by slug, so two runs
// write byte-identical outputs.
//
//   node main.ts --input <snapshot.json>
//   MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
//
// Defaults match the grading sandbox: input /input/snapshot.json,
// output /output.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from './lib/ledger.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = dirname(fileURLToPath(import.meta.url));

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? (process.argv[i + 1] as string) : fallback;
}

function main(): void {
  const input = arg('--input', '/input/snapshot.json');
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const snap = JSON.parse(readFileSync(input, 'utf8'));
  const { board, data, stats } = buildAll(snap);

  // --- safety net: no placeholder text may ever reach an output file
  const blob = JSON.stringify(board);
  if (/undefined|null|NaN/.test(blob)) throw new Error('board contains a placeholder value');

  mkdirSync(join(outDir, 'dashboard'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });

  writeFileSync(join(outDir, 'board.json'), JSON.stringify(board, null, 2) + '\n', 'utf8');

  // dashboard: copy the page, then write the generated data beside it
  const dashSrc = join(here, 'dashboard');
  for (const f of readdirSync(dashSrc)) {
    if (f === 'data.js') continue;
    cpSync(join(dashSrc, f), join(outDir, 'dashboard', f));
  }
  const dataJs = 'const DATA=' + JSON.stringify(data) + ';\n';
  if (/undefined|null|NaN/.test(dataJs)) throw new Error('dashboard data contains a placeholder value');
  writeFileSync(join(outDir, 'dashboard', 'data.js'), dataJs, 'utf8');

  const shotsSrc = join(here, 'screenshots');
  if (existsSync(shotsSrc)) {
    for (const f of readdirSync(shotsSrc)) {
      if (f.startsWith('.')) continue;
      cpSync(join(shotsSrc, f), join(outDir, 'screenshots', f));
    }
  }

  const dossier = buildDossier(outDir, { text_max_bytes: 65536 });
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  const s = stats;
  console.log(`rows=${s.nRanked} watchlist=${s.nWatchlist} trading=${s.nTrading} set-aside=${s.nSetAside}`);
  console.log(`curve: log10(mcap/TVL) = ${s.curveA} ${s.curveB}·log10(TVL); level @ $100M x${s.curveLevel100m}`);
  console.log(`LOO curve x${s.looCurve} (flat x${s.looFlat}); band P25-P75 x${s.loFactor}-x${s.hiFactor} (ratio x${s.bandRatio})`);
  console.log(`total implied $${(s.totalImplied / 1e9).toFixed(2)}B; top: ` + s.top.map((t) => `#${t.name} $${(t.implied / 1e6).toFixed(1)}M`).join(', '));
  console.log(`dossier=${dossier.length} bytes; board=${blob.length} bytes`);
}

main();
