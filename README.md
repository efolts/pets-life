# 🐹 Pets Life - Autonomous Affiliate Site

**Fully autonomous Amazon affiliate content system for pets-life.com**

This system automatically generates, optimizes, and publishes high-quality product reviews and buying guides for small pets (hamsters, guinea pigs, rabbits, ferrets, chinchillas, birds).

## 🎯 Features

✅ **Autonomous Content Generation** - Weekly automated article creation
✅ **AI-Powered Writing** - Claude 4.5 generates natural, helpful content
✅ **Keyword Research** - Keywords Everywhere API finds low-competition opportunities
✅ **Amazon Integration** - Auto-fetches products with affiliate links
✅ **SEO Optimized** - Schema markup, sitemaps, meta tags
✅ **Zero Maintenance** - Runs completely autonomously via Cloudflare Workers

## 🏗️ Architecture

```
Keywords Everywhere API → Find low-competition keywords
                ↓
Cloudflare Worker (Cron) → Generate content weekly
                ↓
Claude API → Write articles
                ↓
GitHub → Commit markdown files
                ↓
Cloudflare Pages → Auto-deploy static site
```

## 📦 Tech Stack

- **Frontend**: Astro (Static Site Generator)
- **Hosting**: Cloudflare Pages (Free)
- **Automation**: Cloudflare Workers (Cron triggers)
- **Content AI**: Claude 4.5 API
- **Keyword Research**: Keywords Everywhere API
- **Product Data**: Amazon Product Advertising API
- **Deployment**: GitHub → Cloudflare Pages

## 🚀 Setup Instructions

### 1. Clone and Install

```bash
cd pets-life-automation
npm install
```

### 2. Environment Setup

Create `.env` file:

```bash
cp .env.example .env
```

Fill in your API keys:

```
KEYWORDS_EVERYWHERE_API_KEY=08903ba7d92a2afd7595
AMAZON_AFFILIATE_TAG=your-tag-20
CLAUDE_API_KEY=your-claude-api-key
GITHUB_TOKEN=your-github-pat
GITHUB_REPO=yourusername/pets-life
SITE_URL=https://pets-life.com
```

### 3. Run Keyword Research

```bash
npm run research
```

This will:
- Query Keywords Everywhere API with small pet keywords
- Analyze competition and search volume
- Generate article ideas
- Save results to `keyword-research-results.json`

### 4. Test Locally

```bash
npm run dev
```

Visit `http://localhost:4321` to see your site.

### 5. Deploy to Cloudflare Pages

#### Option A: Connect GitHub (Recommended)

1. Push code to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Click "Create a project"
4. Connect your GitHub repo
5. Build settings:
   - **Framework**: Astro
   - **Build command**: `npm run build`
   - **Build output**: `/dist`
6. Add environment variables in Cloudflare dashboard

#### Option B: Manual Deploy

```bash
npm run build
npm run deploy
```

### 6. Set Up Cloudflare Worker

```bash
cd workers

# Create KV namespace
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview

# Create R2 bucket for images
wrangler r2 bucket create pets-life-images

# Update wrangler.toml with the IDs returned above

# Set secrets
wrangler secret put CLAUDE_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler secret put WORKER_AUTH_TOKEN
wrangler secret put AMAZON_AFFILIATE_TAG

# Deploy worker
wrangler deploy
```

### 7. Upload Keyword Data to KV

After running keyword research:

```bash
# Upload keyword opportunities to Worker KV
wrangler kv:key put --namespace-id=YOUR_KV_ID "keyword_opportunities" \
  --path=./keyword-research-results.json
```

### 8. Test Worker

Manual trigger:

```bash
curl -X POST https://pets-life-content-generator.YOUR_SUBDOMAIN.workers.dev/generate \
  -H "Authorization: Bearer YOUR_WORKER_AUTH_TOKEN"
```

Check status:

```bash
curl https://pets-life-content-generator.YOUR_SUBDOMAIN.workers.dev/status
```

## 📊 Workflow

### Automated Weekly Flow

1. **Sunday 2 AM UTC**: Cloudflare Worker cron triggers
2. **Keyword Selection**: Worker selects next unpublished keyword from KV
3. **Product Discovery**: Fetches Amazon products for that keyword
4. **Content Generation**: Claude API writes 1,500-2,000 word article
5. **Image Processing**: Downloads and optimizes product images
6. **Git Commit**: Pushes article markdown to GitHub
7. **Auto-Deploy**: Cloudflare Pages rebuilds and deploys

### Manual Operations

**Run keyword research:**
```bash
npm run research
```

**Manually trigger content generation:**
```bash
curl -X POST [worker-url]/generate -H "Authorization: Bearer [token]"
```

**Build and preview locally:**
```bash
npm run dev
```

## 📁 Project Structure

```
pets-life-automation/
├── src/
│   ├── content/
│   │   ├── blog/              # Article markdown files
│   │   └── config.ts          # Content schema
│   ├── layouts/
│   │   └── BlogPost.astro     # Article template
│   ├── components/
│   │   └── AffiliateButton.astro
│   ├── pages/
│   │   └── index.astro
│   └── config.ts              # Site configuration
├── workers/
│   └── content-generator.js   # Autonomous content worker
├── scripts/
│   └── keyword-research.js    # Keyword discovery script
├── astro.config.mjs
├── wrangler.toml
├── config.json
└── package.json
```

## 🎛️ Configuration

### Content Settings (`config.json`)

```json
{
  "content": {
    "schedule": {
      "cron": "0 2 * * 0",      // Sunday 2 AM UTC
      "articlesPerWeek": 2
    },
    "minWordCount": 1500,
    "maxWordCount": 2500
  },
  "targeting": {
    "keywordCriteria": {
      "maxCompetition": 0.3,     // Low competition only
      "minVolume": 100,          // Minimum search volume
      "maxVolume": 5000,         // Not too competitive
      "preferLongTail": true
    }
  }
}
```

### Amazon Affiliate Tag

Update in `.env`:
```
AMAZON_AFFILIATE_TAG=your-tag-20
```

### Cron Schedule

Modify in `wrangler.toml`:
```toml
[triggers]
crons = ["0 2 * * 0"]  # Sunday 2 AM UTC
# Increase frequency: ["0 2 * * 0,3"]  # Sunday & Wednesday
```

## 📈 Monitoring

### Check Worker Status

```bash
curl https://[worker-url]/status
```

Returns:
```json
{
  "status": "online",
  "lastRun": "2026-04-05T02:00:00Z",
  "articlesGenerated": 12
}
```

### View Logs

```bash
wrangler tail
```

### Cloudflare Analytics

View traffic stats in Cloudflare Pages dashboard.

## 🔧 Customization

### Add New Pet Categories

Edit `config.json`:

```json
{
  "targeting": {
    "petTypes": [
      "hamsters",
      "guinea pigs",
      "fish",          // Add new
      "reptiles"       // Add new
    ]
  }
}
```

### Modify Content Tone

Edit worker's Claude prompt in `workers/content-generator.js`:

```javascript
const prompt = `...
Write in a friendly, helpful tone (not overly promotional)
...`;
```

### Change Publishing Frequency

Increase to 2x per week:

```toml
crons = ["0 2 * * 0,3"]  # Sunday & Wednesday
```

```json
"articlesPerWeek": 4
```

## 🛡️ Amazon Associates Compliance

✅ **Affiliate disclosure on every page** (auto-included in layout)
✅ **Proper affiliate link format** (`?tag=yourtag-20`)
✅ **`rel="nofollow noopener sponsored"` on all affiliate links**
✅ **No price display** (uses "Check Current Price" CTAs)

## 💰 Cost Estimate

| Service | Usage | Cost |
|---------|-------|------|
| Cloudflare Pages | Unlimited requests | **$0** |
| Cloudflare Workers | 100k req/day free | **$0** |
| Cloudflare R2 | 10GB storage free | **$0** |
| Keywords Everywhere | Pay-per-use | **$10/yr** |
| Claude API | ~8 articles/month | **$20-30/mo** |
| Amazon PA-API | Free | **$0** |
| **Total** | | **~$25-35/mo** |

## 📝 Content Quality Checklist

The system automatically ensures:
- ✅ 1,500+ word count
- ✅ SEO-optimized headers (H1, H2, H3)
- ✅ Product comparison tables
- ✅ Pros/cons sections
- ✅ FAQ sections
- ✅ Buying guide tips
- ✅ Affiliate disclosures
- ✅ Schema markup
- ✅ Meta descriptions

## 🐛 Troubleshooting

### Worker not triggering

Check cron status:
```bash
wrangler tail
```

Manually trigger to test:
```bash
curl -X POST [worker-url]/generate -H "Authorization: Bearer [token]"
```

### Build failures

Check Cloudflare Pages deployment logs in dashboard.

Common issues:
- Missing environment variables
- Invalid markdown frontmatter
- Image paths not found

### Keyword research returns no results

- Verify Keywords Everywhere API key is valid
- Check API quota (may be exhausted)
- Ensure keywords are relevant (not too broad)

## 📚 Resources

- [Astro Documentation](https://docs.astro.build)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Keywords Everywhere API](https://keywordseverywhere.com/api-documentation.html)
- [Amazon Associates Program](https://affiliate-program.amazon.com/)
- [Claude API Documentation](https://docs.anthropic.com/)

## 🎓 Next Steps

1. ✅ Run keyword research
2. ✅ Deploy to Cloudflare Pages
3. ✅ Set up Worker with cron trigger
4. ✅ Upload keyword data to KV
5. ✅ Test manual content generation
6. 📈 Monitor traffic and revenue
7. 🔄 Refresh keyword research monthly
8. 📊 A/B test article formats

## 📞 Support

For issues with:
- **Cloudflare**: Check [Cloudflare Community](https://community.cloudflare.com/)
- **Astro**: See [Astro Discord](https://astro.build/chat)
- **Keywords Everywhere**: Contact their support
- **Amazon Associates**: Check [Associates Central](https://affiliate-program.amazon.com/help/operating)

---

**Built with ❤️ for small pet owners**

*Last updated: April 5, 2026*
