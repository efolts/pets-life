# 🚀 Local Generation Workflow

**Simple, controlled content creation on your machine**

## One-Time Setup (5 minutes)

### 1. Install Dependencies
```bash
cd pets-life-automation
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```bash
KEYWORDS_EVERYWHERE_API_KEY=08903ba7d92a2afd7595  # ✓ You have this
CLAUDE_API_KEY=sk-ant-xxx                         # ← Add your key
AMAZON_AFFILIATE_TAG=yourname-20                  # ← Your affiliate tag
SITE_URL=https://pets-life.com
```

### 3. Initialize Git & Deploy
```bash
# Initialize repository
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/pets-life.git
git push -u origin main

# Deploy to Cloudflare Pages (one-time)
# Go to: https://dash.cloudflare.com/
# Pages → Create Project → Connect GitHub
# Settings:
#   Framework: Astro
#   Build command: npm run build
#   Output: dist
```

---

## Weekly Workflow (2 commands)

### Step 1: Run Keyword Research (once a month)
```bash
npm run research
```

This finds low-competition keywords and saves them to `keyword-research-results.json`

**Output:**
```
🎯 TOP 10 KEYWORD OPPORTUNITIES:

Rank | Keyword                | Volume | Comp
-----|------------------------|--------|------
   1 | silent hamster wheel   |   2100 | 0.15
   2 | best guinea pig cage   |   1800 | 0.22
```

---

### Step 2: Generate Article (whenever you want)
```bash
npm run generate
```

**What happens:**

1. ✅ Selects next unpublished keyword
2. ✅ Generates 1,500-2,000 word article via Claude
3. ✅ Shows you a preview
4. ✅ Asks: "Publish this article to GitHub? (y/n)"

**Example output:**
```
╔═══════════════════════════════════════╗
║   🐹 Pets Life Article Generator      ║
║   One-Click Content Creation          ║
╚═══════════════════════════════════════╝

1️⃣ Loading keyword research data...
✓ Found 50 keywords, 3 already published

2️⃣ Selecting next keyword...
✓ Selected: "silent hamster wheel"
  Volume: 2100 | Competition: 0.15 | Score: 140

🤖 Generating article with Claude API...
ℹ Keyword: "silent hamster wheel"
ℹ Type: buying-guide
ℹ Volume: 2100 | Competition: 0.15

📄 Article Preview:
============================================================
# Best Silent Hamster Wheel 2026: Top 7 Quietest Picks

Is your hamster's wheel keeping you up at night? You're
not alone. Finding a quiet, safe hamster wheel that your
furry friend actually enjoys can be challenging...
============================================================
✓ Article generated: 1847 words

3️⃣ Creating article file...
✓ Created: ./src/content/blog/silent-hamster-wheel.md
ℹ URL will be: https://pets-life.com/blog/silent-hamster-wheel

📤 Publish this article to GitHub? (y/n):
```

**If you press `y`:**
```
📤 Publishing to GitHub...
✓ File staged
✓ Committed to local repository
✓ Pushed to GitHub

✨ Article published!
ℹ Cloudflare Pages will auto-deploy in ~2 minutes
ℹ Check: https://dash.cloudflare.com/

🎉 Done!
```

**If you press `n`:**
```
⚠ Article saved locally but not published
ℹ Review the file: ./src/content/blog/silent-hamster-wheel.md
ℹ To publish later, run: git add . && git commit -m "Add article" && git push
```

---

## How Often Should You Generate?

**Recommended:**
- Generate **2 articles per week** (Sunday & Wednesday)
- Run keyword research **once per month**

**Example schedule:**
```
Week 1: Sunday    → npm run generate (article 1)
        Wednesday → npm run generate (article 2)

Week 2: Sunday    → npm run generate (article 3)
        Wednesday → npm run generate (article 4)

Week 3: Sunday    → npm run generate (article 5)
        Wednesday → npm run generate (article 6)

Week 4: Sunday    → npm run generate (article 7)
        Wednesday → npm run generate (article 8)

Month 2: npm run research (refresh keywords)
```

**Result:** 8-10 articles per month, 50-60 articles in 6 months

---

## Reviewing Articles Before Publishing

The article is saved locally before you decide to publish. You can:

### 1. Preview in Editor
```bash
code src/content/blog/[article-name].md
```

### 2. Preview in Browser
```bash
npm run dev
# Open http://localhost:4321
```

### 3. Edit if Needed
- Fix typos
- Adjust tone
- Add personal insights
- Update product recommendations

### 4. Publish When Ready
```bash
git add .
git commit -m "Add article: [title]"
git push
```

Cloudflare Pages auto-deploys in ~2 minutes.

---

## Cost Breakdown

### Per Article:
- Claude API: **~$0.60** (1,800 words)
- Keywords Everywhere: **~$0.02** (one-time research)
- **Total: ~$0.62/article**

### Monthly (8 articles):
- Claude API: **~$5**
- Keywords Everywhere: **~$1/month** (if researching monthly)
- **Total: ~$6/month**

### Annual:
- **~$72/year** for 96 articles

Compare to:
- ❌ Hiring writers: $50-100 per article = $4,800-9,600/year
- ❌ Content services: $200-500/month = $2,400-6,000/year
- ✅ **Your cost: $72/year** 🎉

---

## Monitoring & Analytics

### Check Deployment Status
Visit: https://dash.cloudflare.com/ → Pages → Your Project

### View Traffic
Cloudflare Analytics (free):
- Page views
- Unique visitors
- Top pages
- Geographic distribution

### Amazon Earnings
Visit: https://affiliate-program.amazon.com/home/reports
- Clicks
- Conversions
- Revenue

---

## Tips for Success

### 1. Review Before Publishing
Even though Claude generates quality content, always:
- ✅ Check product names sound realistic
- ✅ Verify ASINs are placeholder format (you can replace with real ones)
- ✅ Ensure tone matches your brand
- ✅ Add personal touches if desired

### 2. Find Real Products (Optional)
After generation, you can:
1. Search Amazon for actual products
2. Replace placeholder ASINs with real ones
3. The affiliate links will work automatically

### 3. Optimize Over Time
- Track which articles get most traffic (Cloudflare Analytics)
- Generate more content on those topics
- Update old articles with new products

### 4. Build Internal Links
Every few articles, manually add links between related posts:
```markdown
Read our guide on [best hamster cages](../hamster-cage) too!
```

---

## Troubleshooting

### "CLAUDE_API_KEY not found"
- Add your API key to `.env` file
- Get one at: https://console.anthropic.com/

### "No keyword research data found"
- Run: `npm run research` first

### "No more unpublished keywords"
- Run: `npm run research` to find new keywords
- Or manually add keywords to the JSON file

### Git push fails
- Make sure you've set up GitHub remote
- Run: `git remote -v` to check
- If not set: `git remote add origin https://github.com/user/repo.git`

### Article looks wrong
- Edit the file in `src/content/blog/`
- Commit and push changes
- Cloudflare Pages will redeploy

---

## Advanced: Customizing Generation

### Change Article Length
Edit `scripts/generate-article.js`, line with max_tokens:
```javascript
max_tokens: 4000  // Increase to 6000 for longer articles
```

### Adjust Content Style
Edit the prompt in `buildPrompt()` function:
```javascript
- Write in a friendly, helpful tone
+ Write in a professional, authoritative tone
```

### Target Different Keywords
Edit `scripts/keyword-research.js`:
```javascript
const SEED_KEYWORDS = [
  'your custom keywords here',
  // ...
];
```

---

## Quick Reference

```bash
# Keyword research (monthly)
npm run research

# Generate article (weekly)
npm run generate

# Test locally
npm run dev

# Build for production
npm run build

# Manual publish (if you said 'n' earlier)
git add .
git commit -m "Add article"
git push
```

---

## Next Steps

1. ✅ Get your Claude API key
2. ✅ Run `npm run research`
3. ✅ Run `npm run generate`
4. ✅ Review the article
5. ✅ Press `y` to publish
6. 🎉 Watch it go live!

**Repeat step 3-5 twice a week for passive income growth!**

---

*Questions? Check the main README.md for detailed documentation.*
