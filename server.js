/**
 * Pets Life Content Generator - Web Interface Server
 *
 * Simple web UI for generating affiliate content
 * Run: npm run ui
 * Open: http://localhost:3000
 */

import express from 'express';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Configuration
const CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  keywordsApiKey: process.env.KEYWORDS_EVERYWHERE_API_KEY,
  amazonTag: process.env.AMAZON_AFFILIATE_TAG || 'petslife-20',
  amazonAccessKey: process.env.AMAZON_ACCESS_KEY,
  amazonSecretKey: process.env.AMAZON_SECRET_KEY,
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/status
 * Check configuration and system status
 */
app.get('/api/status', async (req, res) => {
  const keywordResults = existsSync('./keyword-research-results.json');
  const published = getPublishedKeywords();

  let keywordCount = 0;
  if (keywordResults) {
    const data = JSON.parse(readFileSync('./keyword-research-results.json', 'utf8'));
    keywordCount = data.articleIdeas?.length || 0;
  }

  res.json({
    configured: {
      gemini: !!CONFIG.geminiApiKey,
      keywords: !!CONFIG.keywordsApiKey,
      amazon: !!CONFIG.amazonTag,
      amazonApi: !!(CONFIG.amazonAccessKey && CONFIG.amazonSecretKey),
    },
    keywords: {
      total: keywordCount,
      published: published.length,
      remaining: Math.max(0, keywordCount - published.length),
    },
    git: await checkGitStatus(),
  });
});

/**
 * POST /api/research
 * Run keyword research
 */
app.post('/api/research', async (req, res) => {
  try {
    if (!CONFIG.keywordsApiKey) {
      return res.status(400).json({ error: 'Keywords Everywhere API key not configured' });
    }

    res.json({ status: 'started', message: 'Running keyword research...' });

    // Run in background
    runKeywordResearch().then(results => {
      console.log('Keyword research completed:', results);
    }).catch(err => {
      console.error('Keyword research failed:', err);
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/keywords
 * Get keyword research results
 */
app.get('/api/keywords', (req, res) => {
  if (!existsSync('./keyword-research-results.json')) {
    return res.json({ keywords: [], message: 'No research data. Run keyword research first.' });
  }

  const data = JSON.parse(readFileSync('./keyword-research-results.json', 'utf8'));
  const published = getPublishedKeywords();

  const keywords = (data.articleIdeas || []).map(idea => ({
    ...idea,
    published: published.includes(idea.keyword),
  }));

  res.json({ keywords, total: keywords.length });
});

/**
 * POST /api/generate
 * Generate article for next keyword
 */
app.post('/api/generate', async (req, res) => {
  try {
    if (!CONFIG.geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to .env' });
    }

    // Get next keyword
    const ideas = loadKeywordData();
    const published = getPublishedKeywords();
    const keyword = selectNextKeyword(ideas, published);

    if (!keyword) {
      return res.status(404).json({ error: 'No unpublished keywords available' });
    }

    // Fetch Amazon products
    const products = await fetchAmazonProducts(keyword);

    // Generate article
    const content = await generateArticle(keyword, products);

    // Create file (but don't commit yet)
    const { filePath, title, slug } = createArticleFile(keyword, content, products);

    res.json({
      success: true,
      keyword: keyword.keyword,
      title,
      slug,
      filePath,
      content,
      products,
      wordCount: content.split(/\s+/).length,
      preview: content.substring(0, 500),
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/publish
 * Commit and push article to GitHub
 */
app.post('/api/publish', async (req, res) => {
  try {
    const { filePath, title } = req.body;

    if (!filePath || !title) {
      return res.status(400).json({ error: 'Missing filePath or title' });
    }

    // Git operations
    await execAsync(`git add "${filePath}"`);

    const commitMessage = `Add article: ${title}`;
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);

    await execAsync('git push');

    res.json({
      success: true,
      message: 'Article published to GitHub',
      deployment: 'Cloudflare Pages will auto-deploy in ~2 minutes',
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/articles
 * List published articles
 */
app.get('/api/articles', (req, res) => {
  const blogDir = './src/content/blog';
  if (!existsSync(blogDir)) {
    return res.json({ articles: [] });
  }

  const files = readdirSync(blogDir);
  const articles = files
    .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(file => {
      const content = readFileSync(`${blogDir}/${file}`, 'utf8');
      const frontmatterMatch = content.match(/---\n([\s\S]+?)\n---/);

      if (frontmatterMatch) {
        const fm = frontmatterMatch[1];
        const title = fm.match(/title:\s*"([^"]+)"/)?.[1] || file;
        const date = fm.match(/publishDate:\s*(\S+)/)?.[1] || '';
        const category = fm.match(/category:\s*(\S+)/)?.[1] || '';

        return {
          file,
          slug: file.replace('.md', ''),
          title,
          date,
          category,
        };
      }

      return { file, slug: file.replace('.md', ''), title: file };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  res.json({ articles, total: articles.length });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Run keyword research
 */
async function runKeywordResearch() {
  const SEED_KEYWORDS = [
    // Hamsters
    'best hamster wheel', 'silent hamster wheel', 'hamster cage setup',
    'dwarf hamster food', 'hamster bedding safe', 'hamster toys diy',
    'best hamster cage', 'hamster water bottle',

    // Guinea Pigs
    'guinea pig cage size', 'best guinea pig food', 'guinea pig fleece bedding',
    'guinea pig hay rack', 'guinea pig water bottle', 'guinea pig hideout',
    'c&c cage guinea pig', 'guinea pig vitamins',

    // Rabbits
    'best rabbit litter', 'rabbit hay feeder', 'indoor rabbit cage',
    'rabbit grooming tools', 'rabbit nail clippers', 'rabbit water bowl',
    'best rabbit pellets', 'rabbit chew toys',

    // Ferrets
    'ferret cage best', 'ferret hammock', 'ferret litter box',
    'ferret food high protein', 'ferret toys interactive', 'ferret harness leash',

    // Chinchillas
    'chinchilla dust bath', 'best chinchilla food', 'chinchilla cage multi level',
    'chinchilla chew toys', 'chinchilla cooling stone', 'chinchilla hay rack',

    // Birds
    'quiet bird species', 'best budgie cage', 'cockatiel food pellets',
    'parakeet toys', 'bird cage cover', 'bird perch natural',

    // Gerbils & Rats
    'gerbil cage setup', 'best gerbil bedding', 'best rat cage', 'rat hammock',
  ];

  const API_ENDPOINT = 'https://api.keywordseverywhere.com/v1/get_keyword_data';

  // Split into batches of 100
  const batches = [];
  for (let i = 0; i < SEED_KEYWORDS.length; i += 100) {
    batches.push(SEED_KEYWORDS.slice(i, i + 100));
  }

  let allOpportunities = [];

  for (const batch of batches) {
    // Keywords Everywhere expects form-encoded data
    const params = new URLSearchParams();
    params.append('country', 'us');
    params.append('currency', 'USD');
    params.append('dataSource', 'gkp');
    batch.forEach(kw => params.append('kw[]', kw));

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CONFIG.keywordsApiKey}`,
      },
      body: params,
    });

    const result = await response.json();

    // API returns data as an array of keyword objects
    for (const metrics of (result.data || [])) {
      const keyword = metrics.keyword;
      const volume = metrics.vol || 0;
      const competition = metrics.competition || 0;
      const cpc = parseFloat(metrics.cpc?.value || 0);

      // Skip zero-volume keywords
      if (volume === 0) continue;

      // Score: favor volume, reward lower competition, bonus for CPC (commercial intent)
      const opportunityScore = Math.round(
        (volume / 100) * (1.1 - competition) * (cpc > 0.2 ? 1.5 : 1) * 100
      ) / 100;

      allOpportunities.push({
        keyword,
        volume,
        competition,
        cpc,
        opportunityScore,
        difficulty: competition < 0.3 ? 'Very Easy' :
                   competition < 0.5 ? 'Easy' :
                   competition < 0.7 ? 'Medium' :
                   competition < 0.9 ? 'Hard' : 'Very Hard',
      });
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sort and generate article ideas
  allOpportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  const articleIdeas = allOpportunities.slice(0, 50).map(opp => {
    const keyword = opp.keyword;
    let title, type;

    if (keyword.includes('best')) {
      title = keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' 2026: Top 7 Picks';
      type = 'roundup';
    } else {
      const words = keyword.split(' ');
      title = `Best ${words.slice(1).join(' ')} for ${words[0]}s`.replace(/^\w/, c => c.toUpperCase());
      type = 'buying-guide';
    }

    return { title, keyword, type, ...opp };
  });

  // Save results
  const output = {
    generatedAt: new Date().toISOString(),
    totalKeywordsAnalyzed: SEED_KEYWORDS.length,
    opportunitiesFound: allOpportunities.length,
    topOpportunities: allOpportunities.slice(0, 50),
    articleIdeas,
  };

  writeFileSync('./keyword-research-results.json', JSON.stringify(output, null, 2));

  return output;
}

/**
 * Fetch Amazon products
 */
async function fetchAmazonProducts(keyword) {
  // If Amazon API is configured, use it
  if (CONFIG.amazonAccessKey && CONFIG.amazonSecretKey) {
    // TODO: Implement Amazon PA-API 5.0 integration
    // For now, return mock data
  }

  // Mock products for MVP
  const category = detectCategory(keyword.keyword);
  const mockProducts = [];

  for (let i = 1; i <= 7; i++) {
    mockProducts.push({
      asin: `B0${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      title: `${category} Product ${i} - Premium Quality`,
      price: (15 + Math.random() * 50).toFixed(2),
      rating: (4.0 + Math.random() * 0.8).toFixed(1),
      reviewCount: Math.floor(100 + Math.random() * 2000),
      imageUrl: `https://via.placeholder.com/400x400?text=Product+${i}`,
      features: [
        'High quality materials',
        'Perfect for small pets',
        'Easy to clean',
        'Durable construction',
      ],
      inStock: true,
    });
  }

  return mockProducts;
}

/**
 * Generate article with Gemini
 */
async function generateArticle(keyword, products) {
  const prompt = buildPrompt(keyword, products);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 16384,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Build article generation prompt
 */
function buildPrompt(keyword, products) {
  const category = detectCategory(keyword.keyword);

  return `You are writing a helpful, informative product review article for small pet owners.

TARGET KEYWORD: "${keyword.keyword}"
ARTICLE TYPE: ${keyword.type}
SEARCH VOLUME: ${keyword.volume}
CATEGORY: ${category}

PRODUCTS TO REVIEW:
${products.map((p, i) => `${i + 1}. ${p.title} - $${p.price} - ${p.rating}⭐ (${p.reviewCount} reviews) - ASIN: ${p.asin}`).join('\n')}

REQUIREMENTS:
- Write a comprehensive, SEO-optimized article (1,500-2,000 words)
- Target the keyword naturally (1-2% density)
- Include an engaging introduction
- Create a comparison table at the top with all products
- Review each product in detail with:
  * Key features
  * Pros and cons (use HTML: <div class="pros-cons"><div class="pros">...</div><div class="cons">...</div></div>)
  * Who it's best for
- Add a "Buying Guide" section
- Include FAQ (4-6 questions)
- Friendly, helpful tone (not promotional)
- Use H2/H3 headers
- Include affiliate button for each product using: <AffiliateButton asin="${products[0].asin}" productName="${products[0].title}" />
- End with conclusion and top pick

OUTPUT: Return ONLY the article content in markdown/HTML format. Start with H1 title. Do NOT include frontmatter.`;
}

/**
 * Create article file
 */
function createArticleFile(keyword, content, products) {
  const title = content.match(/^#\s+(.+)$/m)?.[1] || keyword.title;
  const slug = keyword.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const category = detectCategory(keyword.keyword);
  const publishDate = new Date().toISOString().split('T')[0];

  const contentWithoutH1 = content.replace(/^#\s+.+$/m, '').trim();

  const frontmatter = `---
title: "${title}"
description: "${title.substring(0, 155)}"
publishDate: ${publishDate}
category: ${category}
keywords: ["${keyword.keyword}"]
products: [${products.map(p => `"${p.asin}"`).join(', ')}]
author: "Pets Life Team"
featured: true
---

`;

  const fullContent = frontmatter + contentWithoutH1;
  const filePath = `./src/content/blog/${slug}.md`;

  writeFileSync(filePath, fullContent, 'utf8');

  return { filePath, title, slug };
}

/**
 * Helper functions
 */
function loadKeywordData() {
  if (!existsSync('./keyword-research-results.json')) return [];
  const data = JSON.parse(readFileSync('./keyword-research-results.json', 'utf8'));
  return data.articleIdeas || [];
}

function getPublishedKeywords() {
  const blogDir = './src/content/blog';
  if (!existsSync(blogDir)) return [];

  const files = readdirSync(blogDir);
  const published = new Set();

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const content = readFileSync(`${blogDir}/${file}`, 'utf8');
      const match = content.match(/keywords:\s*\["([^"]+)"/);
      if (match) published.add(match[1]);
    }
  });

  return Array.from(published);
}

function selectNextKeyword(ideas, published) {
  return ideas.find(idea => !published.includes(idea.keyword));
}

function detectCategory(keyword) {
  const lower = keyword.toLowerCase();
  if (lower.includes('hamster')) return 'Hamsters';
  if (lower.includes('guinea pig')) return 'Guinea Pigs';
  if (lower.includes('rabbit')) return 'Rabbits';
  if (lower.includes('ferret')) return 'Ferrets';
  if (lower.includes('chinchilla')) return 'Chinchillas';
  if (lower.includes('bird') || lower.includes('budgie') || lower.includes('parakeet')) return 'Birds';
  if (lower.includes('gerbil')) return 'Gerbils';
  if (lower.includes('rat')) return 'Rats';
  return 'Small Pets';
}

async function checkGitStatus() {
  try {
    const { stdout } = await execAsync('git status --porcelain');
    return {
      clean: stdout.trim() === '',
      hasChanges: stdout.trim() !== '',
    };
  } catch {
    return { clean: false, hasChanges: false, error: 'Not a git repository' };
  }
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║  🐹 Pets Life Content Generator                   ║
║                                                    ║
║  Web UI running at:                               ║
║  → http://localhost:${PORT}                          ║
║                                                    ║
║  Press Ctrl+C to stop                             ║
╚═══════════════════════════════════════════════════╝
  `);
});
