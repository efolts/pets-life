# 🚀 Quick Start Guide

Get your autonomous affiliate site running in **15 minutes**.

## Prerequisites

- Node.js 18+ installed
- GitHub account
- Cloudflare account (free)
- API keys:
  - ✅ Keywords Everywhere: `08903ba7d92a2afd7595` (you have this)
  - Amazon Associates affiliate tag
  - Claude API key ([get here](https://console.anthropic.com/))

## Step-by-Step Setup

### 1. Install Dependencies (2 min)

```bash
cd pets-life-automation
npm install
```

### 2. Configure Environment (3 min)

Create `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```
KEYWORDS_EVERYWHERE_API_KEY=08903ba7d92a2afd7595
AMAZON_AFFILIATE_TAG=your-tag-20          # ← Add this
CLAUDE_API_KEY=sk-ant-xxx                # ← Add this
SITE_URL=https://pets-life.com
```

### 3. Run Keyword Research (2 min)

```bash
npm run research
```

This finds low-competition small pet keywords. You'll see output like:

```
🎯 TOP 10 KEYWORD OPPORTUNITIES:

Rank | Keyword                | Volume | Comp  | CPC
-----|------------------------|--------|-------|-----
   1 | silent hamster wheel   |   2100 |  0.15 | $1.20
   2 | best guinea pig cage   |   1800 |  0.22 | $0.95
   3 | rabbit hay feeder      |    890 |  0.12 | $0.75
```

Results saved to `keyword-research-results.json`.

### 4. Test Locally (2 min)

```bash
npm run dev
```

Open http://localhost:4321 - you'll see your site with the sample hamster wheel article.

### 5. Push to GitHub (2 min)

```bash
git init
git add .
git commit -m "Initial commit: Pets Life automation"
git remote add origin https://github.com/YOUR_USERNAME/pets-life.git
git push -u origin main
```

### 6. Deploy to Cloudflare Pages (3 min)

1. Go to https://dash.cloudflare.com/
2. Click **"Pages"** → **"Create a project"**
3. Connect GitHub and select your `pets-life` repo
4. Build settings:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **"Save and Deploy"**

Your site is now live! 🎉

### 7. Set Up Automation (3 min)

#### Option A: Cloudflare Workers (Recommended)

```bash
cd workers

# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "KV"

# Note the ID and update wrangler.toml

# Set secrets
wrangler secret put CLAUDE_API_KEY
# Paste your key when prompted

wrangler secret put GITHUB_TOKEN
# Create PAT at github.com/settings/tokens
# Paste when prompted

# Deploy worker
wrangler deploy
```

Worker will now run every Sunday at 2 AM UTC to generate content!

#### Option B: GitHub Actions (Alternative)

Add these secrets to your GitHub repo:
- Settings → Secrets → Actions → New repository secret

Add:
- `KEYWORDS_EVERYWHERE_API_KEY`: `08903ba7d92a2afd7595`
- `CLAUDE_API_KEY`: Your Claude API key
- `AMAZON_AFFILIATE_TAG`: Your affiliate tag

The workflow in `.github/workflows/content-generation.yml` will run automatically.

---

## ✅ You're Done!

Your site will now:
- 📝 Generate 1-2 articles every Sunday automatically
- 🔍 Target low-competition small pet keywords
- 📦 Include Amazon affiliate products
- 🚀 Auto-deploy to Cloudflare Pages

## What's Happening Automatically?

Every Sunday:
1. Cloudflare Worker (or GitHub Action) triggers
2. Selects next keyword from research data
3. Generates 1,500-2,000 word article via Claude
4. Commits to GitHub
5. Cloudflare Pages rebuilds and deploys

**Zero work required from you!**

## Monitor Your Site

**Check worker status:**
```bash
curl https://YOUR-WORKER.workers.dev/status
```

**View Cloudflare Pages:**
https://dash.cloudflare.com/ → Pages → Your Project

**Amazon Associates earnings:**
https://affiliate-program.amazon.com/home/reports

## Next Steps

1. **Week 1-2**: Monitor first few articles being published
2. **Week 3**: Check Cloudflare Analytics for traffic
3. **Week 4**: Review Amazon Associates for first clicks
4. **Month 2**: Refresh keyword research with new topics
5. **Month 3**: Scale up to 3-4 articles/week

## Troubleshooting

**No articles being generated?**
- Check worker logs: `wrangler tail`
- Verify secrets are set: `wrangler secret list`
- Manually trigger: See README

**Build failing?**
- Check Cloudflare Pages deployment logs
- Verify environment variables are set

**Low traffic?**
- Give it 2-3 months for SEO to work
- Refresh keyword research monthly
- Focus on long-tail, low-competition terms

## Cost Breakdown

- Cloudflare Pages: **FREE**
- Cloudflare Workers: **FREE** (within limits)
- Claude API: **~$25/month** (8 articles)
- Keywords Everywhere: **~$10/year**

**Total: ~$25-30/month**

Target revenue: $500+/month by Month 6

---

**Questions?** Check the full README.md for detailed docs.

**Ready to scale?** Once profitable, increase to 3-4 articles/week and expand to more pet categories!

🐹 Happy automated publishing! 🚀
