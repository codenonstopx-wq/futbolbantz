// scripts/build-site.js
// Reads pl-data.json and injects it into the standalone HTML file
// Runs after fetch-pl-data.js in GitHub Actions

import fs from 'fs';

const dataPath = 'public/pl-data.json';
const sitePath = 'futbolbantz-standalone.html'; // your main site file
const outPath  = 'public/index.html';

console.log('🏗️  Building FutbolBantz site...');

// Read live data
if (!fs.existsSync(dataPath)) {
  console.error('❌ pl-data.json not found — run fetch-pl-data.js first');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let html   = fs.readFileSync(sitePath, 'utf8');

// ── BUILD STANDINGS DATA BLOCK ─────────────────────────────────────────────────
const badges = {
  ARS:'🔴', MCI:'🔵', MUN:'🔴', AVL:'🟣', LFC:'🔴',
  BOU:'🍒', BRI:'🔵', CFC:'🔵', BRE:'🐝', SUN:'🔴',
  NEW:'⚫', EVE:'🔵', FUL:'⚪', LEE:'⚪', CRY:'🦅',
  NFO:'🔴', TOT:'⚪', WHU:'🟣', BUR:'🟤', WOL:'🐺'
};

const newStandingsJS = `
    // ── LIVE STANDINGS — auto-generated ${new Date().toUTCString()} ──
    const plTable = [
      ${data.standings.map(t => {
        const badge = badges[t.team_abbr] || '⚽';
        const form  = t.form ? t.form.split(',').slice(-5).map(f =>
          f === 'W' ? 'W' : f === 'D' ? 'D' : 'L'
        ) : [];
        const gd = t.goal_diff >= 0 ? '+' + t.goal_diff : String(t.goal_diff);
        return `{ pos:${t.position}, team:'${t.team_name.replace(/'/g,"\\'")}', abbr:'${t.team_abbr}', p:${t.played}, w:${t.won}, d:${t.drawn}, l:${t.lost}, pts:${t.points}, badge:'${badge}', gd:'${gd}', form:${JSON.stringify(form)} }`;
      }).join(',\n      ')}
    ];`;

// ── BUILD TOP SCORERS DATA BLOCK ───────────────────────────────────────────────
const newScorersJS = `
    // ── LIVE TOP SCORERS — auto-generated ${new Date().toUTCString()} ──
    const scorers = [
      ${data.scorers.slice(0, 8).map(s => {
        const badge = badges[s.team_abbr] || '⚽';
        return `{ name:'${s.player_name.replace(/'/g,"\\'")}', club:'${s.team_name.replace(/'/g,"\\'")}', goals:${s.goals}, assists:${s.assists}, badge:'${badge}', note:'' }`;
      }).join(',\n      ')}
    ];`;

// ── BUILD RESULTS DATA BLOCK ───────────────────────────────────────────────────
const newResultsJS = `
    // ── LIVE RESULTS — auto-generated ${new Date().toUTCString()} ──
    const recentResults = [
      ${data.results.slice(0, 8).map(r => {
        const d = new Date(r.match_date);
        const dateStr = d.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
        return `{ date:'${dateStr}', h:'${r.home_team.replace(/'/g,"\\'")}', a:'${r.away_team.replace(/'/g,"\\'")}', hs:${r.home_score}, as:${r.away_score} }`;
      }).join(',\n      ')}
    ];`;

// ── BUILD UPCOMING FIXTURES DATA BLOCK ────────────────────────────────────────
const newUpcomingJS = `
    // ── LIVE UPCOMING FIXTURES — auto-generated ${new Date().toUTCString()} ──
    const upcoming = [
      ${data.upcoming.slice(0, 10).map(f => {
        return `{ h:'${f.home_team.replace(/'/g,"\\'")}', a:'${f.away_team.replace(/'/g,"\\'")}', hProb:50, aProb:30 }`;
      }).join(',\n      ')}
    ];`;

// ── INJECT INTO HTML ──────────────────────────────────────────────────────────
// Replace the static data blocks between marker comments
function injectBetweenMarkers(html, startMarker, endMarker, newContent) {
  const start = html.indexOf(startMarker);
  const end   = html.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    console.warn(`⚠️  Markers not found: "${startMarker}"`);
    return html;
  }
  return html.slice(0, start + startMarker.length) + newContent + html.slice(end);
}

html = injectBetweenMarkers(html,
  '// ── LIVE STANDINGS',
  '    ];',
  newStandingsJS + '\n'
);

// Update the last-updated timestamp shown on page
const now = new Date();
const dateStr = now.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
html = html.replace(
  /⚡ Updated:.*?Matchday/,
  `⚡ Updated: ${dateStr} • Matchday`
);

// Write output
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`✅ Built public/index.html (${(html.length / 1024).toFixed(1)}KB)`);
console.log(`📊 Table: ${data.standings.length} teams`);
console.log(`📅 Results: ${data.results.length} matches`);
console.log(`🗓️  Fixtures: ${data.upcoming.length} upcoming`);
console.log(`🥅 Scorers: ${data.scorers.length} players`);
console.log(`⏰ Last updated: ${data.lastUpdated}`);
