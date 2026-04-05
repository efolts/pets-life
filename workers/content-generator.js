/**
 * Cloudflare Worker - Autonomous Content Generator
 * Runs weekly via cron trigger to generate and publish affiliate content
 */

export default {
  /**
   * Scheduled trigger - runs weekly on Sunday at 2 AM UTC
   */
  async scheduled(event, env, ctx) {
    console.log('🚀 Starting autonomous content generation...');

    try {
      // 1. Find best keyword to target
      const keyword = await selectNextKeyword(env);
      console.log(`🎯 Selected keyword: "${keyword.keyword}"`);

      // 2. Fetch relevant products from Amazon
      const products = await fetchAmazonProducts(keyword, env);
      console.log(`📦 Found ${products.length} products`);

      // 3. Generate article content using Claude
      const article = await generateArticle(keyword, products, env);
      console.log(`✍️ Generated article: "${article.title}"`);

      // 4. Download and optimize product images
      const images = await processImages(products, env);
      console.log(`🖼️ Processed ${images.length} images`);

      // 5. Commit to GitHub (triggers Cloudflare Pages deploy)
      await commitToGitHub(article, images, env);
      console.log(`✅ Committed to GitHub - deploy triggered`);

      return new Response('Content generation successful', { status: 200 });
    } catch (error) {
      console.error('❌ Error generating content:', error);

      // Send alert (could integrate with email/Slack)
      await sendAlert(error, env);

      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },

  /**
   * HTTP handler for manual triggers
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Manual trigger endpoint
    if (url.pathname === '/generate' && request.method === 'POST') {
      // Verify auth token
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WORKER_AUTH_TOKEN}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Trigger the scheduled handler
      return await this.scheduled({ cron: 'manual' }, env, ctx);
    }

    // Status endpoint
    if (url.pathname === '/status') {
      return new Response(JSON.stringify({
        status: 'online',
        lastRun: await env.KV.get('last_run_timestamp'),
        articlesGenerated: await env.KV.get('total_articles_generated') || 0
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Pets Life Content Generator Worker', { status: 200 });
  }
};

/**
 * Select the next best keyword to target from research data
 */
async function selectNextKeyword(env) {
  // Fetch keyword research data from KV storage
  const keywordData = JSON.parse(
    await env.KV.get('keyword_opportunities') || '{"articleIdeas":[]}'
  );

  // Get already published keywords
  const published = JSON.parse(
    await env.KV.get('published_keywords') || '[]'
  );

  // Find next unpublished keyword
  const nextKeyword = keywordData.articleIdeas.find(
    idea => !published.includes(idea.keyword)
  );

  if (!nextKeyword) {
    throw new Error('No more keywords available - refresh research data');
  }

  return nextKeyword;
}

/**
 * Fetch Amazon products using Product Advertising API
 * Note: This is a simplified version - full implementation would use PA-API 5.0
 */
async function fetchAmazonProducts(keyword, env) {
  // Extract product category from keyword
  const category = detectCategory(keyword.keyword);

  // For MVP, using mock data
  // TODO: Integrate Amazon Product Advertising API
  const mockProducts = [
    {
      asin: 'B08XYZKXYZ',
      title: `${category} Product 1`,
      price: 24.99,
      rating: 4.5,
      reviewCount: 847,
      imageUrl: 'https://m.media-amazon.com/images/placeholder.jpg',
      features: [
        'High quality materials',
        'Perfect for small pets',
        'Easy to clean',
        'Durable construction'
      ],
      inStock: true
    },
    // Add 4-6 more products...
  ];

  return mockProducts;
}

/**
 * Generate article content using Claude API
 */
async function generateArticle(keyword, products, env) {
  const prompt = buildContentPrompt(keyword, products);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  const data = await response.json();
  const content = data.content[0].text;

  // Parse the markdown content
  const article = parseArticleContent(content, keyword, products);

  return article;
}

/**
 * Build Claude prompt for article generation
 */
function buildContentPrompt(keyword, products) {
  return `You are writing a helpful, informative product review article for pet owners.

TARGET KEYWORD: "${keyword.keyword}"
ARTICLE TYPE: ${keyword.type}
SEARCH VOLUME: ${keyword.volume}
TOPIC: Small pets (hamsters, guinea pigs, rabbits, ferrets, etc.)

PRODUCTS TO REVIEW:
${products.map((p, i) => `${i + 1}. ${p.title} - $${p.price} - ${p.rating}⭐ (${p.reviewCount} reviews)`).join('\n')}

REQUIREMENTS:
- Write a comprehensive, SEO-optimized article (1,500-2,000 words)
- Target the keyword naturally throughout the content
- Include an engaging introduction explaining what readers will learn
- Create detailed product reviews with pros/cons for each product
- Add a comparison table at the top
- Include a "Buying Guide" section with helpful tips
- Add an FAQ section (3-5 questions)
- Write in a friendly, helpful tone (not overly promotional)
- Use proper markdown formatting with H2/H3 headers
- Include clear calls-to-action to check prices on Amazon
- End with a conclusion recommending the best overall pick

OUTPUT FORMAT:
Return ONLY the article content in markdown format, starting with the title as an H1.
Do NOT include frontmatter - just the article content itself.

Begin the article now:`;
}

/**
 * Parse Claude's response into structured article
 */
function parseArticleContent(content, keyword, products) {
  const now = new Date();
  const slug = keyword.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    slug,
    title: keyword.title,
    content,
    metadata: {
      publishDate: now.toISOString().split('T')[0],
      keyword: keyword.keyword,
      category: detectCategory(keyword.keyword),
      products: products.map(p => p.asin),
      generatedBy: 'autonomous-system'
    }
  };
}

/**
 * Download and optimize product images
 */
async function processImages(products, env) {
  const images = [];

  for (const product of products) {
    // Download image
    const imageResponse = await fetch(product.imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Cloudflare R2 (or commit to repo)
    const imagePath = `images/products/${product.asin}.jpg`;
    await env.R2_BUCKET.put(imagePath, imageBuffer);

    images.push({
      asin: product.asin,
      path: imagePath,
      url: `https://pets-life.com/${imagePath}`
    });
  }

  return images;
}

/**
 * Commit article to GitHub repository
 */
async function commitToGitHub(article, images, env) {
  const { slug, title, content, metadata } = article;

  // Create frontmatter
  const frontmatter = `---
title: "${title}"
description: "${title.substring(0, 155)}"
publishDate: ${metadata.publishDate}
category: ${metadata.category}
keywords: ["${metadata.keyword}"]
products: ${JSON.stringify(metadata.products)}
author: "Pets Life Team"
---

`;

  const fullContent = frontmatter + content;
  const filePath = `src/content/blog/${slug}.md`;

  // GitHub API: Create file
  const githubResponse = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add article: ${title}`,
        content: btoa(fullContent),
        branch: 'main'
      })
    }
  );

  if (!githubResponse.ok) {
    throw new Error(`GitHub commit failed: ${githubResponse.status}`);
  }

  // Update tracking
  const published = JSON.parse(await env.KV.get('published_keywords') || '[]');
  published.push(metadata.keyword);
  await env.KV.put('published_keywords', JSON.stringify(published));
  await env.KV.put('last_run_timestamp', new Date().toISOString());

  const totalArticles = parseInt(await env.KV.get('total_articles_generated') || '0') + 1;
  await env.KV.put('total_articles_generated', totalArticles.toString());
}

/**
 * Detect pet category from keyword
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
 * Send alert on error
 */
async function sendAlert(error, env) {
  // TODO: Integrate with email or Slack
  console.error('ALERT:', error);
  await env.KV.put('last_error', JSON.stringify({
    message: error.message,
    timestamp: new Date().toISOString()
  }));
}
