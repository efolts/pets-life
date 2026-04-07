import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const asins = [
  'B0006G53RM', 'B0006N9I68', 'B000F9JJJE', 'B000H0ZJHW',
  'B000IYSAIW', 'B0018CG8XU', 'B001NJ0DQ8', 'B003RJQWDQ',
  'B00A3M8LVE', 'B00FEKLUEE', 'B00NABTXU2', 'B01LZE4S5N',
  'B01N9KOHIC', 'B0719D3X1H', 'B07FMPQ49L', 'B07RK7GJC4'
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
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
        reject(new Error(`Failed: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  const imagesDir = path.join(__dirname, '../public/images/products');

  for (const asin of asins) {
    const filepath = path.join(imagesDir, `${asin}.jpg`);

    console.log(`Downloading ${asin}...`);

    try {
      const html = await fetchPage(`https://www.amazon.com/dp/${asin}`);
      const imgMatch = html.match(/"large":"(https:\/\/[^"]+\.jpg)"/);

      if (imgMatch) {
        await downloadImage(imgMatch[1], filepath);
        console.log(`✓ ${asin}.jpg`);
      } else {
        console.log(`⚠ No image found for ${asin}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.log(`✗ ${asin}: ${error.message}`);
    }
  }

  console.log('\nDone!');
}

main();
