// scripts/build-site.js
// Reads pl-data.json and injects it into the site HTML
// Runs after fetch-pl-data.js in GitHub Actions, or on Railway startup

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');
const dataPath  = join(root, 'public', 'pl-data.json');
const srcPath   = join(root, 'futbolbantz-standalone.html');
const outPath   = join(root, 'public', 'index.html');

console.log('🏗️  Building FutbolBantz site...');

// ── Load data — crash-safe ─────────────────────────────────────────────────────
let data;
if (fs.existsSync(dataPath)) {
  data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`📊 Loaded pl-data.json (updated: ${data.lastUpdated})`);
} else if (fs.existsSync(outPath)) {
  // pl-data.json missing but index.html already exists — just leave it alone
  console.log('⚠️  pl-data.json not found — keeping existing public/index.html');
  process.exit(0);
} else if (fs.existsSync(srcPath)) {
  // No data at all — just copy the standalone file as-is
  console.log('⚠️  pl-data.json not found — copying standalone HTML without data injection');
  fs.mkdirSync(join(root, 'public'), { recursive: true });
  fs.copyFileSync(srcPath, outPath);
  console.log('✅ Copied standalone HTML to public/index.html');
  process.exit(0);
} else {
  console.error('❌ Neither pl-data.json nor source HTML found. Nothing to build.');
  process.exit(1);
}

// ── Source HTML ────────────────────────────────────────────────────────────────
let html;
if (fs.existsSync(srcPath)) {
  html = fs.readFileSync(srcPath, 'utf8');
} else if (fs.existsSync(outPath)) {
  html = fs.readFileSync(outPath, 'utf8');
} else {
  console.error('❌ No source HTML file found.');
  process.exit(1);
}

// ── Badge map ─────────────────────────────────────────────────────────────────
const badges = {
  ARS:'🔴', MCI:'🔵', MUN:'🔴', AVL:'🟣', LFC:'🔴',
  BOU:'🍒', BRI:'🔵', CFC:'🔵', BRE:'🐝', SUN:'🔴',
  NEW:'⚫', EVE:'🔵', FUL:'⚪', LEE:'⚪', CRY:'🦅',
  NFO:'🔴', TOT:'⚪', WHU:'🟣', BUR:'🟤', WOL:'🐺'
};

// ── Inject data into the JS data blocks ──────────────────────────────────────
// Find the plTable array and replace it
const newTable = `// ── LIVE STANDINGS — auto-generated ${new Date().toUTCString()} ──
    const plTable = [
      ${data.standings.map(t => {
        const badge = badges[t.team_abbr] || '⚽';
        const gd    = t.goal_diff >= 0 ? '+' + t.goal_diff : String(t.goal_diff);
        const form  = t.form
          ? t.form.split(',').slice(-5).map(f => f.trim())
          : [];
        return `{ pos:${t.position}, team:'${t.team_name.replace(/'/g,"\\'")}', abbr:'${t.team_abbr}', p:${t.played}, w:${t.won}, d:${t.drawn}, l:${t.lost}, pts:${t.points}, badge:'${badge}', gd:'${gd}', form:${JSON.stringify(form)} }`;
      }).join(',\n      ')}
    ];`;

// Replace between the live standings markers
const standStart = html.indexOf('// ── LIVE STANDINGS');
const standEnd   = html.indexOf('\n    ];', standStart) + 7;
if (standStart !== -1 && standEnd > standStart) {
  html = html.slice(0, standStart) + newTable + html.slice(standEnd);
  console.log('✅ Standings injected');
} else {
  console.warn('⚠️  Standings markers not found — skipping standings injection');
}

// ── Inject top scorers ─────────────────────────────────────────────────────────
const newScorers = `// ── LIVE TOP SCORERS — auto-generated ${new Date().toUTCString()} ──
    const scorers = [
      ${data.scorers.slice(0, 8).map(s => {
        const badge = badges[s.team_abbr] || '⚽';
        return `{ name:'${s.player_name.replace(/'/g,"\\'")}', club:'${s.team_name.replace(/'/g,"\\'")}', goals:${s.goals}, assists:${s.assists}, badge:'${badge}', note:'' }`;
      }).join(',\n      ')}
    ];`;

const scorerStart = html.indexOf('// ── LIVE TOP SCORERS');
const scorerEnd   = html.indexOf('\n    ];', scorerStart) + 7;
if (scorerStart !== -1 && scorerEnd > scorerStart) {
  html = html.slice(0, scorerStart) + newScorers + html.slice(scorerEnd);
  console.log('✅ Scorers injected');
} else {
  console.warn('⚠️  Scorers markers not found — skipping');
}

// ── Update last-updated timestamp ─────────────────────────────────────────────
const dateStr = new Date(data.lastUpdated).toLocaleDateString('en-GB', {
  day:'numeric', month:'long', year:'numeric'
});
html = html.replace(/⚡ Updated:.*?• Matchday/, `⚡ Updated: ${dateStr} • Matchday`);

// ── Write output ───────────────────────────────────────────────────────────────
fs.mkdirSync(join(root, 'public'), { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`\n✅ Built public/index.html (${(html.length / 1024).toFixed(1)}KB)`);
console.log(`📊 ${data.standings.length} teams | 🥅 ${data.scorers.length} scorers | 📅 ${data.results.length} results`);
