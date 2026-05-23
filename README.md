# FutbolBantz — Edge Functions (Fixed)

## Why you got that error

The error `entrypoint path does not exist` means the Supabase CLI
couldn't find `index.ts` inside the function folder. This happens when:
- You run `supabase functions deploy` from the wrong directory
- The `supabase/config.toml` file is missing
- The folder structure is wrong

This zip fixes all three.

---

## Correct folder structure (already set up for you)

```
futbolbantz-supabase/          ← run ALL commands from here
  supabase/
    config.toml                ← required by Supabase CLI
    functions/
      import_map.json          ← Deno module imports
      daily-articles/
        index.ts               ← article generation function
      refresh-pl-data/
        index.ts               ← PL data refresh function
    002_edge_functions.sql
    cron-schedules.sql
```

---

## Setup — exact commands in exact order

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Go into the project folder
```bash
cd futbolbantz-supabase
```
**Every command from here must be run inside this folder.**

### 3. Log in
```bash
supabase login
```
Opens a browser, click Authorize.

### 4. Link to your Supabase project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
Find your project ref: Supabase dashboard → Settings → General → Reference ID
Looks like: `abcdefghijklmnop`

When prompted for database password, enter the one you set when creating the project.

### 5. Deploy the functions
```bash
supabase functions deploy daily-articles
supabase functions deploy refresh-pl-data
```

You should see:
```
Bundling daily-articles
Deploying daily-articles... done.
```

### 6. Set your secrets
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase secrets set YOUTUBE_API_KEY=AIzaSy-your-key-here
```

The SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically —
you do NOT need to set those.

### 7. Test manually (optional but recommended)
```bash
supabase functions invoke daily-articles --no-verify-jwt
supabase functions invoke refresh-pl-data --no-verify-jwt
```

Check Supabase → Table Editor → articles to see new rows appear.

### 8. Run the SQL files
In Supabase → SQL Editor, paste and run:
1. `supabase/002_edge_functions.sql`
2. Then edit `supabase/cron-schedules.sql` — replace YOUR_PROJECT and YOUR_SERVICE_ROLE_KEY
   with real values — then run it

---

## Customise which channels generate articles

Edit line 14 in `supabase/functions/daily-articles/index.ts`:

```typescript
const CHANNELS = [
  { handle: "@SkySportsPL",    tag: "Match Report", tone: "banter"   },
  { handle: "@TheAnfieldWrap", tag: "Opinion",      tone: "fan"      },
  // Add your own channels here
];
```

Available tones: `banter` `serious` `tactical` `fan`
Available tags:  `Match Report` `Hot Take` `Banter` `Transfers` `Tactical` `Opinion`

Redeploy after editing:
```bash
supabase functions deploy daily-articles
```

---

## Check your functions in the dashboard

Supabase → Edge Functions → you'll see both functions listed with:
- Last invocation time
- Logs (click to view)
- Status

---

## Common errors

**"project-ref not found"**
→ Double check the ref in Settings → General. Copy it exactly.

**"Invalid JWT"**
→ Add `--no-verify-jwt` flag when invoking manually

**"ANTHROPIC_API_KEY not set"**
→ Run `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` again

**"relation articles does not exist"**
→ Run `001_schema.sql` first, then `002_edge_functions.sql`

**Articles not appearing on site**
→ Your site currently reads from localStorage, not Supabase.
   Articles ARE being saved to Supabase — check Table Editor → articles.
   To show them live on site, ask Claude to connect the frontend to Supabase.
