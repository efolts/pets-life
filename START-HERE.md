# 🚀 START HERE - Getting Your Site Running

**Follow these steps to go from zero to publishing articles in 10 minutes!**

---

## Step 1: Install Everything (2 minutes)

```bash
cd /Users/data/pets-life-automation

# Install all dependencies
npm install
```

You should see:
```
✓ installed 250+ packages
```

---

## Step 2: Configure Your API Keys (3 minutes)

### Create your `.env` file:

```bash
cp .env.example .env
```

### Edit `.env` and add your keys:

```bash
# You already have this one ✓
KEYWORDS_EVERYWHERE_API_KEY=08903ba7d92a2afd7595

# Get from: https://console.anthropic.com/
CLAUDE_API_KEY=sk-ant-api03-YOUR-KEY-HERE

# Get from: https://affiliate-program.amazon.com/
AMAZON_AFFILIATE_TAG=yourname-20

# Your site info
SITE_URL=https://pets-life.com
SITE_NAME=Pets Life
```

### How to get Claude API key:

1. Go to https://console.anthropic.com/
2. Sign up / Log in
3. Click "API Keys"
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Paste into `.env`
7. Add payment method (you'll only pay ~$5/month)

### How to get Amazon Affiliate Tag:

1. Go to https://affiliate-program.amazon.com/
2. Sign up / Log in
3. Your tag is shown in the top right (format: `yourname-20`)
4. Paste into `.env`

---

## Step 3: Start the Web Interface (1 minute)

```bash
npm run ui
```

You'll see:
```
╔═══════════════════════════════════════════════════╗
║  🐹 Pets Life Content Generator                   ║
║                                                    ║
║  Web UI running at:                               ║
║  → http://localhost:3000                          ║
║                                                    ║
║  Press Ctrl+C to stop                             ║
╚═══════════════════════════════════════════════════╝
```

**Open your browser:** http://localhost:3000

---

## Step 4: Generate Your First Article (4 minutes)

### What you'll see:

```
┌─────────────────────────────────────────────────┐
│  🐹 Pets Life Content Generator                 │
│  One-Click Affiliate Content Creation           │
└─────────────────────────────────────────────────┘

  Keywords Found: 0
  Articles Published: 0
  Remaining Keywords: 0

  [🔍 Run Keyword Research]  (click this first!)
  [✍️ Generate Article]      (disabled - need keywords first)
  [🚀 Publish to GitHub]     (disabled - need article first)
```

### 4a. Click "Run Keyword Research"

- Status will show: "🔍 Running keyword research... This may take 1-2 minutes."
- Wait...
- Success: "✓ Found 50 keyword opportunities!"
- Dashboard updates to show 50 keywords

### 4b. Click "Generate Article"

- Status: "✍️ Generating article with Claude API... This takes ~30-60 seconds."
- Wait while Claude writes your article...
- Preview appears showing:
  ```
  Title: Best Silent Hamster Wheel 2026: Top 7 Picks
  Keyword: "silent hamster wheel"
  Word Count: 1,847 words
  Products: 7 products

  [Preview of full article...]
  ```

### 4c. Review the Article

Scroll through the preview. Check:
- ✅ Title makes sense
- ✅ Content is helpful
- ✅ Products look reasonable
- ✅ No weird errors

### 4d. Click "Publish to GitHub"

- Status: "🚀 Publishing to GitHub..."
- Success: "✓ Published to GitHub! Cloudflare Pages will auto-deploy in ~2 minutes."

---

## Step 5: Deploy to Cloudflare Pages (One-Time Setup)

### 5a. Push to GitHub (if you haven't already)

```bash
# Initialize git (if needed)
git init
git add .
git commit -m "Initial commit: Pets Life automation"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/pets-life.git
git push -u origin main
```

### 5b. Connect to Cloudflare Pages

1. Go to https://dash.cloudflare.com/
2. Click **"Pages"** → **"Create a project"**
3. **Connect GitHub** and select your `pets-life` repository
4. **Build settings**:
   ```
   Framework preset: Astro
   Build command: npm run build
   Build output directory: dist
   ```
5. Click **"Save and Deploy"**

**Your site is live!** 🎉

Cloudflare gives you a URL like: `pets-life.pages.dev`

### 5c. Add Custom Domain (Optional)

1. In Cloudflare Pages → Your Project → **"Custom domains"**
2. Click **"Set up a custom domain"**
3. Enter: `pets-life.com`
4. Follow DNS instructions
5. Done! Your site is at https://pets-life.com

---

## ✅ You're Done!

### What You Have Now:

✅ Web interface at http://localhost:3000
✅ 50 keywords ready to generate
✅ 1 article published
✅ Site live on Cloudflare Pages
✅ Auto-deploys when you push to GitHub

### Your Weekly Workflow:

**Every Sunday & Wednesday (5 min each):**

1. Open http://localhost:3000
2. Click "Generate Article"
3. Review preview
4. Click "Publish to GitHub"
5. Done! Live in 2 minutes.

**Result:** 8 articles/month, 96 articles/year

---

## Monitoring Your Success

### After 1 Week:
- Check Cloudflare Analytics
- See initial page views
- Monitor for any errors

### After 1 Month:
- 8 articles published
- Check Google Search Console
- See which keywords ranking
- Amazon Associates: Check for first clicks

### After 3 Months:
- 24 articles published
- Should see steady organic traffic
- First affiliate conversions
- Adjust strategy based on what's working

### After 6 Months:
- 48 articles published
- Target: 10,000+ monthly visitors
- Target: $500+/month revenue
- Scale up to 3-4 articles/week if profitable

---

## Common Questions

### Do I need to leave the UI running all the time?

**No!** Only run it when you want to generate articles.

Start: `npm run ui`
Generate articles
Stop: `Ctrl+C`

### Can I edit articles before publishing?

**Yes!** After clicking "Generate Article":

1. Don't click Publish yet
2. Open `src/content/blog/[article-name].md` in your editor
3. Make changes
4. Save
5. Go back to UI and click "Publish"

### What if I run out of keywords?

Click "Run Keyword Research" again! It will find new opportunities.

Do this monthly to keep fresh keywords coming.

### How much does this cost?

**Monthly costs (8 articles):**
- Claude API: ~$5
- Keywords Everywhere: ~$1
- Cloudflare: FREE
- GitHub: FREE
- **Total: ~$6/month**

**Revenue target:** $500+/month by Month 6

### Can I generate more than 2 articles per week?

**Yes!** Just click "Generate Article" more times.

Recommended schedule:
- Beginner: 2/week (8/month)
- Intermediate: 3/week (12/month)
- Advanced: 4/week (16/month)

### What if the article quality is bad?

Try:
1. Generate again (sometimes Claude has off days)
2. Edit the article before publishing
3. Adjust the prompt in `server.js`

### How do I add real Amazon products?

For MVP, we use mock products. To add real ones:

1. Sign up for Amazon Product Advertising API
2. Get Access Key + Secret Key
3. Add to `.env`:
   ```
   AMAZON_ACCESS_KEY=...
   AMAZON_SECRET_KEY=...
   ```
4. Implement PA-API in `server.js` (see TODO comments)

For now, you can manually:
1. Search Amazon after generating
2. Replace ASINs in the article
3. Publish

---

## Next Steps

### Today:
- ✅ Generate 1-2 more articles
- ✅ Get comfortable with the UI

### This Week:
- ✅ Set up regular schedule (Sunday & Wednesday)
- ✅ Connect to Cloudflare Pages
- ✅ Add custom domain (optional)

### This Month:
- ✅ Publish 8 articles
- ✅ Set up Google Search Console
- ✅ Monitor traffic in Cloudflare Analytics
- ✅ Check Amazon Associates dashboard

### Month 2:
- ✅ Run keyword research again (fresh keywords)
- ✅ Review which articles getting traffic
- ✅ Generate more on popular topics
- ✅ First affiliate revenue!

---

## Troubleshooting

### "Module not found" error
```bash
npm install
```

### "CLAUDE_API_KEY not found"
- Check `.env` file exists
- Make sure key starts with `sk-ant-`
- No spaces around the `=` sign

### Port 3000 already in use
Edit `server.js`:
```javascript
const PORT = 3001; // Change to 3001 or any open port
```

### Git push rejected
```bash
git pull origin main --rebase
git push
```

### Can't connect to GitHub
- Check internet connection
- Make sure GitHub remote is set: `git remote -v`
- Check GitHub credentials

---

## Getting Help

📚 **Full Documentation:**
- `README.md` - Complete technical docs
- `UI-GUIDE.md` - Detailed UI guide
- `LOCAL-WORKFLOW.md` - Command-line workflow

💬 **Code Comments:**
- `server.js` - All API endpoints explained
- `scripts/generate-article.js` - Generation logic

🐛 **Common Issues:**
- Check the console when running `npm run ui`
- Browser console (F12) for frontend errors
- All error messages are descriptive

---

## 🎉 Congratulations!

You now have a fully functional autonomous affiliate content system!

**Remember:**
- Quality over quantity
- Review before publishing
- Monitor what works
- Scale gradually

**Your goal:** Passive income with minimal ongoing work!

---

**Questions?** Everything is documented. Check the files above or review the code - it's all commented!

**Ready to scale?** Once profitable, increase frequency and expand categories!

🐹 **Happy publishing!** 🚀
