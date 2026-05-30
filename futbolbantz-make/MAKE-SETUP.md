# FutbolBantz — Make.com Setup Guide

## IMPORT THE BLUEPRINT

1. Go to **make.com** → log in
2. Click **Scenarios** in the left menu
3. Click **Create a new scenario**
4. Click the **three dots (...)** in the bottom toolbar
5. Click **Import Blueprint**
6. Upload `make-blueprint.json`
7. Click **Save**

You will see 8 modules appear on the canvas.

---

## CONFIGURE YOUR API KEYS

Click **Module 2 (Set Variables)** and fill in your real values:

| Variable | Where to get it |
|----------|----------------|
| `yt_key` | console.cloud.google.com → YouTube Data API v3 → Credentials |
| `anthropic_key` | console.anthropic.com → API Keys |
| `supabase_url` | Supabase → Settings → API → Project URL |
| `supabase_service_key` | Supabase → Settings → API → service_role key |
| `channel_handle` | e.g. `@SkySportsPL` |
| `article_tag` | `Match Report` or `Hot Take` or `Banter` etc |
| `article_tone` | `banter` or `serious` or `tactical` or `fan` |

---

## SET UP THE TRIGGER

Module 1 is a **Webhook** trigger. Make.com will give you a URL.

To run it on a schedule instead:
1. Delete Module 1
2. Click **+** → search **Schedule** → select **Scheduling**  
3. Set: Every 1 day at 08:00

To run it for multiple channels, **duplicate the scenario** (right-click → Clone) and change `channel_handle` in Module 2 for each copy.

---

## ADD THE SKIP FILTER (important)

Between Module 5 and Module 6, add a filter so it skips videos already in your database:

1. Click the **wrench icon** between Module 5 and Module 6
2. Set condition: `length({{5.data}})` **Equal to (number)** `0`
3. Label it: "Skip if already covered"

---

## TEST IT

1. Click **Run once** (bottom left)
2. Watch bubbles appear on each module — green = working
3. Click any bubble to see what data it processed
4. Check Supabase → Table Editor → articles for a new row

---

## ACTIVATE

Toggle the **ON/OFF switch** (bottom left) to ON.

The scenario will now run on your schedule automatically.

---

## RUN FOR MULTIPLE CHANNELS

Clone the scenario for each channel you want:
- Clone → change `channel_handle` to `@TheAnfieldWrap`, `article_tag` to `Opinion`
- Clone → change to `@aftv`, `article_tag` to `Banter`  
- Clone → change to `@TifoFootball`, `article_tag` to `Tactical`
- Clone → change to `@TalkSPORT`, `article_tag` to `Hot Take`

Schedule each clone 10 minutes apart (8:00, 8:10, 8:20...).

---

## WORLD CUP MODE (June 11 – July 19 2026)

Clone a scenario and change:
- `channel_handle` → `@FIFAWorldCup`
- `article_tag` → `World Cup`
- `article_tone` → `banter`

Add a date filter at the start:
- Condition A: `{{formatDate(now; "YYYY-MM-DD")}}` >= `2026-06-11`
- Condition B: `{{formatDate(now; "YYYY-MM-DD")}}` <= `2026-07-19`
- Both must pass (AND)

---

## COST

| Plan | Price | Operations | Articles/month |
|------|-------|-----------|----------------|
| Free | £0 | 1,000 | ~80 |
| Core | £9/mo | 10,000 | ~1,000 |

Each article uses ~12 operations.
5 channels daily = 150 articles/month = ~1,800 ops → **Core plan** recommended.
