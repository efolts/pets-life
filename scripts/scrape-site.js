import 'dotenv/config';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.pets-life.com';
const RATE_LIMIT_MS = 1000; // 1 request per second
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SCRAPED_DIR = join(ROOT, 'scraped');
const POSTS_DIR = join(SCRAPED_DIR, 'posts');
const PAGES_DIR = join(SCRAPED_DIR, 'pages');
const IMAGES_DIR = join(SCRAPED_DIR, 'images');

// ---------------------------------------------------------------------------
// All known URLs
// ---------------------------------------------------------------------------

const POST_URLS = [
  'https://www.pets-life.com/best-wet-dog-food-for-chihuahua/',
  'https://www.pets-life.com/best-weight-management-dog-food-for-large-breeds/',
  'https://www.pets-life.com/best-cat-carrier-for-nervous-cats/',
  'https://www.pets-life.com/best-dog-balls-chewers/',
  'https://www.pets-life.com/best-dog-chew-toys-for-teeth/',
  'https://www.pets-life.com/best-dog-crates-for-separation-anxiety/',
  'https://www.pets-life.com/best-squeaky-toy-for-chewers/',
  'https://www.pets-life.com/best-dog-food-boxers-with-sensitive-stomachs/',
  'https://www.pets-life.com/best-bird-food-cardinals/',
  'https://www.pets-life.com/best-chew-bones-puppies/',
  'https://www.pets-life.com/best-ear-mite-medicine-dogs/',
  'https://www.pets-life.com/best-brush-long-haired-dogs/',
  'https://www.pets-life.com/fish-tanks-faq/',
  'https://www.pets-life.com/guinea-pigs-faq/',
  'https://www.pets-life.com/best-deworming-medicine-cats/',
  'https://www.pets-life.com/best-carpet-cleaner-solution-pet-urine/',
  'https://www.pets-life.com/best-tick-killer-for-yards/',
  'https://www.pets-life.com/best-nail-clipper-for-large-dogs/',
  'https://www.pets-life.com/best-heater-for-betta-tank/',
  'https://www.pets-life.com/best-filter-for-10-gallon-tank/',
  'https://www.pets-life.com/best-canned-dog-food-for-sensitive-stomachs/',
  'https://www.pets-life.com/best-no-scratch-spray-for-cats/',
  'https://www.pets-life.com/best-dremel-grinder-for-dog-nails/',
  'https://www.pets-life.com/best-dog-wormer-for-all-worms/',
  'https://www.pets-life.com/best-dog-food-with-glucosamine-and-chondroitin/',
  'https://www.pets-life.com/best-cat-trees-for-multiple-cats/',
  'https://www.pets-life.com/best-bones-teething-puppies/',
  'https://www.pets-life.com/best-self-cleaning-litter-box-multiple-cats/',
  'https://www.pets-life.com/best-dog-dental-water-additive/',
  'https://www.pets-life.com/best-cranberry-supplement-for-dogs/',
  'https://www.pets-life.com/best-dog-shampoo-for-dander/',
  'https://www.pets-life.com/best-fly-repellent-for-dogs/',
  'https://www.pets-life.com/best-pain-reliever-for-dogs/',
  'https://www.pets-life.com/best-pet-hair-remover-for-furniture/',
  'https://www.pets-life.com/best-shock-collar-for-hunting-dogs/',
  'https://www.pets-life.com/best-dog-beds-for-cocker-spaniels/',
  'https://www.pets-life.com/best-terrarium-for-bearded-dragons/',
  'https://www.pets-life.com/best-dog-food-for-american-bully/',
  'https://www.pets-life.com/best-saltwater-aquarium-starter-kit/',
  'https://www.pets-life.com/best-dog-chew-toys-for-aggressive-chewers/',
  'https://www.pets-life.com/best-bird-cage-for-lovebirds/',
  'https://www.pets-life.com/best-dog-foods-for-small-senior-dogs/',
  'https://www.pets-life.com/best-cat-toys-to-keep-them-busy/',
  'https://www.pets-life.com/best-horse-feed-on-the-market/',
  'https://www.pets-life.com/best-dog-muzzle-for-biting/',
  'https://www.pets-life.com/best-flea-medicine-cats/',
  'https://www.pets-life.com/best-cat-harness-no-escape/',
  'https://www.pets-life.com/best-large-breed-puppy-food-german-shepherds/',
  'https://www.pets-life.com/best-no-bark-collars-for-small-dogs/',
  'https://www.pets-life.com/best-dog-food-sensitive-stomach-diarrhea/',
  'https://www.pets-life.com/best-dog-food-for-skin-allergies/',
  'https://www.pets-life.com/best-flea-tick-mosquito-prevention-for-dogs/',
  'https://www.pets-life.com/best-dry-cat-food-for-older-cats/',
  'https://www.pets-life.com/best-cat-food-urinary-crystals/',
  'https://www.pets-life.com/best-brush-for-medium-hair-cat/',
  'https://www.pets-life.com/best-moisturizing-shampoo-for-dogs/',
  'https://www.pets-life.com/best-shampoo-for-pit-bulls/',
  'https://www.pets-life.com/best-cat-food-for-sensitive-stomach-vomiting/',
];

const PAGE_URLS = [
  'https://www.pets-life.com/',
  'https://www.pets-life.com/trending-pet-products-this-week/',
  'https://www.pets-life.com/trends/',
  'https://www.pets-life.com/trends/dogs/',
  'https://www.pets-life.com/trends/cats/',
  'https://www.pets-life.com/affiliate-disclosure/',
  'https://www.pets-life.com/about',
  'https://www.pets-life.com/contact',
  'https://www.pets-life.com/privacy-policy',
];

const CATEGORY_SLUGS = [
  'aquariums',
  'backyard',
  'dog-accessories',
  'cat-accessories',
  'cat-tree',
  'leashes',
  'guinea-pigs',
  'cleaning',
  'grooming',
  'medicine',
  'dog-food',
  'bird-food',
  'dog-toys',
  'dog-crate',
  'cat-toys',
  'terrariums',
  'horse-feed',
  'cat-carrier',
  'muzzles',
  'bird-cage',
  'dog-beds',
  'litter-boxes',
  'dog-shampoo',
  'cat-food',
];

const CATEGORY_URLS = CATEGORY_SLUGS.map(
  (slug) => `${BASE_URL}/category/${slug}/`
);

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugFromUrl(url) {
  const u = new URL(url);
  let path = u.pathname.replace(/^\/|\/$/g, '');
  if (path === '') return 'home';
  return path.replace(/\//g, '--');
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

async function downloadImage(imageUrl, destDir) {
  try {
    const filename = basename(new URL(imageUrl).pathname);
    const destPath = join(destDir, filename);

    if (existsSync(destPath)) {
      return filename;
    }

    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log(`  \u26A0\uFE0F  Image fetch failed (${response.status}): ${imageUrl}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destPath, buffer);
    return filename;
  } catch (err) {
    console.log(`  \u26A0\uFE0F  Image download error: ${imageUrl} - ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTML to Markdown converter (regex-based, no dependencies)
// ---------------------------------------------------------------------------

function htmlToMarkdown(html) {
  if (!html) return '';

  let md = html;

  // Remove script / style blocks
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // Decode common HTML entities first
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#039;/g, "'");
  md = md.replace(/&apos;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&#8217;/g, '\u2019');
  md = md.replace(/&#8216;/g, '\u2018');
  md = md.replace(/&#8220;/g, '\u201C');
  md = md.replace(/&#8221;/g, '\u201D');
  md = md.replace(/&#8211;/g, '\u2013');
  md = md.replace(/&#8212;/g, '\u2014');
  md = md.replace(/&#8230;/g, '\u2026');

  // Convert headers h1-h6
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, content) => `\n# ${stripTags(content).trim()}\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, content) => `\n## ${stripTags(content).trim()}\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, content) => `\n### ${stripTags(content).trim()}\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, content) => `\n#### ${stripTags(content).trim()}\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, content) => `\n##### ${stripTags(content).trim()}\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, content) => `\n###### ${stripTags(content).trim()}\n`);

  // Convert images before links so nested img inside a gets handled
  md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
    (_, src, alt) => `![${alt}](${src})`);
  md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    (_, alt, src) => `![${alt}](${src})`);
  md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    (_, src) => `![](${src})`);

  // Convert links
  md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => `[${stripTags(text).trim()}](${href})`);

  // Convert strong/b
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `**${content.trim()}**`);

  // Convert em/i
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `*${content.trim()}*`);

  // Convert blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = stripTags(content).trim().split('\n');
    return '\n' + lines.map((l) => `> ${l.trim()}`).join('\n') + '\n';
  });

  // Convert ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let idx = 0;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, liContent) => {
      idx++;
      return `${idx}. ${stripTags(liContent).trim()}`;
    });
    return '\n' + stripTags(items).trim() + '\n';
  });

  // Convert unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__, liContent) => {
      return `- ${stripTags(liContent).trim()}`;
    });
    return '\n' + stripTags(items).trim() + '\n';
  });

  // Convert paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => `\n${content.trim()}\n`);

  // Convert <br> / <br/>
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Convert <hr>
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Convert table elements to simple text
  md = md.replace(/<\/tr>/gi, '\n');
  md = md.replace(/<\/td>/gi, ' | ');
  md = md.replace(/<\/th>/gi, ' | ');

  // Strip all remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Fix excessive blank lines
  md = md.replace(/\n{4,}/g, '\n\n\n');

  // Trim each line
  md = md
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // Trim start/end
  md = md.trim();

  return md;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (extract data from raw HTML)
// ---------------------------------------------------------------------------

function extractTitle(html) {
  // Try og:title first
  const ogMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) return decodeEntities(ogMatch[1]);

  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    // Remove site name suffix commonly seen in WP
    title = title.replace(/\s*[-|]\s*Pets Life.*$/i, '').trim();
    return decodeEntities(title);
  }

  // Try h1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) return decodeEntities(stripTags(h1Match[1]).trim());

  return 'Untitled';
}

function extractMetaDescription(html) {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (match) return decodeEntities(match[1]);

  const ogMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) return decodeEntities(ogMatch[1]);

  return '';
}

function extractPublishDate(html) {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      try {
        const data = JSON.parse(jsonStr);
        if (data.datePublished) return data.datePublished;
        if (data['@graph']) {
          for (const item of data['@graph']) {
            if (item.datePublished) return item.datePublished;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // Try meta article:published_time
  const metaMatch = html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i);
  if (metaMatch) return metaMatch[1];

  // Try time element
  const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
  if (timeMatch) return timeMatch[1];

  // Try published class text
  const publishedMatch = html.match(/class=["'][^"']*published[^"']*["'][^>]*>([^<]+)</i);
  if (publishedMatch) return publishedMatch[1].trim();

  return '';
}

function extractAuthor(html) {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      try {
        const data = JSON.parse(jsonStr);
        if (data.author?.name) return data.author.name;
        if (data['@graph']) {
          for (const item of data['@graph']) {
            if (item['@type'] === 'Person' && item.name) return item.name;
            if (item.author?.name) return item.author.name;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Try meta author
  const metaMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);
  if (metaMatch) return decodeEntities(metaMatch[1]);

  // Try author link text
  const authorLink = html.match(/class=["'][^"']*author[^"']*["'][^>]*>([^<]+)</i);
  if (authorLink) return authorLink[1].trim();

  return 'Tina Samolie';
}

function extractCategory(html, url) {
  // Try to extract from breadcrumbs or category link
  const catMatch = html.match(/class=["'][^"']*cat-links[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["'][^"']*\/category\/([^/"']+)/i);
  if (catMatch) return catMatch[1];

  // Try rel="category tag"
  const relCat = html.match(/<a[^>]*rel=["']category tag["'][^>]*>([^<]+)</i);
  if (relCat) return relCat[1].trim().toLowerCase().replace(/\s+/g, '-');

  // Try from JSON-LD articleSection
  const jsonLdMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      const jsonStr = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      try {
        const data = JSON.parse(jsonStr);
        if (data.articleSection) return data.articleSection.toLowerCase().replace(/\s+/g, '-');
        if (data['@graph']) {
          for (const item of data['@graph']) {
            if (item.articleSection) return item.articleSection.toLowerCase().replace(/\s+/g, '-');
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Infer from URL slug
  const slug = slugFromUrl(url);
  if (slug.includes('dog-food') || slug.includes('puppy-food')) return 'dog-food';
  if (slug.includes('cat-food')) return 'cat-food';
  if (slug.includes('dog-shampoo') || slug.includes('shampoo-for-dogs') || slug.includes('shampoo-for-pit')) return 'dog-shampoo';
  if (slug.includes('dog-toy') || slug.includes('chew-toy') || slug.includes('squeaky-toy') || slug.includes('dog-balls')) return 'dog-toys';
  if (slug.includes('cat-toy')) return 'cat-toys';
  if (slug.includes('cat-carrier')) return 'cat-carrier';
  if (slug.includes('cat-tree')) return 'cat-tree';
  if (slug.includes('cat-harness') || slug.includes('leash')) return 'leashes';
  if (slug.includes('dog-crate')) return 'dog-crate';
  if (slug.includes('dog-bed')) return 'dog-beds';
  if (slug.includes('dog-muzzle')) return 'muzzles';
  if (slug.includes('bird-cage')) return 'bird-cage';
  if (slug.includes('bird-food')) return 'bird-food';
  if (slug.includes('litter-box')) return 'litter-boxes';
  if (slug.includes('terrarium') || slug.includes('bearded-dragon')) return 'terrariums';
  if (slug.includes('aquarium') || slug.includes('fish-tank') || slug.includes('gallon-tank') || slug.includes('betta-tank') || slug.includes('saltwater')) return 'aquariums';
  if (slug.includes('guinea-pig')) return 'guinea-pigs';
  if (slug.includes('horse-feed')) return 'horse-feed';
  if (slug.includes('flea') || slug.includes('tick') || slug.includes('medicine') || slug.includes('deworming') || slug.includes('wormer') || slug.includes('pain-reliever') || slug.includes('cranberry') || slug.includes('ear-mite')) return 'medicine';
  if (slug.includes('brush') || slug.includes('nail-clipper') || slug.includes('dremel') || slug.includes('grooming') || slug.includes('dander')) return 'grooming';
  if (slug.includes('carpet-cleaner') || slug.includes('pet-hair-remover')) return 'cleaning';
  if (slug.includes('bark-collar') || slug.includes('shock-collar') || slug.includes('no-scratch') || slug.includes('fly-repellent') || slug.includes('dental-water')) return 'dog-accessories';
  if (slug.includes('chew-bone') || slug.includes('bones-teething')) return 'dog-toys';

  return 'uncategorized';
}

function extractArticleBody(html) {
  // Try common WordPress content wrappers
  const selectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div[^>]*class=["'][^"']*(?:post-tags|comments|related|share|author-box))/i,
    /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<(?:footer|aside|nav|section)/i,
    /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*post-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*content-area[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const regex of selectors) {
    const match = html.match(regex);
    if (match && match[1].length > 200) {
      return match[1];
    }
  }

  // Fallback: get everything between </header> and <footer
  const fallback = html.match(/<\/header>([\s\S]*?)<footer/i);
  if (fallback) return fallback[1];

  return '';
}

function extractPageBody(html) {
  // For static pages, try page-specific wrappers first
  const selectors = [
    /<div[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*page-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const regex of selectors) {
    const match = html.match(regex);
    if (match && match[1].length > 50) {
      return match[1];
    }
  }

  return '';
}

function extractAmazonLinks(html) {
  const links = new Set();

  // Match amzn.to shortlinks
  const shortLinkRegex = /https?:\/\/amzn\.to\/[A-Za-z0-9]+/g;
  let match;
  while ((match = shortLinkRegex.exec(html)) !== null) {
    links.add(match[0]);
  }

  // Match full Amazon links with affiliate tag
  const fullLinkRegex = /https?:\/\/(?:www\.)?amazon\.com[^\s"'<>]*tag=petslife-20[^\s"'<>]*/g;
  while ((match = fullLinkRegex.exec(html)) !== null) {
    let link = match[0];
    // Clean up trailing entities or garbage
    link = link.replace(/&amp;/g, '&');
    links.add(link);
  }

  // Also grab any amazon.com product links (may not have tag)
  const amazonProductRegex = /https?:\/\/(?:www\.)?amazon\.com\/[^\s"'<>]+/g;
  while ((match = amazonProductRegex.exec(html)) !== null) {
    let link = match[0];
    link = link.replace(/&amp;/g, '&');
    links.add(link);
  }

  return [...links];
}

function extractImageUrls(html) {
  const images = new Set();
  const imgRegex = /https?:\/\/[^"'<>\s]*wp-content\/uploads\/[^"'<>\s]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    let url = match[0];
    // Clean up any HTML entities in URL
    url = url.replace(/&amp;/g, '&');
    images.add(url);
  }
  return [...images];
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&nbsp;/g, ' ');
}

// ---------------------------------------------------------------------------
// Category scraping
// ---------------------------------------------------------------------------

async function scrapeCategory(url) {
  const slug = url.match(/\/category\/([^/]+)/)?.[1] || 'unknown';
  try {
    const html = await fetchPage(url);
    const title = extractTitle(html);
    const description = extractMetaDescription(html);

    // Extract post links from category archive
    const postLinks = [];
    const linkRegex = /<a[^>]*href=["'](https?:\/\/www\.pets-life\.com\/[^"']+)["'][^>]*>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      // Filter to post-like URLs (not category, tag, author, page, wp-content)
      if (
        !href.includes('/category/') &&
        !href.includes('/tag/') &&
        !href.includes('/author/') &&
        !href.includes('/page/') &&
        !href.includes('/wp-content/') &&
        !href.includes('/wp-admin/') &&
        !href.includes('/feed/') &&
        href !== 'https://www.pets-life.com/' &&
        href !== BASE_URL
      ) {
        postLinks.push(href);
      }
    }

    return {
      slug,
      url,
      title,
      description,
      postLinks: [...new Set(postLinks)],
    };
  } catch (err) {
    console.log(`  \u26A0\uFE0F  Category error (${slug}): ${err.message}`);
    return { slug, url, title: slug, description: '', postLinks: [] };
  }
}

// ---------------------------------------------------------------------------
// Post scraping
// ---------------------------------------------------------------------------

async function scrapePost(url) {
  const slug = slugFromUrl(url);
  console.log(`  \uD83D\uDCC4 Scraping post: ${slug}`);

  try {
    const html = await fetchPage(url);

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const publishDate = extractPublishDate(html);
    const author = extractAuthor(html);
    const category = extractCategory(html, url);
    const amazonLinks = extractAmazonLinks(html);
    const imageUrls = extractImageUrls(html);

    const bodyHtml = extractArticleBody(html);
    const bodyMarkdown = htmlToMarkdown(bodyHtml);

    return {
      slug,
      url,
      title,
      description,
      publishDate,
      author,
      category,
      bodyHtml: bodyHtml.substring(0, 500000), // cap stored HTML size
      bodyMarkdown,
      amazonLinks,
      imageUrls,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.log(`  \u274C Error scraping ${slug}: ${err.message}`);
    return {
      slug,
      url,
      title: slug,
      description: '',
      publishDate: '',
      author: 'Tina Samolie',
      category: 'uncategorized',
      bodyHtml: '',
      bodyMarkdown: '',
      amazonLinks: [],
      imageUrls: [],
      error: err.message,
      scrapedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Page scraping
// ---------------------------------------------------------------------------

async function scrapePage(url) {
  const slug = slugFromUrl(url);
  console.log(`  \uD83D\uDCC3 Scraping page: ${slug}`);

  try {
    const html = await fetchPage(url);

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const imageUrls = extractImageUrls(html);

    const bodyHtml = extractPageBody(html);
    const bodyMarkdown = htmlToMarkdown(bodyHtml);

    return {
      slug,
      url,
      title,
      description,
      bodyHtml: bodyHtml.substring(0, 500000),
      bodyMarkdown,
      imageUrls,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.log(`  \u274C Error scraping page ${slug}: ${err.message}`);
    return {
      slug,
      url,
      title: slug,
      description: '',
      bodyHtml: '',
      bodyMarkdown: '',
      imageUrls: [],
      error: err.message,
      scrapedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('\uD83D\uDC3E  Pets-Life.com Site Scraper');
  console.log('='.repeat(60));
  console.log(`\uD83D\uDCC5 Started at: ${new Date().toISOString()}`);
  console.log(`\uD83D\uDCCA Posts: ${POST_URLS.length} | Pages: ${PAGE_URLS.length} | Categories: ${CATEGORY_URLS.length}`);
  console.log();

  // Create output directories
  await mkdir(POSTS_DIR, { recursive: true });
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(IMAGES_DIR, { recursive: true });
  console.log('\uD83D\uDCC1 Created output directories under ./scraped/');
  console.log();

  const manifest = {
    site: BASE_URL,
    scrapedAt: new Date().toISOString(),
    posts: [],
    pages: [],
    categories: [],
    images: [],
    errors: [],
  };

  // -----------------------------------------------------------------------
  // Phase 1: Scrape categories
  // -----------------------------------------------------------------------
  console.log('\u2500'.repeat(60));
  console.log('\uD83C\uDFF7\uFE0F  Phase 1: Scraping categories');
  console.log('\u2500'.repeat(60));

  for (let i = 0; i < CATEGORY_URLS.length; i++) {
    const url = CATEGORY_URLS[i];
    const slug = CATEGORY_SLUGS[i];
    console.log(`  [${i + 1}/${CATEGORY_URLS.length}] Category: ${slug}`);

    const categoryData = await scrapeCategory(url);
    manifest.categories.push(categoryData);

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\u2705 Scraped ${manifest.categories.length} categories`);
  console.log();

  // -----------------------------------------------------------------------
  // Phase 2: Scrape posts
  // -----------------------------------------------------------------------
  console.log('\u2500'.repeat(60));
  console.log('\uD83D\uDCDD Phase 2: Scraping blog posts');
  console.log('\u2500'.repeat(60));

  for (let i = 0; i < POST_URLS.length; i++) {
    const url = POST_URLS[i];
    console.log(`  [${i + 1}/${POST_URLS.length}]`);

    const postData = await scrapePost(url);

    // Save post JSON
    const postFilePath = join(POSTS_DIR, `${postData.slug}.json`);
    await writeFile(postFilePath, JSON.stringify(postData, null, 2), 'utf-8');

    manifest.posts.push({
      slug: postData.slug,
      url: postData.url,
      title: postData.title,
      category: postData.category,
      publishDate: postData.publishDate,
      author: postData.author,
      amazonLinkCount: postData.amazonLinks.length,
      imageCount: postData.imageUrls.length,
      hasError: !!postData.error,
    });

    if (postData.error) {
      manifest.errors.push({ type: 'post', slug: postData.slug, url, error: postData.error });
    }

    // Collect images for later download
    for (const imgUrl of postData.imageUrls) {
      if (!manifest.images.includes(imgUrl)) {
        manifest.images.push(imgUrl);
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\u2705 Scraped ${manifest.posts.length} posts`);
  console.log();

  // -----------------------------------------------------------------------
  // Phase 3: Scrape pages
  // -----------------------------------------------------------------------
  console.log('\u2500'.repeat(60));
  console.log('\uD83D\uDCC3 Phase 3: Scraping static pages');
  console.log('\u2500'.repeat(60));

  for (let i = 0; i < PAGE_URLS.length; i++) {
    const url = PAGE_URLS[i];
    console.log(`  [${i + 1}/${PAGE_URLS.length}]`);

    const pageData = await scrapePage(url);

    // Save page JSON
    const pageFilePath = join(PAGES_DIR, `${pageData.slug}.json`);
    await writeFile(pageFilePath, JSON.stringify(pageData, null, 2), 'utf-8');

    manifest.pages.push({
      slug: pageData.slug,
      url: pageData.url,
      title: pageData.title,
      imageCount: pageData.imageUrls.length,
      hasError: !!pageData.error,
    });

    if (pageData.error) {
      manifest.errors.push({ type: 'page', slug: pageData.slug, url, error: pageData.error });
    }

    // Collect images
    for (const imgUrl of pageData.imageUrls) {
      if (!manifest.images.includes(imgUrl)) {
        manifest.images.push(imgUrl);
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\u2705 Scraped ${manifest.pages.length} pages`);
  console.log();

  // -----------------------------------------------------------------------
  // Phase 4: Download images
  // -----------------------------------------------------------------------
  console.log('\u2500'.repeat(60));
  console.log('\uD83D\uDDBC\uFE0F  Phase 4: Downloading images');
  console.log('\u2500'.repeat(60));
  console.log(`  Found ${manifest.images.length} unique images to download`);

  const downloadedImages = [];
  const failedImages = [];

  for (let i = 0; i < manifest.images.length; i++) {
    const imgUrl = manifest.images[i];
    const filename = basename(new URL(imgUrl).pathname);
    console.log(`  [${i + 1}/${manifest.images.length}] ${filename}`);

    const result = await downloadImage(imgUrl, IMAGES_DIR);
    if (result) {
      downloadedImages.push({ url: imgUrl, filename: result });
    } else {
      failedImages.push(imgUrl);
    }

    // Rate limit image downloads too, but faster
    await sleep(300);
  }

  console.log(`\u2705 Downloaded ${downloadedImages.length} images (${failedImages.length} failed)`);
  console.log();

  // -----------------------------------------------------------------------
  // Phase 5: Write manifest
  // -----------------------------------------------------------------------
  console.log('\u2500'.repeat(60));
  console.log('\uD83D\uDCCB Phase 5: Writing manifest');
  console.log('\u2500'.repeat(60));

  const finalManifest = {
    site: BASE_URL,
    scrapedAt: manifest.scrapedAt,
    completedAt: new Date().toISOString(),
    summary: {
      totalPosts: manifest.posts.length,
      totalPages: manifest.pages.length,
      totalCategories: manifest.categories.length,
      totalImages: manifest.images.length,
      downloadedImages: downloadedImages.length,
      failedImages: failedImages.length,
      errors: manifest.errors.length,
    },
    posts: manifest.posts,
    pages: manifest.pages,
    categories: manifest.categories,
    downloadedImages,
    failedImages,
    errors: manifest.errors,
  };

  const manifestPath = join(SCRAPED_DIR, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(finalManifest, null, 2), 'utf-8');
  console.log(`  \u2705 Manifest saved to ${manifestPath}`);
  console.log();

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('='.repeat(60));
  console.log('\uD83C\uDFC1 Scraping Complete!');
  console.log('='.repeat(60));
  console.log(`  \uD83D\uDCDD Posts scraped:    ${manifest.posts.length}`);
  console.log(`  \uD83D\uDCC3 Pages scraped:    ${manifest.pages.length}`);
  console.log(`  \uD83C\uDFF7\uFE0F  Categories:       ${manifest.categories.length}`);
  console.log(`  \uD83D\uDDBC\uFE0F  Images downloaded: ${downloadedImages.length}/${manifest.images.length}`);
  console.log(`  \u274C Errors:           ${manifest.errors.length}`);
  console.log(`  \uD83D\uDCC5 Completed at:     ${new Date().toISOString()}`);
  console.log();

  if (manifest.errors.length > 0) {
    console.log('\u26A0\uFE0F  Errors encountered:');
    for (const err of manifest.errors) {
      console.log(`    - [${err.type}] ${err.slug}: ${err.error}`);
    }
    console.log();
  }

  console.log('\uD83D\uDCC2 Output directory: ./scraped/');
  console.log('   \u251C\u2500\u2500 posts/       (JSON files for each blog post)');
  console.log('   \u251C\u2500\u2500 pages/       (JSON files for each static page)');
  console.log('   \u251C\u2500\u2500 images/      (downloaded images)');
  console.log('   \u2514\u2500\u2500 manifest.json');
}

main().catch((err) => {
  console.error('\uD83D\uDCA5 Fatal error:', err);
  process.exit(1);
});
