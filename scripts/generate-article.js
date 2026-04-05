#!/usr/bin/env node
/**
 * One-Click Article Generator
 *
 * Usage: npm run generate
 *
 * 1. Selects next keyword from research
 * 2. Generates article via Claude API
 * 3. Creates markdown file
 * 4. Shows preview
 * 5. Asks if you want to publish
 * 6. Commits and pushes to GitHub (auto-deploys)
 */

import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

dotenv.config();

const execAsync = promisify(exec);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AMAZON_AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'petslife-20';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
};

/**
 * Load keyword research data
 */
function loadKeywordData() {
  if (!existsSync('./keyword-research-results.json')) {
    log.error('No keyword research data found!');
    log.info('Run: npm run research');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync('./keyword-research-results.json', 'utf8'));
  return data.articleIdeas || [];
}

/**
 * Get list of already published keywords
 */
function getPublishedKeywords() {
  const blogDir = './src/content/blog';
  if (!existsSync(blogDir)) {
    return [];
  }

  const files = readdirSync(blogDir);
  const published = new Set();

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const content = readFileSync(`${blogDir}/${file}`, 'utf8');
      const keywordMatch = content.match(/keywords:\s*\["([^"]+)"/);
      if (keywordMatch) {
        published.add(keywordMatch[1]);
      }
    }
  });

  return Array.from(published);
}

/**
 * Select next unpublished keyword
 */
function selectNextKeyword(ideas, published) {
  const unpublished = ideas.filter(idea => !published.includes(idea.keyword));

  if (unpublished.length === 0) {
    log.error('No more unpublished keywords!');
    log.info('Run keyword research again: npm run research');
    process.exit(1);
  }

  return unpublished[0];
}

/**
 * Generate article content using Gemini API
 */
async function generateArticle(keyword) {
  log.step('🤖 Generating article with Gemini API...');
  log.info(`Keyword: "${keyword.keyword}"`);
  log.info(`Type: ${keyword.type}`);
  log.info(`Volume: ${keyword.volume} | Competition: ${keyword.competition.toFixed(2)}`);

  const prompt = buildPrompt(keyword);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
function buildPrompt(keyword) {
  const category = detectCategory(keyword.keyword);

  return `You are writing a helpful, informative product review article for small pet owners.

TARGET KEYWORD: "${keyword.keyword}"
ARTICLE TYPE: ${keyword.type}
SEARCH VOLUME: ${keyword.volume}
CATEGORY: ${category}

REQUIREMENTS:
- Write a comprehensive, SEO-optimized article (1,500-2,000 words)
- Target the keyword naturally throughout (aim for 1-2% keyword density)
- Include an engaging introduction explaining what readers will learn
- Create a comparison table at the top with 5-7 products
- Review each product in detail with:
  - Key features
  - Pros and cons
  - Who it's best for
  - Price range (e.g., "$20-30" - not exact prices)
- Add a "Buying Guide" section with helpful tips
- Include an FAQ section (4-6 questions)
- Write in a friendly, helpful tone (not overly promotional)
- Use proper markdown formatting with H2/H3 headers
- Include clear calls-to-action like "Check Current Price on Amazon"
- End with a conclusion recommending the best overall pick
- Use bullet points and short paragraphs for readability

PRODUCT SELECTION GUIDELINES:
- Include 5-7 products at different price points
- Mix of budget, mid-range, and premium options
- Make up realistic product names (e.g., "PetSafe Silent Spinner", "Kaytee Comfort Wheel")
- Use placeholder ASINs (B0XXXXXXXX format)
- Include realistic ratings (4.0-4.8 stars) and review counts

IMPORTANT - AFFILIATE BUTTONS:
For each product, include this exact component syntax:
<AffiliateButton asin="B0XXXXXXXX" productName="Product Name Here" />

OUTPUT FORMAT:
Return ONLY the article content in markdown format.
Start with an H1 title (# Title Here)
Do NOT include frontmatter - just the article content.
Do NOT include any explanations outside the article.

Begin the article now:`;
}

/**
 * Detect category from keyword
 */
function detectCategory(keyword) {
  const lower = keyword.toLowerCase();
  if (lower.includes('hamster')) return 'Hamsters';
  if (lower.includes('guinea pig')) return 'Guinea Pigs';
  if (lower.includes('rabbit') || lower.includes('bunny')) return 'Rabbits';
  if (lower.includes('ferret')) return 'Ferrets';
  if (lower.includes('chinchilla')) return 'Chinchillas';
  if (lower.includes('bird') || lower.includes('budgie') || lower.includes('parakeet') || lower.includes('cockatiel')) return 'Birds';
  if (lower.includes('gerbil')) return 'Gerbils';
  if (lower.includes('rat')) return 'Rats';
  if (lower.includes('mouse') || lower.includes('mice')) return 'Mice';
  return 'Small Pets';
}

/**
 * Extract title from content
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Untitled Article';
}

/**
 * Create article file
 */
function createArticleFile(keyword, content) {
  const title = extractTitle(content);
  const slug = keyword.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const category = detectCategory(keyword.keyword);
  const publishDate = new Date().toISOString().split('T')[0];

  // Remove the H1 title from content (we'll add it via frontmatter)
  const contentWithoutH1 = content.replace(/^#\s+.+$/m, '').trim();

  const frontmatter = `---
title: "${title}"
description: "${title.substring(0, 155)}"
publishDate: ${publishDate}
category: ${category}
keywords: ["${keyword.keyword}"]
products: []
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
 * Show preview
 */
function showPreview(content, wordCount) {
  log.step('📄 Article Preview:');
  console.log(colors.bright + '='.repeat(60) + colors.reset);

  // Show first 500 characters
  const preview = content.substring(0, 500);
  console.log(preview + '...\n');

  console.log(colors.bright + '='.repeat(60) + colors.reset);
  log.success(`Article generated: ${wordCount} words`);
}

/**
 * Ask user if they want to publish
 */
async function askToPublish() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n📤 Publish this article to GitHub? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Commit and push to GitHub
 */
async function publishToGitHub(filePath, title) {
  log.step('📤 Publishing to GitHub...');

  try {
    // Git add
    await execAsync(`git add "${filePath}"`);
    log.success('File staged');

    // Git commit
    const commitMessage = `Add article: ${title}`;
    await execAsync(`git commit -m "${commitMessage}"`);
    log.success('Committed to local repository');

    // Git push
    await execAsync('git push');
    log.success('Pushed to GitHub');

    log.step('✨ Article published!');
    log.info('Cloudflare Pages will auto-deploy in ~2 minutes');
    log.info('Check: https://dash.cloudflare.com/');

  } catch (error) {
    log.error('Failed to publish to GitHub');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`
${colors.bright}${colors.magenta}
╔═══════════════════════════════════════╗
║   🐹 Pets Life Article Generator      ║
║   One-Click Content Creation          ║
╚═══════════════════════════════════════╝
${colors.reset}
  `);

  // Validate API key
  if (!GEMINI_API_KEY) {
    log.error('GEMINI_API_KEY not found in .env');
    log.info('Add your Gemini API key to .env file');
    process.exit(1);
  }

  try {
    // 1. Load keyword data
    log.step('1️⃣ Loading keyword research data...');
    const ideas = loadKeywordData();
    const published = getPublishedKeywords();
    log.success(`Found ${ideas.length} keywords, ${published.length} already published`);

    // 2. Select next keyword
    log.step('2️⃣ Selecting next keyword...');
    const keyword = selectNextKeyword(ideas, published);
    log.success(`Selected: "${keyword.keyword}"`);
    log.info(`  Volume: ${keyword.volume} | Competition: ${keyword.competition} | Score: ${keyword.opportunityScore}`);

    // 3. Generate article
    const content = await generateArticle(keyword);
    const wordCount = content.split(/\s+/).length;

    // 4. Show preview
    showPreview(content, wordCount);

    // 5. Create file
    log.step('3️⃣ Creating article file...');
    const { filePath, title, slug } = createArticleFile(keyword, content);
    log.success(`Created: ${filePath}`);
    log.info(`URL will be: https://pets-life.com/blog/${slug}`);

    // 6. Ask to publish
    const shouldPublish = await askToPublish();

    if (shouldPublish) {
      await publishToGitHub(filePath, title);
    } else {
      log.warning('Article saved locally but not published');
      log.info(`Review the file: ${filePath}`);
      log.info('To publish later, run: git add . && git commit -m "Add article" && git push');
    }

    log.step('🎉 Done!');

  } catch (error) {
    log.error('Generation failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
