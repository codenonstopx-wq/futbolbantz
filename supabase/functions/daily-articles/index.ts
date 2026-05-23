// daily-articles/index.ts
// Supabase Edge Function — runs every morning at 8am UTC
// Fetches latest YouTube videos → generates articles via Claude → saves to DB

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const YT_KEY        = Deno.env.get("YOUTUBE_API_KEY")!;
const SB_URL        = Deno.env.get("SUPABASE_URL")!;
const SB_KEY        = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SB_URL, SB_KEY);

// ── EDIT THIS LIST to change which channels get articles generated ─────────────
const CHANNELS = [
  { handle: "@TheBig6ix",      tag: "Match Report", tone: "fan"   },
  { handle: "@TheAnfieldWrap",   tag: "Opinion",      tone: "fan"      },
  { handle: "@drsportsmedia",             tag: "Banter",       tone: "fan"   },
  { handle: "@matissearmani",     tag: "Tactical",     tone: "banter" },
  { handle: "@thatsfootball",        tag: "Hot Take",     tone: "banter"   },
  { handle: "@TheUnitedStand",   tag: "Opinion",      tone: "fan"      },
  { handle: "@HenryTalksFootball",          tag: "Match Report", tone: "serious"  },
  { handle: "@ExpressionsOozing",          tag: "Match Report", tone: "banter"  },
  { handle: "@FootballTerrace",          tag: "Match Report", tone: "fan"  },
  { handle: "@Its-LB",          tag: "Match Report", tone: "fan"  },
];

// ── Resolve YouTube handle → channel ID ───────────────────────────────────────
async function resolveChannel(handle: string) {
  const h = handle.startsWith("@") ? handle : "@" + handle;
  const res  = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(h)}&key=${YT_KEY}`
  );
  const data = await res.json();
  if (!data.items?.length) return null;
  return { id: data.items[0].id, name: data.items[0].snippet.title };
}

// ── Get latest video from channel ─────────────────────────────────────────────
async function getLatestVideo(channelId: string, channelName: string) {
  const chanRes  = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_KEY}`
  );
  const chanData = await chanRes.json();
  const uploadsId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return null;

  const vidRes  = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=1&key=${YT_KEY}`
  );
  const vidData = await vidRes.json();
  const item    = vidData.items?.[0];
  if (!item) return null;

  return {
    videoId:     item.snippet.resourceId.videoId,
    title:       item.snippet.title,
    description: (item.snippet.description || "").substring(0, 600),
    thumbnail:   item.snippet.thumbnails?.medium?.url || "",
    publishedAt: item.snippet.publishedAt,
    channelName,
    url: `https://youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
  };
}

// ── Check if video already has an article ─────────────────────────────────────
async function alreadyCovered(videoId: string) {
  const { data } = await sb
    .from("articles")
    .select("id")
    .eq("video_url", `https://youtube.com/watch?v=${videoId}`)
    .limit(1);
  return (data?.length || 0) > 0;
}

// ── Generate article via Claude ───────────────────────────────────────────────
async function generateArticle(video: any, tag: string, tone: string) {
  const tones: Record<string, string> = {
    banter:   "witty banter with Premier League humour and personality",
    serious:  "serious football journalism with insight and analysis",
    tactical: "tactical deep-dive with formations and pressing patterns",
    fan:      "passionate supporter perspective — emotional and authentic",
  };

  const prompt = `You are FutbolBantz, Britain's most entertaining Premier League blog.

Write a fully SEO-optimised article based on this YouTube video:
Channel: ${video.channelName}
Title: "${video.title}"
Description: "${video.description}"
URL: ${video.url}

Tone: ${tones[tone] || tones.banter}
Length: 400-600 words

Return ONLY valid JSON, no markdown fences:
{
  "title": "50-60 char SEO headline with primary keyword",
  "slug": "url-slug-3-to-6-words",
  "tag": "${tag}",
  "focusKeyword": "2-4 word keyword phrase",
  "secondaryKeywords": ["kw2","kw3","kw4"],
  "metaDescription": "140-155 char description ending with a CTA",
  "summary": "Two punchy lede sentences.",
  "keypoints": ["Point 1","Point 2","Point 3","Point 4","Point 5"],
  "conclusion": "One killer closing line.",
  "fullBody": "<h2>Subheading</h2><p>Body text with <strong>key terms</strong>...</p>",
  "readTimeMinutes": 4,
  "faqSchema": [
    {"question":"Q1?","answer":"A1 under 50 words."},
    {"question":"Q2?","answer":"A2."},
    {"question":"Q3?","answer":"A3."}
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 2000,
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);

  const data = await res.json();
  let raw = data.content?.map((b: any) => b.type === "text" ? b.text : "").join("") || "";
  raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  // Close any truncated JSON
  const opens  = (raw.match(/\{/g) || []).length;
  const closes = (raw.match(/\}/g) || []).length;
  for (let i = 0; i < opens - closes; i++) raw += "}";

  return JSON.parse(raw);
}

// ── Save to Supabase ──────────────────────────────────────────────────────────
async function saveArticle(article: any, video: any) {
  const slug = article.slug ||
    article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

  const { error } = await sb.from("articles").insert({
    title:              article.title,
    slug,
    tag:                article.tag,
    channel:            video.channelName,
    video_url:          video.url,
    thumbnail:          video.thumbnail,
    summary:            article.summary,
    full_body:          article.fullBody,
    keypoints:          article.keypoints,
    conclusion:         article.conclusion,
    focus_keyword:      article.focusKeyword,
    secondary_keywords: article.secondaryKeywords,
    meta_description:   article.metaDescription,
    faq_schema:         article.faqSchema,
    breadcrumb:         ["Home", article.tag],
    read_time_minutes:  article.readTimeMinutes || 4,
    published:          true,
    views:              0,
  });

  if (error) throw new Error(`DB insert failed: ${error.message}`);
  console.log(`  ✅ Saved: "${article.title}"`);
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (_req) => {
  console.log(`🚀 daily-articles starting — ${new Date().toUTCString()}`);

  let generated = 0;
  const errors: string[] = [];

  for (const ch of CHANNELS) {
    try {
      console.log(`\n📡 ${ch.handle}`);

      const channel = await resolveChannel(ch.handle);
      if (!channel) { errors.push(`Cannot resolve: ${ch.handle}`); continue; }

      const video = await getLatestVideo(channel.id, channel.name);
      if (!video) { console.log("  No videos found"); continue; }

      const done = await alreadyCovered(video.videoId);
      if (done) { console.log(`  Already covered: "${video.title}"`); continue; }

      console.log(`  Generating: "${video.title}"`);
      const article = await generateArticle(video, ch.tag, ch.tone);
      await saveArticle(article, video);
      generated++;

      // Rate limit — 2 seconds between Claude calls
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      const msg = `${ch.handle}: ${(err as Error).message}`;
      console.error(`  ❌ ${msg}`);
      errors.push(msg);
    }
  }

  // Log run
  await sb.from("function_runs").upsert({
    function_name:      "daily-articles",
    last_run:           new Date().toISOString(),
    articles_generated: generated,
    errors,
  }, { onConflict: "function_name" });

  console.log(`\n🏆 Done — ${generated} articles generated, ${errors.length} errors`);

  return new Response(JSON.stringify({ success: true, generated, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
