/**
 * Autonomous Content Generation Pipeline
 *
 * Runs the full article generation pipeline without user interaction:
 * 1. Check if keyword research is fresh (< 7 days); re-run if stale
 * 2. Select the next highest-scoring unpublished keyword
 * 3. Scrape real product data from Amazon + download images locally
 * 4. Generate article via Gemini 2.5 Flash
 * 5. Write .md file to src/content/blog/
 *
 * Exit codes:
 *   0 - Success (article generated OR nothing to do)
 *   1 - Error (API failure, missing config, etc.)
 *
 * Usage: node scripts/autonomous-generate.js
 *        npm run auto
 */

import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeAmazonProducts } from './lib/amazon-scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Load .env from project root (for local runs; GitHub Actions uses env secrets)
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

const CONFIG = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  keywordsApiKey: process.env.KEYWORDS_EVERYWHERE_API_KEY,
  amazonTag: process.env.AMAZON_AFFILIATE_TAG || 'petslife-20',
};

const KEYWORD_RESEARCH_FILE = path.join(PROJECT_ROOT, 'keyword-research-results.json');
const BLOG_DIR = path.join(PROJECT_ROOT, 'src/content/blog');
const IMAGE_DIR = path.join(PROJECT_ROOT, 'public/images/products');
const IMAGE_URL_PREFIX = '/images/products';
const KEYWORD_MAX_AGE_DAYS = 7;

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== Autonomous Content Generation ===\n');

  // Validate config
  if (!CONFIG.geminiApiKey) {
    console.error('ERROR: GEMINI_API_KEY is not set');
    process.exit(1);
  }

  // Step 1: Ensure keyword research is fresh
  await ensureKeywordResearch();

  // Step 2: Load keywords and find next unpublished one
  const ideas = loadKeywordData();
  if (ideas.length === 0) {
    console.error('ERROR: No keyword ideas found in research results');
    process.exit(1);
  }

  const published = getPublishedKeywords();
  const keyword = selectNextKeyword(ideas, published);

  if (!keyword) {
    console.log('Nothing to do: all keywords have been published.');
    console.log(`Published: ${published.length}/${ideas.length}`);
    process.exit(0);
  }

  console.log(`Selected keyword: "${keyword.keyword}" (score: ${keyword.opportunityScore})`);
  console.log(`Progress: ${published.length}/${ideas.length} published\n`);

  // Step 3: Fetch real Amazon products
  const products = await fetchProducts(keyword.keyword);
  console.log(`Fetched ${products.length} products from Amazon\n`);

  // Step 4: Generate article
  console.log('Generating article via Gemini...');
  const content = await generateArticle(keyword, products);
  console.log(`Generated ${content.split(/\s+/).length} words\n`);

  // Step 5: Write file
  const { filePath, title, slug } = createArticleFile(keyword, content, products);
  console.log(`Article written: ${filePath}`);
  console.log(`Title: ${title}`);
  console.log(`Slug: ${slug}`);
  console.log('\nDone. GitHub Actions will handle git commit/push.');
}

// ============================================================================
// AMAZON PRODUCT SCRAPING
// ============================================================================

async function fetchProducts(keyword) {
  try {
    const products = await scrapeAmazonProducts(keyword, {
      amazonTag: CONFIG.amazonTag,
      imageDir: IMAGE_DIR,
      imageUrlPrefix: IMAGE_URL_PREFIX,
      maxProducts: 7,
    });

    if (products.length === 0) {
      throw new Error('No products found');
    }

    return products;
  } catch (err) {
    console.error(`Amazon scrape failed: ${err.message}`);
    console.log('Cannot generate article without real product data.');
    process.exit(1);
  }
}

// ============================================================================
// KEYWORD RESEARCH
// ============================================================================

async function ensureKeywordResearch() {
  if (existsSync(KEYWORD_RESEARCH_FILE)) {
    const stat = statSync(KEYWORD_RESEARCH_FILE);
    const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageDays < KEYWORD_MAX_AGE_DAYS) {
      console.log(`Keyword research is fresh (${ageDays.toFixed(1)} days old)\n`);
      return;
    }
    console.log(`Keyword research is stale (${ageDays.toFixed(1)} days old)`);
  } else {
    console.log('No keyword research file found');
  }

  if (!CONFIG.keywordsApiKey) {
    if (existsSync(KEYWORD_RESEARCH_FILE)) {
      console.log('KEYWORDS_EVERYWHERE_API_KEY not set; using existing (stale) research\n');
      return;
    }
    console.error('ERROR: KEYWORDS_EVERYWHERE_API_KEY is not set and no research file exists');
    process.exit(1);
  }

  console.log('Running keyword research...');
  await runKeywordResearch();
  console.log('Keyword research complete\n');
}

async function runKeywordResearch() {
  // Long-tail, niche keywords with high ranking potential
  const SEED_KEYWORDS = [
    // Dogs — breed-specific food & nutrition
    'best dog food for pitbulls with sensitive stomachs',
    'best dog food for golden retrievers with allergies',
    'best dog food for german shepherds with hip problems',
    'best dog food for french bulldogs with gas',
    'best dog food for yorkies with picky eating',
    'best dog food for huskies with skin issues',
    'best dog food for dachshunds with back problems',
    'best dog food for chihuahuas with bad teeth',
    'best dog food for labrador puppies with diarrhea',
    'best dog food for boxers with grain allergies',
    'best dog food for bulldogs with yeast infections',
    'best dog food for shih tzu with tear stains',
    'best dog food for beagles that are overweight',
    'best dog food for great danes with bloat',
    'best dog food for poodles with sensitive skin',
    'best grain free dog food for dogs with itchy skin',
    'best limited ingredient dog food for allergies',
    'best high fiber dog food for anal gland problems',
    'best low sodium dog food for dogs with heart disease',
    'best dog food for senior dogs with kidney disease',
    'best dog food for diabetic dogs',
    'best dog food for dogs with liver problems',
    'best dog food for dogs with pancreatitis',

    // Dogs — breed-specific accessories & health
    'best harness for french bulldog that pulls',
    'best harness for dachshund with back problems',
    'best cooling vest for bulldogs in summer',
    'best dog bed for german shepherds with arthritis',
    'best dog bed for large dogs with hip dysplasia',
    'best joint supplement for large breed dogs',
    'best calming treats for dogs with separation anxiety',
    'best dog boots for hot pavement summer',
    'best dog stroller for senior dogs',
    'best slow feeder bowl for dogs that eat too fast',
    'best puzzle toys for bored dogs home alone',
    'best dog crate for separation anxiety',
    'best dog ramp for car for old dogs',
    'best dog life jacket for small dogs',
    'best flea treatment for dogs with sensitive skin',
    'best dog toothpaste for bad breath',
    'best dog shampoo for itchy skin and allergies',
    'best anti chew spray for puppies',

    // Cats — specific needs
    'best cat food for indoor cats that throw up',
    'best cat food for cats with urinary tract problems',
    'best cat food for senior cats with kidney disease',
    'best cat food for cats with ibd',
    'best wet cat food for cats with bad teeth',
    'best cat food for bengal cats',
    'best cat food for maine coon kittens',
    'best cat food for persian cats with flat faces',
    'best cat litter for cats with asthma',
    'best cat litter for multiple cats odor control',
    'best automatic litter box for large cats',
    'best litter box for senior cats with arthritis',
    'best cat tree for large cats that wont tip over',
    'best cat water fountain for cats that wont drink',
    'best calming collar for cats with anxiety',
    'best cat carrier for nervous cats',
    'best flea treatment for kittens under 12 weeks',
    'best cat brush for long hair cats that hate brushing',
    'best window perch for heavy cats',

    // Small Pets — niche specific
    'best silent hamster wheel for bedroom',
    'best cage for two guinea pigs together',
    'best hay for rabbits with sensitive digestion',
    'best bedding for hamsters with allergies',
    'best litter for rabbits that wont eat it',
    'best water bottle for guinea pigs that leaks',
    'best fleece liner for guinea pig c&c cage',
    'best exercise ball for dwarf hamsters',
    'best pellets for baby rabbits under 6 months',
    'best hideout for shy guinea pigs',

    // Fish & Aquarium — niche
    'best filter for 10 gallon betta fish tank',
    'best heater for 5 gallon betta tank',
    'best substrate for planted freshwater aquarium',
    'best light for growing aquarium plants',
    'best food for goldfish in outdoor pond',
    'best aquarium test kit for beginners',
    'best algae eater for small tanks',

    // Reptiles — niche
    'best uvb bulb for bearded dragon 40 gallon tank',
    'best substrate for leopard gecko',
    'best heat lamp for ball python enclosure',
    'best terrarium for crested gecko',
    'best calcium supplement for bearded dragons',
    'best fogger for chameleon cage humidity',

    // Birds — niche
    'best cage for two budgies together',
    'best pellet food for cockatiel',
    'best toys for parrots that pluck feathers',
    'best bird bath for parakeets',
    'best quiet pet bird for apartment',
    'best full spectrum light for pet birds',
  ];

  const API_ENDPOINT = 'https://api.keywordseverywhere.com/v1/get_keyword_data';

  const batches = [];
  for (let i = 0; i < SEED_KEYWORDS.length; i += 100) {
    batches.push(SEED_KEYWORDS.slice(i, i + 100));
  }

  let allOpportunities = [];

  for (const batch of batches) {
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

    for (const metrics of (result.data || [])) {
      const keyword = metrics.keyword;
      const volume = metrics.vol || 0;
      const competition = metrics.competition || 0;
      const cpc = parseFloat(metrics.cpc?.value || 0);
      const wordCount = keyword.split(/\s+/).length;

      // Must have proven search volume
      if (volume < 30) continue;
      // Must be long-tail (4+ words) — short keywords are too competitive
      if (wordCount < 4) continue;

      // Score: volume * niche bonus (more words = easier to rank) * commercial intent
      // GKP competition is PPC-only so we ignore it for SEO ranking potential
      const nicheMultiplier = wordCount >= 6 ? 2.0 : wordCount >= 5 ? 1.5 : 1.0;
      const cpcMultiplier = cpc > 0.5 ? 2.5 : cpc > 0.2 ? 1.5 : 1.0;
      const opportunityScore = Math.round(
        (volume / 50) * nicheMultiplier * cpcMultiplier * 100
      ) / 100;

      allOpportunities.push({
        keyword, volume, competition, cpc, opportunityScore, wordCount,
        difficulty: wordCount >= 6 ? 'Very Easy' :
                   wordCount >= 5 ? 'Easy' :
                   wordCount >= 4 ? 'Medium' : 'Hard',
      });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  allOpportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  const articleIdeas = allOpportunities.slice(0, 80).map(opp => {
    const keyword = opp.keyword;
    // For long-tail keywords, capitalize naturally and let Gemini refine the title
    const title = keyword.includes('best')
      ? keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' in 2026'
      : 'Best ' + keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' in 2026';
    const type = keyword.includes('best') ? 'roundup' : 'buying-guide';

    return { title, keyword, type, ...opp };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    totalKeywordsAnalyzed: SEED_KEYWORDS.length,
    opportunitiesFound: allOpportunities.length,
    topOpportunities: allOpportunities.slice(0, 80),
    articleIdeas,
  };

  writeFileSync(KEYWORD_RESEARCH_FILE, JSON.stringify(output, null, 2));
  console.log(`  Analyzed ${SEED_KEYWORDS.length} seeds → ${allOpportunities.length} low-competition opportunities`);
  return output;
}

// ============================================================================
// ARTICLE GENERATION
// ============================================================================

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

function buildPrompt(keyword, products) {
  const category = detectCategory(keyword.keyword);

  const productList = products.map((p, i) => {
    let entry = `${i + 1}. **${p.title}**\n`;
    entry += `   - ASIN: ${p.asin}\n`;
    entry += `   - Price: ${p.price}\n`;
    if (p.rating) entry += `   - Rating: ${p.rating}/5 (${p.reviewCount.toLocaleString()} reviews)\n`;
    if (p.brand) entry += `   - Brand: ${p.brand}\n`;
    if (p.isPrime) entry += `   - Prime eligible\n`;
    if (p.localImage) entry += `   - Image: ${p.localImage}\n`;
    entry += `   - Affiliate URL: ${p.affiliateUrl}\n`;
    if (p.features.length > 0) {
      entry += `   - Key features: ${p.features.slice(0, 5).join('; ')}\n`;
    }
    return entry;
  }).join('\n');

  return `You are writing a helpful, informative product review article for small pet owners.

TARGET KEYWORD: "${keyword.keyword}"
ARTICLE TYPE: ${keyword.type}
SEARCH VOLUME: ${keyword.volume}
CATEGORY: ${category}

PRODUCTS TO REVIEW:
${productList}

REQUIREMENTS:
- Write a comprehensive, SEO-optimized article (1,500-2,500 words)
- Target the keyword "${keyword.keyword}" naturally (1-2% density)
- Include an engaging introduction explaining why this product matters for pet owners
- Create a comparison table at the top with columns: Product Name, Price, Rating, Best For
- Review each product in detail with:
  * Key features and what makes it stand out
  * Pros and cons (use HTML: <div class="pros-cons"><div class="pros"><h4>Pros</h4><ul><li>...</li></ul></div><div class="cons"><h4>Cons</h4><ul><li>...</li></ul></div></div>)
  * Who it's best for
  * Product image using the EXACT local path provided: ![Product Name](local_image_path)
  * Affiliate link button: <AffiliateButton asin="PRODUCT_ASIN" productName="PRODUCT_NAME" />
- Use the ACTUAL product names, prices, features, and image paths provided above — do NOT invent or alter them
- Add a "Buying Guide" section with 3-5 key factors to consider
- Include FAQ section (4-6 questions with concise answers)
- Friendly, helpful, expert tone — like a knowledgeable pet owner giving advice
- Use H2 for main sections, H3 for individual product reviews
- End with a "Final Verdict" section naming your top pick and runner-up with reasons

OUTPUT: Return ONLY the article content in markdown/HTML format. Start with an H1 title. Do NOT include frontmatter (---).`;
}

// ============================================================================
// FILE CREATION
// ============================================================================

function createArticleFile(keyword, content, products) {
  const title = content.match(/^#\s+(.+)$/m)?.[1] || keyword.title;
  const slug = keyword.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const category = detectCategory(keyword.keyword);
  const publishDate = new Date().toISOString().split('T')[0];

  let contentWithoutH1 = content.replace(/^#\s+.+$/m, '').trim();

  // Convert markdown images to HTML <img> tags so Astro/Vite doesn't try to
  // resolve them as module imports. Also ensure paths are absolute.
  contentWithoutH1 = contentWithoutH1.replace(
    /!\[([^\]]*)\]\(([^)]*images\/products\/[^)]+)\)/g,
    (match, alt, src) => {
      const absSrc = src.startsWith('/') ? src : '/' + src;
      return `<img src="${absSrc}" alt="${alt}" loading="lazy" />`;
    }
  );

  // Build product metadata for frontmatter
  const productMeta = products.map(p => ({
    asin: p.asin,
    title: p.title,
    image: p.localImage || '',
    affiliateUrl: p.affiliateUrl || `https://www.amazon.com/dp/${p.asin}?tag=${CONFIG.amazonTag}`,
  }));

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${title.substring(0, 155).replace(/"/g, '\\"')}"
publishDate: ${publishDate}
category: ${category}
keywords: ["${keyword.keyword}"]
products: [${products.map(p => `"${p.asin}"`).join(', ')}]
amazonProducts:
${productMeta.map(p => `  - asin: "${p.asin}"
    title: "${p.title.replace(/"/g, '\\"')}"
    image: "${p.image}"
    url: "${p.affiliateUrl}"`).join('\n')}
author: "Pets Life Team"
featured: true
---

`;

  const fullContent = frontmatter + contentWithoutH1;

  if (!existsSync(BLOG_DIR)) {
    mkdirSync(BLOG_DIR, { recursive: true });
  }

  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  writeFileSync(filePath, fullContent, 'utf8');

  return { filePath, title, slug };
}

// ============================================================================
// HELPERS
// ============================================================================

function loadKeywordData() {
  if (!existsSync(KEYWORD_RESEARCH_FILE)) return [];
  const data = JSON.parse(readFileSync(KEYWORD_RESEARCH_FILE, 'utf8'));
  return data.articleIdeas || [];
}

function getPublishedKeywords() {
  if (!existsSync(BLOG_DIR)) return [];

  const files = readdirSync(BLOG_DIR);
  const published = new Set();

  files.forEach(file => {
    if (file.endsWith('.md') || file.endsWith('.mdx')) {
      const content = readFileSync(path.join(BLOG_DIR, file), 'utf8');
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
  // Dogs
  if (lower.includes('dog') || lower.includes('puppy') || lower.includes('pitbull') ||
      lower.includes('retriever') || lower.includes('shepherd') || lower.includes('bulldog') ||
      lower.includes('husky') || lower.includes('dachshund') || lower.includes('chihuahua') ||
      lower.includes('labrador') || lower.includes('boxer') || lower.includes('beagle') ||
      lower.includes('poodle') || lower.includes('yorkie') || lower.includes('dane') ||
      lower.includes('shih tzu')) return 'Dogs';
  // Cats
  if (lower.includes('cat') || lower.includes('kitten') || lower.includes('bengal') ||
      lower.includes('maine coon') || lower.includes('persian') || lower.includes('litter box') ||
      lower.includes('feline')) return 'Cats';
  // Fish & Aquarium
  if (lower.includes('fish') || lower.includes('betta') || lower.includes('aquarium') ||
      lower.includes('tank') || lower.includes('goldfish') || lower.includes('algae')) return 'Fish';
  // Reptiles
  if (lower.includes('reptile') || lower.includes('bearded dragon') || lower.includes('gecko') ||
      lower.includes('python') || lower.includes('chameleon') || lower.includes('terrarium') ||
      lower.includes('uvb')) return 'Reptiles';
  // Birds
  if (lower.includes('bird') || lower.includes('budgie') || lower.includes('parakeet') ||
      lower.includes('cockatiel') || lower.includes('parrot')) return 'Birds';
  // Small Pets
  if (lower.includes('hamster')) return 'Hamsters';
  if (lower.includes('guinea pig')) return 'Guinea Pigs';
  if (lower.includes('rabbit')) return 'Rabbits';
  if (lower.includes('ferret')) return 'Ferrets';
  if (lower.includes('chinchilla')) return 'Chinchillas';
  if (lower.includes('gerbil')) return 'Gerbils';
  if (lower.includes('rat')) return 'Rats';
  return 'Pets';
}

// ============================================================================
// RUN
// ============================================================================

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
