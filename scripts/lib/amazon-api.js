/**
 * Amazon Product Advertising API 5.0 Client
 *
 * Searches Amazon for products using PA-API 5.0 with AWS Signature V4 signing.
 * Returns real product data: titles, prices, images, ratings, features, affiliate URLs.
 *
 * Usage:
 *   import { searchAmazonProducts } from './lib/amazon-api.js';
 *   const products = await searchAmazonProducts('hamster wheel', {
 *     amazonAccessKey: '...',
 *     amazonSecretKey: '...',
 *     amazonTag: 'petslife-20',
 *   });
 */

import crypto from 'crypto';

const HOST = 'webservices.amazon.com';
const REGION = 'us-east-1';
const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';

const RESOURCES = [
  'CustomerReviews.Count',
  'CustomerReviews.StarRating',
  'Images.Primary.Large',
  'Images.Primary.Medium',
  'ItemInfo.Title',
  'ItemInfo.Features',
  'ItemInfo.ByLineInfo',
  'Offers.Listings.Price',
  'Offers.Listings.DeliveryInfo.IsPrimeEligible',
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Search Amazon for products matching a keyword.
 *
 * @param {string} keyword - Search term (e.g. "best hamster wheel")
 * @param {Object} config - Must have amazonAccessKey, amazonSecretKey, amazonTag
 * @param {Object} [options]
 * @param {number} [options.itemCount=10] - Number of results (1-10)
 * @param {string} [options.searchIndex='PetSupplies'] - Amazon search index
 * @returns {Promise<Array>} Array of product objects
 */
export async function searchAmazonProducts(keyword, config, options = {}) {
  const { itemCount = 10, searchIndex = 'PetSupplies' } = options;

  const payload = JSON.stringify({
    Keywords: keyword,
    SearchIndex: searchIndex,
    ItemCount: itemCount,
    Resources: RESOURCES,
    PartnerTag: config.amazonTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Canonical headers (must be sorted alphabetically, lowercased)
  const headers = {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    'host': HOST,
    'x-amz-date': amzDate,
    'x-amz-target': TARGET,
  };

  const signedHeaderKeys = Object.keys(headers).sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('');

  // Step 1: Canonical request
  const canonicalRequest = [
    'POST',
    PATH,
    '',  // no query string
    canonicalHeaders,
    signedHeaders,
    sha256(payload),
  ].join('\n');

  // Step 2: String to sign
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  // Step 3: Signing key
  const kDate = hmac(`AWS4${config.amazonSecretKey}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  // Step 4: Authorization header
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.amazonAccessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ');

  const response = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Authorization': authorization,
    },
    body: payload,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Amazon PA-API ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const items = data.SearchResult?.Items || [];

  return items.map(item => parseItem(item, config.amazonTag));
}

// ============================================================================
// INTERNALS
// ============================================================================

function parseItem(item, tag) {
  const listing = item.Offers?.Listings?.[0];
  const price = listing?.Price;

  return {
    asin: item.ASIN,
    title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
    price: price?.DisplayAmount || 'Check Amazon',
    priceValue: price?.Amount || 0,
    rating: item.CustomerReviews?.StarRating?.Value || 0,
    reviewCount: item.CustomerReviews?.Count || 0,
    imageUrl: item.Images?.Primary?.Large?.URL
           || item.Images?.Primary?.Medium?.URL
           || '',
    features: item.ItemInfo?.Features?.DisplayValues || [],
    isPrime: listing?.DeliveryInfo?.IsPrimeEligible || false,
    brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || '',
    affiliateUrl: `https://www.amazon.com/dp/${item.ASIN}?tag=${tag}`,
  };
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}
