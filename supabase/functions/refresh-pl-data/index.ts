// refresh-pl-data/index.ts
// Supabase Edge Function — updates PL standings, results, scorers
// Triggered by cron after each matchday

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FOOTBALL_API_KEY = "036cd414ac65405b97c183644db454b6";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb   = createClient(SB_URL, SB_KEY);
const BASE = "https://api.football-data.org/v4";

async function fetchFD(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": FOOTBALL_API_KEY },
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status} on ${path}`);
  return res.json();
}

Deno.serve(async (_req) => {
  console.log("🏆 Refreshing PL data...");

  try {
    // Fetch standings + finished matches + scorers in parallel
    const [standingsData, finishedData, scorersData, scheduledData] = await Promise.all([
      fetchFD("/competitions/PL/standings"),
      fetchFD("/competitions/PL/matches?status=FINISHED&limit=10"),
      fetchFD("/competitions/PL/scorers?limit=15"),
      fetchFD("/competitions/PL/matches?status=SCHEDULED&limit=20"),
    ]);

    const standings = standingsData.standings[0].table.map((row: any) => ({
      position:      row.position,
      team_name:     row.team.name,
      team_abbr:     row.team.tla,
      team_crest:    row.team.crest,
      played:        row.playedGames,
      won:           row.won,
      drawn:         row.draw,
      lost:          row.lost,
      goals_for:     row.goalsFor,
      goals_against: row.goalsAgainst,
      goal_diff:     row.goalDifference,
      points:        row.points,
      form:          row.form || "",
      updated_at:    new Date().toISOString(),
    }));

    const results = finishedData.matches.map((m: any) => ({
      match_id:   m.id,
      home_team:  m.homeTeam.name,
      away_team:  m.awayTeam.name,
      home_score: m.score.fullTime.home,
      away_score: m.score.fullTime.away,
      match_date: m.utcDate,
      matchday:   m.matchday,
      status:     m.status,
      updated_at: new Date().toISOString(),
    }));

    const upcoming = scheduledData.matches.map((m: any) => ({
      match_id:   m.id,
      home_team:  m.homeTeam.name,
      away_team:  m.awayTeam.name,
      match_date: m.utcDate,
      matchday:   m.matchday,
      status:     m.status,
      updated_at: new Date().toISOString(),
    }));

    const scorers = scorersData.scorers.map((s: any, i: number) => ({
      position:    i + 1,
      player_name: s.player.name,
      team_name:   s.team.name,
      team_abbr:   s.team.tla,
      goals:       s.goals,
      assists:     s.assists || 0,
      penalties:   s.penalties || 0,
      played:      s.playedMatches,
      updated_at:  new Date().toISOString(),
    }));

    // Upsert all tables
    await Promise.all([
      sb.from("pl_standings").upsert(standings, { onConflict: "position" }),
      sb.from("pl_results").upsert(results,     { onConflict: "match_id" }),
      sb.from("pl_fixtures").upsert(upcoming,   { onConflict: "match_id" }),
      sb.from("pl_scorers").upsert(scorers,     { onConflict: "position" }),
      sb.from("pl_meta").upsert(
        { id: 1, last_updated: new Date().toISOString(), season: "2025/26" }
      ),
    ]);

    console.log(`✅ Done — ${standings.length} teams, ${results.length} results, ${scorers.length} scorers`);

    return new Response(JSON.stringify({
      success:   true,
      standings: standings.length,
      results:   results.length,
      upcoming:  upcoming.length,
      scorers:   scorers.length,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("❌", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
