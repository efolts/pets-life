import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AMAZON_TAG = 'petslife-20';

// Amazon Best Sellers URLs
const BEST_SELLERS = {
  dogs: 'https://www.amazon.com/Best-Sellers-Pet-Supplies-Dog/zgbs/pet-supplies/2975312011',
  cats: 'https://www.amazon.com/Best-Sellers-Pet-Supplies-Cat/zgbs/pet-supplies/2975313011',
  all: 'https://www.amazon.com/Best-Sellers-Pet-Supplies/zgbs/pet-supplies'
};

/**
 * Fetch Amazon Best Sellers page
 */
async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Parse Amazon Best Sellers HTML to extract products
 */
function parseProducts(html, limit = 12) {
  const products = [];

  // Match product blocks in Best Sellers page
  const productRegex = /<div[^>]*class="[^"]*zg-grid-general-faceout[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const matches = html.match(productRegex) || [];

  for (const block of matches.slice(0, limit)) {
    // Extract ASIN
    const asinMatch = block.match(/data-asin="([A-Z0-9]{10})"/);
    if (!asinMatch) continue;
    const asin = asinMatch[1];

    // Extract title
    const titleMatch = block.match(/<span[^>]*class="[^"]*p13n-sc-truncate[^"]*"[^>]*>(.*?)<\/span>/i) ||
                      block.match(/<div[^>]*class="[^"]*p13n-sc-truncated[^"]*"[^>]*>(.*?)<\/div>/i) ||
                      block.match(/alt="([^"]+)"/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Product ${asin}`;

    // Extract image
    const imgMatch = block.match(/src="([^"]+(?:jpg|jpeg|png)[^"]*)"/i);
    const imageUrl = imgMatch ? imgMatch[1].replace(/\._[^.]*_\./, '._AC_SL400_.') : '';

    // Build affiliate URL
    const affiliateUrl = `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;

    products.push({
      asin,
      title: cleanTitle(title),
      description: '', // Will be populated manually or via product page scrape
      imageUrl: `/images/products/${asin}.jpg`,
      affiliateUrl,
      scrapedAt: new Date().toISOString()
    });
  }

  return products;
}

/**
 * Clean product title
 */
function cleanTitle(title) {
  return title
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
    .substring(0, 120); // Limit length
}

/**
 * Download product image
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const imageUrl = url.startsWith('//') ? 'https:' + url : url;

    https.get(imageUrl, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

/**
 * Scrape Amazon Best Sellers for a category
 */
async function scrapeBestSellers(category, limit = 12) {
  console.log(`\nScraping ${category} Best Sellers...`);

  const url = BEST_SELLERS[category];
  const html = await fetchPage(url);
  const products = parseProducts(html, limit);

  console.log(`Found ${products.length} products for ${category}`);

  return products;
}

/**
 * Download missing product images
 */
async function downloadMissingImages(products) {
  const imagesDir = path.join(__dirname, '../public/images/products');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  for (const product of products) {
    const filepath = path.join(imagesDir, `${product.asin}.jpg`);

    if (!fs.existsSync(filepath)) {
      console.log(`Downloading image for ${product.asin}...`);

      // Try to extract real image URL from Amazon product page
      try {
        const productHtml = await fetchPage(`https://www.amazon.com/dp/${product.asin}`);
        const imgMatch = productHtml.match(/"large":"(https:\/\/[^"]+\.jpg)"/);

        if (imgMatch) {
          await downloadImage(imgMatch[1], filepath);
          console.log(`✓ Downloaded ${product.asin}.jpg`);
        } else {
          console.log(`⚠ Could not find image for ${product.asin}`);
        }
      } catch (error) {
        console.log(`⚠ Failed to download ${product.asin}: ${error.message}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Enrich products with descriptions (manual for now)
 */
function enrichProducts(products) {
  // For initial version, add generic descriptions
  // Later can be enhanced with product page scraping or manual curation
  return products.map(p => ({
    ...p,
    description: p.description || `High-quality pet product highly rated by Amazon customers. Check out why this is trending this week.`
  }));
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Amazon Best Sellers Trending Update ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Scrape all categories
    const dogProducts = await scrapeBestSellers('dogs', 12);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const catProducts = await scrapeBestSellers('cats', 12);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const allProducts = await scrapeBestSellers('all', 12);

    // Download missing images
    console.log('\n=== Downloading Product Images ===');
    await downloadMissingImages([...dogProducts, ...catProducts, ...allProducts]);

    // Enrich with descriptions
    const enrichedDogs = enrichProducts(dogProducts);
    const enrichedCats = enrichProducts(catProducts);
    const enrichedAll = enrichProducts(allProducts);

    // Save to data files
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const trendingDogs = {
      lastUpdated: new Date().toISOString(),
      products: enrichedDogs
    };

    const trendingCats = {
      lastUpdated: new Date().toISOString(),
      products: enrichedCats
    };

    const trendingAllMixed = {
      lastUpdated: new Date().toISOString(),
      products: enrichedAll
    };

    fs.writeFileSync(
      path.join(dataDir, 'trending-dogs.json'),
      JSON.stringify(trendingDogs, null, 2)
    );

    fs.writeFileSync(
      path.join(dataDir, 'trending-cats.json'),
      JSON.stringify(trendingCats, null, 2)
    );

    fs.writeFileSync(
      path.join(dataDir, 'trending-all.json'),
      JSON.stringify(trendingAllMixed, null, 2)
    );

    console.log('\n=== Update Complete ===');
    console.log(`✓ Updated trending-dogs.json (${enrichedDogs.length} products)`);
    console.log(`✓ Updated trending-cats.json (${enrichedCats.length} products)`);
    console.log(`✓ Updated trending-all.json (${enrichedAll.length} products)`);
    console.log(`\nFinished at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('Error updating trending products:', error);
    process.exit(1);
  }
}

main();
