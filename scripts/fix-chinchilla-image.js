import https from 'https';
import fs from 'fs';
import path from 'path';

const PEXELS_API_KEY = 'bVo5cxEzO1Rx7DCAaSXS7zqC4Z8iDvPJXwGa1YI7Ny9rTh3TzSVljp5U';

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
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

async function searchPexels(query) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.pexels.com',
      path: `/v1/search?query=${encodeURIComponent(query)}&per_page=5`,
      headers: { 'Authorization': PEXELS_API_KEY }
    };

    https.get(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        if (response.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Pexels API error: ${response.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const publicDir = path.join(process.cwd(), 'public/images/covers');

  console.log('Searching Pexels for chinchilla photos...');
  const results = await searchPexels('chinchilla');

  if (results.photos && results.photos.length > 0) {
    const photo = results.photos[0];
    const imageUrl = photo.src.large;
    const filepath = path.join(publicDir, 'chinchilla-dust-bath.jpg');

    console.log(`Downloading chinchilla photo from: ${imageUrl}`);
    await downloadImage(imageUrl, filepath);
    console.log(`✓ Saved to: ${filepath}`);
  } else {
    console.log('No chinchilla photos found');
  }
}

main().catch(console.error);
