import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const missingAsins = [
  'B0006G53RM', // ChuckIt Ultra Ball
  'B00A3M8LVE', // Milk-Bone
  'B000H0ZJHW', // Wellness CORE
  'B01N9KOHIC', // Benebone
  'B01LZE4S5N', // Best Pet Supplies Harness
  'B00FEKLUEE', // IRIS Food Container
  'B00NABTXU2', // iFetch
  'B07FMPQ49L', // Zesty Paws
  'B000F9JJJE', // Dr. Elsey's Litter
  'B001NJ0DQ8', // TEMPTATIONS
  'B0719D3X1H', // Potaroma Fish
  'B0018CG8XU', // Bergan Turbo
  'B003RJQWDQ', // PetSafe ScoopFree
  'B000IYSAIW', // Pioneer Pet Fountain
  'B07RK7GJC4', // PetFusion BetterBox
  'B0006N9I68'  // FURminator Cat
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const imageUrl = url.replace(/\._.*?_\./, '._AC_SL400_.');

    https.get(imageUrl, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function downloadProductImage(asin) {
  const filepath = path.join(__dirname, '../public/images/products', `${asin}.jpg`);

  if (fs.existsSync(filepath)) {
    console.log(`✓ ${asin} already exists`);
    return;
  }

  console.log(`Downloading ${asin}...`);

  try {
    const html = await fetchPage(`https://www.amazon.com/dp/${asin}`);

    // Try multiple image extraction patterns
    const patterns = [
      /"hiRes":"(https:\/\/[^"]+\.jpg)"/,
      /"large":"(https:\/\/[^"]+\.jpg)"/,
      /data-old-hires="(https:\/\/[^"]+\.jpg)"/,
      /data-a-dynamic-image="[^"]*?(https:\/\/[^"]+\.jpg)[^"]*?"/,
    ];

    let imageUrl = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        imageUrl = match[1];
        break;
      }
    }

    if (imageUrl) {
      await downloadImage(imageUrl, filepath);
      console.log(`✓ ${asin}.jpg downloaded`);
    } else {
      console.log(`⚠ ${asin}: Could not find image URL in page`);
    }
  } catch (error) {
    console.log(`✗ ${asin}: ${error.message}`);
  }
}

async function main() {
  console.log('Downloading missing product images...\n');

  for (const asin of missingAsins) {
    await downloadProductImage(asin);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\nDone!');
}

main();
