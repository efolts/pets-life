# 🎨 Web Interface Guide

**Simple click-based content generation - no terminal needed!**

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the web interface
npm run ui
```

Then open: **http://localhost:3000**

---

## What You'll See

### Beautiful Dashboard

```
╔═══════════════════════════════════════════════════╗
║  🐹 Pets Life Content Generator                   ║
║                                                    ║
║  Keywords Found: 50      Articles Published: 12   ║
║  Remaining Keywords: 38                           ║
╚═══════════════════════════════════════════════════╝

   [🔍 Run Keyword Research]
   [✍️ Generate Article]
   [🚀 Publish to GitHub]
```

### Three Simple Buttons

#### 1️⃣ Run Keyword Research
- **What it does**: Finds low-competition small pet keywords
- **How long**: ~1-2 minutes
- **When to use**: First time, then once a month
- **Result**: Shows table of 50+ keyword opportunities

#### 2️⃣ Generate Article
- **What it does**:
  - Selects next keyword
  - Fetches Amazon products (uses mock data for now)
  - Generates 1,500-2,000 word article via Claude
  - Shows preview
- **How long**: ~30-60 seconds
- **Result**: Full article preview with word count

#### 3️⃣ Publish to GitHub
- **What it does**:
  - Commits article to Git
  - Pushes to GitHub
  - Triggers Cloudflare Pages deploy
- **How long**: ~5 seconds
- **Result**: Live on pets-life.com in ~2 minutes

---

## Workflow Example

### First Time Setup

**1. Start the interface:**
```bash
npm run ui
```

**2. Click "Run Keyword Research"**
- Wait 1-2 minutes
- See status: "✓ Found 50 keyword opportunities!"
- View keywords table below

**3. Click "Generate Article"**
- Wait 30-60 seconds
- Preview appears showing:
  - Title: "Best Silent Hamster Wheel 2026: Top 7 Picks"
  - Keyword: "silent hamster wheel"
  - Word count: 1,847 words
  - Products: 7 products
  - Full article preview

**4. Review the article**
- Scroll through preview
- Check quality
- Verify products look good

**5. Click "Publish to GitHub"**
- Status: "✓ Published to GitHub!"
- Article will be live in ~2 minutes

---

## Weekly Routine

**Goal**: Publish 2 articles per week

### Sunday Morning (5 minutes)
1. Open http://localhost:3000
2. Click **"Generate Article"** ☕
3. Review preview
4. Click **"Publish to GitHub"** ✓
5. Done!

### Wednesday Evening (5 minutes)
1. Open http://localhost:3000
2. Click **"Generate Article"** 🍵
3. Review preview
4. Click **"Publish to GitHub"** ✓
5. Done!

**Result**: 8 articles/month, 96 articles/year

---

## Dashboard Features

### Live Stats
```
Keywords Found: 50
  ↳ Total keywords discovered from research

Articles Published: 12
  ↳ Total articles live on pets-life.com

Remaining Keywords: 38
  ↳ Keywords ready to generate articles for
```

### Keywords Table
Shows top 20 keywords with:
- **Keyword**: The search term
- **Volume**: Monthly searches
- **Competition**: 0-100% (lower is better)
- **Difficulty**: Very Easy / Easy / Medium
- **Status**: Ready or Published

### Published Articles
Lists your recent articles:
- Title
- Category (Hamsters, Guinea Pigs, etc.)
- Published date

---

## Article Preview

When you generate an article, you'll see:

### Header
- **Title**: "Best Silent Hamster Wheel 2026: Top 7 Picks"
- **Keyword**: "silent hamster wheel"
- **Word Count**: 1,847 words
- **Products**: 7 products included

### Preview Content
- Full article with formatting
- Product reviews
- Comparison tables
- Buying guide
- FAQ section

### What to Check
✅ Title makes sense
✅ Content is relevant
✅ Products are appropriate
✅ Word count is 1,500+
✅ Tone is helpful (not spammy)

---

## Configuration Status

The interface checks your `.env` setup and shows warnings if missing:

```
⚠️ Missing configuration: Claude API key, Amazon affiliate tag
Add to .env file.
```

**Required in `.env`:**
```
CLAUDE_API_KEY=sk-ant-xxx
KEYWORDS_EVERYWHERE_API_KEY=08903ba7d92a2afd7595
AMAZON_AFFILIATE_TAG=yourname-20
```

**Optional (for real Amazon products):**
```
AMAZON_ACCESS_KEY=your-access-key
AMAZON_SECRET_KEY=your-secret-key
```

---

## Behind the Scenes

### When you click "Run Keyword Research":
1. ✓ Queries Keywords Everywhere API with 70+ seed keywords
2. ✓ Analyzes search volume, competition, CPC
3. ✓ Filters for low-competition opportunities
4. ✓ Generates article title ideas
5. ✓ Saves to `keyword-research-results.json`
6. ✓ Updates dashboard

### When you click "Generate Article":
1. ✓ Selects next unpublished keyword
2. ✓ Fetches Amazon products (mock data for MVP)
3. ✓ Builds detailed prompt for Claude
4. ✓ Calls Claude API to generate article
5. ✓ Creates markdown file with frontmatter
6. ✓ Shows preview
7. ✓ Enables "Publish" button

### When you click "Publish to GitHub":
1. ✓ `git add` the new article file
2. ✓ `git commit` with descriptive message
3. ✓ `git push` to GitHub
4. ✓ Cloudflare Pages detects push
5. ✓ Rebuilds site (takes ~2 minutes)
6. ✓ Article is live!

---

## Editing Articles

If you want to edit before publishing:

1. **Generate the article** (don't click Publish yet)
2. **Open the file** in your editor:
   ```
   src/content/blog/[keyword-slug].md
   ```
3. **Make changes** (fix typos, adjust tone, etc.)
4. **Come back to UI** and click "Publish"

The edited version will be published!

---

## Troubleshooting

### "Missing configuration" warning
- **Fix**: Add API keys to `.env` file
- **Check**: Make sure `.env` exists and has correct keys

### "No keywords available" error
- **Fix**: Click "Run Keyword Research" first
- **Wait**: Takes 1-2 minutes to complete

### "Generation failed" error
- **Check**: Claude API key is valid
- **Check**: You have API credits
- **Try**: Run again (sometimes API hiccups)

### Publish button disabled
- **Reason**: No article generated yet
- **Fix**: Click "Generate Article" first

### Can't connect to localhost:3000
- **Check**: Server is running (`npm run ui`)
- **Check**: No other app using port 3000
- **Try**: Change port in `server.js`

---

## Advanced Features

### Real Amazon Products (Optional)

To fetch real products instead of mock data:

1. **Sign up** for Amazon Product Advertising API
   - https://affiliate-program.amazon.com/assoc_credentials/home

2. **Get credentials**:
   - Access Key
   - Secret Key

3. **Add to `.env`**:
   ```
   AMAZON_ACCESS_KEY=AKIA...
   AMAZON_SECRET_KEY=...
   ```

4. **Implement PA-API** in `server.js`
   - See `fetchAmazonProducts()` function
   - Replace mock data with real API calls

### Customizing Prompts

Edit article generation prompt in `server.js`:

```javascript
function buildPrompt(keyword, products) {
  // Customize this prompt to change:
  // - Article tone
  // - Content structure
  // - Word count
  // - Focus areas
}
```

### Changing Port

If port 3000 is busy:

Edit `server.js`:
```javascript
const PORT = 3001; // Change to any available port
```

---

## Cost Tracking

### Per Article Generated:
- **Keywords Everywhere**: ~$0.02 (one-time per keyword)
- **Claude API**: ~$0.60 (per article)
- **Total**: ~$0.62/article

### Monthly (8 articles):
- **~$5/month**

### Check Spending:
- **Claude**: https://console.anthropic.com/settings/billing
- **Keywords**: Check your Keywords Everywhere dashboard

---

## Tips for Success

### 1. Generate in Batches
- Set aside 30 minutes
- Generate 2-3 articles in one sitting
- Review all, then publish all

### 2. Review Quality
- Always preview before publishing
- Check for:
  - Natural language (not robotic)
  - Relevant products
  - Helpful advice
  - Proper formatting

### 3. Consistent Schedule
- Same days each week (e.g., Sunday & Wednesday)
- Set a reminder
- Make it a habit

### 4. Track Performance
After 1-2 months:
- Check Cloudflare Analytics
- See which articles get traffic
- Generate more content on those topics

### 5. Refresh Keywords Monthly
- Click "Run Keyword Research" once a month
- Finds new trending topics
- Keeps content fresh

---

## Keyboard Shortcuts

**Coming soon!** Future version will have:
- `Cmd/Ctrl + R` - Run research
- `Cmd/Ctrl + G` - Generate article
- `Cmd/Ctrl + P` - Publish
- `Cmd/Ctrl + K` - Show keywords

---

## Mobile Access

Want to generate on the go?

### Option 1: SSH + Port Forward
```bash
ssh -L 3000:localhost:3000 user@your-server
```

### Option 2: Deploy UI to Cloud
- Deploy `server.js` to Heroku/Railway
- Access from anywhere
- Add password protection!

---

## Support

**Interface not loading?**
- Check terminal for errors
- Make sure `npm install` completed
- Try: `npm install express`

**Buttons not working?**
- Check browser console (F12)
- Look for JavaScript errors
- Try refreshing page

**Need help?**
- Check `README.md` for full docs
- Review `server.js` for API endpoints
- All code is commented!

---

## What's Next?

Once you're comfortable with the UI:

1. **Scale up**: Generate 3-4 articles/week
2. **Monitor**: Check analytics monthly
3. **Optimize**: Focus on high-traffic topics
4. **Expand**: Add more pet categories
5. **Automate**: Set up cron job to generate automatically

---

**Enjoy your simple, powerful content generation interface!** 🐹✨

*Questions? Check the main README.md or server.js code comments.*
