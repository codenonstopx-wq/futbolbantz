// scripts/fetch-pl-data.js
// Fetches live Premier League data and saves to Supabase + local JSON
// Runs in GitHub Actions after every matchday

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const FOOTBALL_API_KEY  = '036cd414ac65405b97c183644db454b6';
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── FOOTBALL-DATA.ORG API ─────────────────────────────────────────────────────
// Free tier: 10 req/min, PL standings + results + scorers all available
const BASE = 'https://api.football-data.org/v4';
const PL_ID = 'PL'; // Premier League competition code

async function fetchFD(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
  });
  if (!res.ok) throw new Error(`football-data.org error: ${res.status} on ${path}`);
  return res.json();
}

// ── FETCH STANDINGS ────────────────────────────────────────────────────────────
async function fetchStandings() {
  console.log('📊 Fetching standings...');
  const data = await fetchFD(`/competitions/${PL_ID}/standings`);
  const table = data.standings[0].table; // total standings

  return table.map(row => ({
    position:     row.position,
    team_name:    row.team.name,
    team_abbr:    row.team.tla,
    team_crest:   row.team.crest,
    played:       row.playedGames,
    won:          row.won,
    drawn:        row.draw,
    lost:         row.lost,
    goals_for:    row.goalsFor,
    goals_against:row.goalsAgainst,
    goal_diff:    row.goalDifference,
    points:       row.points,
    form:         row.form || '',
    updated_at:   new Date().toISOString()
  }));
}

// ── FETCH RECENT RESULTS ───────────────────────────────────────────────────────
async function fetchResults() {
  console.log('📅 Fetching recent results...');
  // Get last 10 finished matches
  const data = await fetchFD(`/competitions/${PL_ID}/matches?status=FINISHED&limit=10`);

  return data.matches.map(m => ({
    match_id:      m.id,
    home_team:     m.homeTeam.name,
    away_team:     m.awayTeam.name,
    home_score:    m.score.fullTime.home,
    away_score:    m.score.fullTime.away,
    match_date:    m.utcDate,
    matchday:      m.matchday,
    status:        m.status,
    updated_at:    new Date().toISOString()
  }));
}

// ── FETCH UPCOMING FIXTURES ────────────────────────────────────────────────────
async function fetchUpcoming() {
  console.log('🗓️ Fetching upcoming fixtures...');
  const data = await fetchFD(`/competitions/${PL_ID}/matches?status=SCHEDULED&limit=20`);

  return data.matches.map(m => ({
    match_id:   m.id,
    home_team:  m.homeTeam.name,
    away_team:  m.awayTeam.name,
    match_date: m.utcDate,
    matchday:   m.matchday,
    status:     m.status,
    updated_at: new Date().toISOString()
  }));
}

// ── FETCH TOP SCORERS ──────────────────────────────────────────────────────────
async function fetchTopScorers() {
  console.log('🥅 Fetching top scorers...');
  const data = await fetchFD(`/competitions/${PL_ID}/scorers?limit=15`);

  return data.scorers.map((s, i) => ({
    position:    i + 1,
    player_name: s.player.name,
    team_name:   s.team.name,
    team_abbr:   s.team.tla,
    goals:       s.goals,
    assists:     s.assists || 0,
    penalties:   s.penalties || 0,
    played:      s.playedMatches,
    updated_at:  new Date().toISOString()
  }));
}

// ── SAVE TO SUPABASE ───────────────────────────────────────────────────────────
async function saveToSupabase(standings, results, upcoming, scorers) {
  console.log('💾 Saving to Supabase...');

  // Upsert standings (replace all rows)
  const { error: e1 } = await supabase
    .from('pl_standings')
    .upsert(standings, { onConflict: 'position' });
  if (e1) console.error('Standings error:', e1.message);

  // Upsert results
  const { error: e2 } = await supabase
    .from('pl_results')
    .upsert(results, { onConflict: 'match_id' });
  if (e2) console.error('Results error:', e2.message);

  // Upsert upcoming
  const { error: e3 } = await supabase
    .from('pl_fixtures')
    .upsert(upcoming, { onConflict: 'match_id' });
  if (e3) console.error('Fixtures error:', e3.message);

  // Upsert scorers
  const { error: e4 } = await supabase
    .from('pl_scorers')
    .upsert(scorers, { onConflict: 'position' });
  if (e4) console.error('Scorers error:', e4.message);

  // Save metadata — when data was last refreshed
  await supabase
    .from('pl_meta')
    .upsert({ id: 1, last_updated: new Date().toISOString(), season: '2025/26' });

  console.log('✅ Supabase updated!');
}

// ── SAVE LOCAL JSON (for build step) ──────────────────────────────────────────
function saveLocalJSON(standings, results, upcoming, scorers) {
  const data = {
    lastUpdated: new Date().toISOString(),
    season: '2025/26',
    standings,
    results,
    upcoming,
    scorers
  };
  fs.writeFileSync('public/pl-data.json', JSON.stringify(data, null, 2));
  console.log('✅ pl-data.json saved to public/');
}

// ── MAIN ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 FutbolBantz PL Data Fetcher starting...');
  console.log(`⏰ Time: ${new Date().toUTCString()}`);

  try {
    const [standings, results, upcoming, scorers] = await Promise.all([
      fetchStandings(),
      fetchResults(),
      fetchUpcoming(),
      fetchTopScorers()
    ]);

    console.log(`📊 ${standings.length} teams in table`);
    console.log(`📅 ${results.length} recent results`);
    console.log(`🗓️  ${upcoming.length} upcoming fixtures`);
    console.log(`🥅 ${scorers.length} top scorers`);

    await saveToSupabase(standings, results, upcoming, scorers);
    saveLocalJSON(standings, results, upcoming, scorers);

    console.log('\n🏆 All done! FutbolBantz data is fresh.');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
