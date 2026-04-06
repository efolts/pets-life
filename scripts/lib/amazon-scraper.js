/**
 * Amazon Product Scraper
 *
 * Scrapes Amazon search results for real product data:
 * titles, prices, ratings, review counts, images, and features.
 * Downloads product images locally for self-hosting.
 *
 * Usage:
 *   import { scrapeAmazonProducts } from './lib/amazon-scraper.js';
 *   const products = await scrapeAmazonProducts('hamster wheel', {
 *     amazonTag: 'petslife-20',
 *     imageDir: '/path/to/public/images/products',
 *     imageUrlPrefix: '/images/products',
 *   });
 */

import * as cheerio from 'cheerio';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Scrape Amazon search results and download product images.
 *
 * @param {string} keyword - Search term
 * @param {Object} config
 * @param {string} config.amazonTag - Associate tracking ID
 * @param {string} config.imageDir - Absolute path to save images
 * @param {string} config.imageUrlPrefix - URL prefix for images in articles (e.g. "/images/products")
 * @param {number} [config.maxProducts=7] - Max products to return
 * @returns {Promise<Array>} Product objects with local image paths
 */
export async function scrapeAmazonProducts(keyword, config) {
  const { amazonTag, imageDir, imageUrlPrefix, maxProducts = 7 } = config;

  if (!existsSync(imageDir)) {
    mkdirSync(imageDir, { recursive: true });
  }

  const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&ref=nb_sb_noss`;

  console.log(`  Fetching Amazon search: "${keyword}"`);
  const html = await fetchPage(searchUrl);
  const products = parseSearchResults(html, amazonTag);

  if (products.length === 0) {
    console.log('  No products found in search results');
    return [];
  }

  console.log(`  Found ${products.length} products, downloading images...`);

  // Take top products and download their images
  const selected = products.slice(0, maxProducts);

  for (const product of selected) {
    if (product.imageUrl) {
      // Get higher-res version of the image
      const hiResUrl = upscaleImageUrl(product.imageUrl);
      const ext = 'jpg';
      const filename = `${product.asin}.${ext}`;
      const localPath = path.join(imageDir, filename);

      if (!existsSync(localPath)) {
        try {
          await downloadImage(hiResUrl, localPath);
          console.log(`  Downloaded: ${filename}`);
        } catch (err) {
          console.log(`  Failed to download image for ${product.asin}: ${err.message}`);
        }
      } else {
        console.log(`  Image exists: ${filename}`);
      }

      product.localImage = `${imageUrlPrefix}/${filename}`;
    }

    // Scrape individual product page for features
    if (product.detailUrl) {
      try {
        await new Promise(r => setTimeout(r, 1000)); // rate limit
        const details = await scrapeProductDetails(product.detailUrl);
        if (details.features.length > 0) product.features = details.features;
        if (details.brand) product.brand = details.brand;
      } catch (err) {
        console.log(`  Could not fetch details for ${product.asin}`);
      }
    }
  }

  return selected;
}

// ============================================================================
// SEARCH RESULTS PARSER
// ============================================================================

function parseSearchResults(html, tag) {
  const $ = cheerio.load(html);
  const products = [];

  $('[data-component-type="s-search-result"]').each((i, el) => {
    const $el = $(el);
    const asin = $el.attr('data-asin');
    if (!asin || asin.length < 5) return; // skip ads/empty

    // Skip sponsored results
    if ($el.find('.puis-sponsored-label-text').length > 0) return;

    const title = $el.find('h2 span').first().text().trim();
    if (!title) return;

    // Price
    const priceText = $el.find('.a-price .a-offscreen').first().text().trim();
    const priceValue = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

    // Rating
    const ratingLabel = $el.find('.a-icon-alt').first().text();
    const rating = parseFloat(ratingLabel.match(/([\d.]+)\s*out/)?.[1] || 0);

    // Review count - Amazon shows "20K", "5.9K", "1,234" etc.
    const reviewText = $el.find('span.s-underline-text').first().text().trim();
    const reviewCount = parseReviewCount(reviewText);

    // Image
    const imageUrl = $el.find('img.s-image').first().attr('src') || '';

    // Detail page URL
    const detailPath = $el.find('h2 a').first().attr('href') || '';
    const detailUrl = detailPath ? `https://www.amazon.com${detailPath}` : '';

    products.push({
      asin,
      title,
      price: priceText || 'Check Amazon',
      priceValue,
      rating,
      reviewCount,
      imageUrl,
      localImage: '',
      features: [],
      isPrime: $el.find('[aria-label="Amazon Prime"]').length > 0,
      brand: '',
      affiliateUrl: `https://www.amazon.com/dp/${asin}?tag=${tag}`,
      detailUrl,
    });
  });

  // Sort by rating * reviews for relevance
  products.sort((a, b) => (b.rating * b.reviewCount) - (a.rating * a.reviewCount));

  return products;
}

/**
 * Parse review count strings like "(20K)", "(5.9K)", "(1,234)"
 */
function parseReviewCount(text) {
  const cleaned = text.replace(/[()]/g, '').trim();
  if (!cleaned) return 0;

  const kMatch = cleaned.match(/([\d.]+)K/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  return parseInt(cleaned.replace(/[^0-9]/g, '')) || 0;
}

// ============================================================================
// PRODUCT DETAIL SCRAPER
// ============================================================================

async function scrapeProductDetails(url) {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const features = [];
  $('#feature-bullets li span.a-list-item').each((i, el) => {
    const text = $(el).text().trim();
    if (text && !text.includes('›') && text.length > 10) {
      features.push(text);
    }
  });

  const brand = $('#bylineInfo').text().replace(/^(Visit the |Brand: )/, '').replace(/ Store$/, '').trim();

  return { features: features.slice(0, 5), brand };
}

// ============================================================================
// IMAGE HELPERS
// ============================================================================

/**
 * Upscale Amazon thumbnail URL to a larger version.
 * Amazon CDN URLs contain size tokens like _AC_UL320_ that can be swapped.
 */
function upscaleImageUrl(url) {
  // Replace common size tokens with large version
  return url
    .replace(/_AC_UL\d+_/, '_AC_SL1200_')
    .replace(/_AC_US\d+_/, '_AC_SL1200_')
    .replace(/_AC_SY\d+_/, '_AC_SL1200_')
    .replace(/_AC_SX\d+_/, '_AC_SL1200_')
    .replace(/_SX\d+_SY\d+_/, '_SL1200_')
    .replace(/_SS\d+_/, '_SL1200_');
}

async function downloadImage(url, destPath) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destPath, buffer);
}

// ============================================================================
// HTTP
// ============================================================================

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: HEADERS,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Amazon returned ${response.status} for ${url}`);
  }

  return await response.text();
}
