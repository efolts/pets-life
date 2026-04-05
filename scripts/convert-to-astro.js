import 'dotenv/config';
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRAPED_DIR = join(ROOT, 'scraped');
const POSTS_DIR = join(SCRAPED_DIR, 'posts');
const PAGES_DIR = join(SCRAPED_DIR, 'pages');
const IMAGES_SRC_DIR = join(SCRAPED_DIR, 'images');

const BLOG_OUTPUT_DIR = join(ROOT, 'src', 'content', 'blog');
const PAGES_OUTPUT_DIR = join(ROOT, 'src', 'pages');
const IMAGES_OUTPUT_DIR = join(ROOT, 'public', 'images');

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeYamlString(str) {
  if (!str) return '""';
  // If string contains special YAML chars, wrap in double quotes and escape internal quotes
  if (
    str.includes(':') ||
    str.includes('#') ||
    str.includes("'") ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('[') ||
    str.includes(']') ||
    str.includes('{') ||
    str.includes('}') ||
    str.includes('&') ||
    str.includes('*') ||
    str.includes('!') ||
    str.includes('|') ||
    str.includes('>') ||
    str.includes('%') ||
    str.includes('@') ||
    str.includes('`')
  ) {
    const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return `"${str}"`;
}

function formatDate(dateStr) {
  if (!dateStr) return new Date('2018-01-01').toISOString();

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date('2018-01-01').toISOString();
    return d.toISOString();
  } catch {
    return new Date('2018-01-01').toISOString();
  }
}

function rewriteImagePaths(markdown) {
  // Replace all wp-content/uploads image paths with /images/filename
  return markdown.replace(
    /!\[([^\]]*)\]\(https?:\/\/[^)]*wp-content\/uploads\/[^)]*\/([^/)]+)\)/g,
    '![$1](/images/$2)'
  );
}

function rewriteInternalLinks(markdown) {
  // Rewrite internal pets-life.com links to relative paths
  let result = markdown;

  // Post links: https://www.pets-life.com/slug/ -> /blog/slug/
  result = result.replace(
    /\[([^\]]*)\]\(https?:\/\/(?:www\.)?pets-life\.com\/(?!category\/)(?!tag\/)(?!author\/)(?!wp-content\/)(?!wp-admin\/)(?!feed\/)([\w-]+)\/?\)/g,
    (match, text, slug) => {
      // Check if it is a known page slug
      const knownPages = [
        'about', 'contact', 'privacy-policy', 'affiliate-disclosure',
        'trending-pet-products-this-week', 'trends',
      ];
      if (knownPages.includes(slug)) {
        return `[${text}](/${slug}/)`;
      }
      return `[${text}](/blog/${slug}/)`;
    }
  );

  // Category links
  result = result.replace(
    /\[([^\]]*)\]\(https?:\/\/(?:www\.)?pets-life\.com\/category\/([\w-]+)\/?\)/g,
    '[$1](/category/$2/)'
  );

  // Home page link
  result = result.replace(
    /\[([^\]]*)\]\(https?:\/\/(?:www\.)?pets-life\.com\/?\)/g,
    '[$1](/)'
  );

  return result;
}

function cleanMarkdownContent(markdown) {
  if (!markdown) return '';

  let cleaned = markdown;

  // Rewrite image paths
  cleaned = rewriteImagePaths(cleaned);

  // Rewrite internal links (but preserve Amazon links)
  cleaned = rewriteInternalLinks(cleaned);

  // Remove any leftover HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

function generateFrontmatter(data) {
  const title = escapeYamlString(data.title || 'Untitled');
  const description = escapeYamlString(data.description || '');
  const publishDate = formatDate(data.publishDate);
  const category = data.category || 'uncategorized';
  const author = escapeYamlString(data.author || 'Tina Samolie');
  const slug = data.slug || '';

  let fm = '---\n';
  fm += `title: ${title}\n`;
  fm += `description: ${description}\n`;
  fm += `publishDate: ${publishDate}\n`;
  fm += `category: "${category}"\n`;
  fm += `author: ${author}\n`;
  fm += `slug: "${slug}"\n`;

  // Include Amazon link count as metadata
  if (data.amazonLinks && data.amazonLinks.length > 0) {
    fm += `affiliateLinks: ${data.amazonLinks.length}\n`;
  }

  // Include featured image if first image exists
  if (data.imageUrls && data.imageUrls.length > 0) {
    const firstImage = basename(new URL(data.imageUrls[0]).pathname);
    fm += `heroImage: "/images/${firstImage}"\n`;
  }

  fm += `draft: false\n`;
  fm += '---\n';

  return fm;
}

function generateAstroPage(pageData) {
  const title = pageData.title || 'Untitled';
  const description = pageData.description || '';
  const body = cleanMarkdownContent(pageData.bodyMarkdown || '');

  // Create an Astro page component
  const astro = `---
// Auto-generated from pets-life.com scrape
const title = ${JSON.stringify(title)};
const description = ${JSON.stringify(description)};
---

<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  <title>{title} | Pets Life</title>
</head>
<body>
  <main>
    <h1>{title}</h1>
    <article set:html={\`${escapeTemplateLiteral(body)}\`} />
  </main>
</body>
</html>
`;

  return astro;
}

function escapeTemplateLiteral(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

// ---------------------------------------------------------------------------
// Main conversion logic
// ---------------------------------------------------------------------------

async function convertPosts() {
  console.log('\uD83D\uDCDD Converting posts to Astro content...');

  if (!existsSync(POSTS_DIR)) {
    console.log('  \u274C Posts directory not found. Run scrape-site.js first.');
    return { converted: 0, errors: 0 };
  }

  await mkdir(BLOG_OUTPUT_DIR, { recursive: true });

  const files = await readdir(POSTS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  let converted = 0;
  let errors = 0;

  for (const file of jsonFiles) {
    const filePath = join(POSTS_DIR, file);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);

      if (data.error && !data.bodyMarkdown) {
        console.log(`  \u26A0\uFE0F  Skipping ${data.slug} (scrape error, no content)`);
        errors++;
        continue;
      }

      const frontmatter = generateFrontmatter(data);
      const content = cleanMarkdownContent(data.bodyMarkdown || '');
      const markdown = `${frontmatter}\n${content}\n`;

      const outputPath = join(BLOG_OUTPUT_DIR, `${data.slug}.md`);
      await writeFile(outputPath, markdown, 'utf-8');

      console.log(`  \u2705 ${data.slug}.md`);
      converted++;
    } catch (err) {
      console.log(`  \u274C Error converting ${file}: ${err.message}`);
      errors++;
    }
  }

  return { converted, errors };
}

async function convertPages() {
  console.log('\uD83D\uDCC3 Converting pages to Astro components...');

  if (!existsSync(PAGES_DIR)) {
    console.log('  \u274C Pages directory not found. Run scrape-site.js first.');
    return { converted: 0, errors: 0 };
  }

  await mkdir(PAGES_OUTPUT_DIR, { recursive: true });

  const files = await readdir(PAGES_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  let converted = 0;
  let errors = 0;

  for (const file of jsonFiles) {
    const filePath = join(PAGES_DIR, file);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);

      if (data.error && !data.bodyMarkdown) {
        console.log(`  \u26A0\uFE0F  Skipping ${data.slug} (scrape error, no content)`);
        errors++;
        continue;
      }

      // Handle nested paths like trends--dogs -> trends/dogs.astro
      let outputSlug = data.slug;

      // The home page becomes index.astro (skip if there is already an index)
      if (outputSlug === 'home') {
        outputSlug = 'index-scraped';
        console.log(`  \u2139\uFE0F  Home page saved as index-scraped.astro (to avoid conflicts)`);
      }

      // Handle nested slugs: trends--dogs -> trends/dogs
      if (outputSlug.includes('--')) {
        const parts = outputSlug.split('--');
        const dir = parts.slice(0, -1).join('/');
        const name = parts[parts.length - 1];
        const nestedDir = join(PAGES_OUTPUT_DIR, dir);
        await mkdir(nestedDir, { recursive: true });
        outputSlug = `${dir}/${name}`;
      }

      const astroContent = generateAstroPage(data);
      const outputPath = join(PAGES_OUTPUT_DIR, `${outputSlug}.astro`);

      // Make sure the parent directory exists
      const parentDir = dirname(outputPath);
      await mkdir(parentDir, { recursive: true });

      await writeFile(outputPath, astroContent, 'utf-8');

      console.log(`  \u2705 ${outputSlug}.astro`);
      converted++;
    } catch (err) {
      console.log(`  \u274C Error converting page ${file}: ${err.message}`);
      errors++;
    }
  }

  return { converted, errors };
}

async function copyImages() {
  console.log('\uD83D\uDDBC\uFE0F  Copying images to public/images/...');

  if (!existsSync(IMAGES_SRC_DIR)) {
    console.log('  \u274C Images directory not found. Run scrape-site.js first.');
    return { copied: 0, errors: 0 };
  }

  await mkdir(IMAGES_OUTPUT_DIR, { recursive: true });

  const files = await readdir(IMAGES_SRC_DIR);
  const imageFiles = files.filter((f) =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f)
  );

  let copied = 0;
  let errors = 0;

  for (const file of imageFiles) {
    try {
      const src = join(IMAGES_SRC_DIR, file);
      const dest = join(IMAGES_OUTPUT_DIR, file);
      await copyFile(src, dest);
      copied++;
    } catch (err) {
      console.log(`  \u274C Error copying ${file}: ${err.message}`);
      errors++;
    }
  }

  console.log(`  \u2705 Copied ${copied} images`);
  return { copied, errors };
}

async function generateCategoryPages() {
  console.log('\uD83C\uDFF7\uFE0F  Generating category pages...');

  const manifestPath = join(SCRAPED_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.log('  \u274C Manifest not found. Run scrape-site.js first.');
    return 0;
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  const categoryDir = join(PAGES_OUTPUT_DIR, 'category');
  await mkdir(categoryDir, { recursive: true });

  let count = 0;

  for (const cat of manifest.categories) {
    const slug = cat.slug;
    const title = cat.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const description = cat.description || `Browse ${title} articles on Pets Life.`;

    // Find posts in this category
    const postsInCategory = manifest.posts.filter((p) => p.category === slug);

    let postListHtml = '';
    if (postsInCategory.length > 0) {
      postListHtml = '<ul>\n';
      for (const p of postsInCategory) {
        postListHtml += `  <li><a href="/blog/${p.slug}/">${escapeTemplateLiteral(p.title)}</a></li>\n`;
      }
      postListHtml += '</ul>';
    } else {
      postListHtml = '<p>No posts found in this category.</p>';
    }

    const astro = `---
// Auto-generated category page for: ${slug}
const title = ${JSON.stringify(title)};
const description = ${JSON.stringify(description)};
---

<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  <title>{title} | Pets Life</title>
</head>
<body>
  <main>
    <h1>{title}</h1>
    <p>{description}</p>
    <section>
      <h2>Articles</h2>
      <Fragment set:html={\`${escapeTemplateLiteral(postListHtml)}\`} />
    </section>
  </main>
</body>
</html>
`;

    const outputPath = join(categoryDir, `${slug}.astro`);
    await writeFile(outputPath, astro, 'utf-8');
    console.log(`  \u2705 category/${slug}.astro (${postsInCategory.length} posts)`);
    count++;
  }

  return count;
}

// ---------------------------------------------------------------------------
// Content collection schema helper
// ---------------------------------------------------------------------------

async function ensureContentConfig() {
  const configPath = join(ROOT, 'src', 'content', 'config.ts');

  if (existsSync(configPath)) {
    console.log('\u2139\uFE0F  Content config already exists at src/content/config.ts');
    return;
  }

  const config = `import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    publishDate: z.coerce.date(),
    category: z.string().default('uncategorized'),
    author: z.string().default('Tina Samolie'),
    slug: z.string().optional(),
    affiliateLinks: z.number().optional(),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
`;

  await mkdir(join(ROOT, 'src', 'content'), { recursive: true });
  await writeFile(configPath, config, 'utf-8');
  console.log('\u2705 Created src/content/config.ts');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('\uD83D\uDE80 Pets-Life.com Astro Converter');
  console.log('='.repeat(60));
  console.log(`\uD83D\uDCC5 Started at: ${new Date().toISOString()}`);
  console.log();

  // Check for scraped data
  if (!existsSync(SCRAPED_DIR)) {
    console.error('\u274C Scraped data not found. Run scrape-site.js first!');
    console.error('   node scripts/scrape-site.js');
    process.exit(1);
  }

  // Ensure content collection config exists
  await ensureContentConfig();
  console.log();

  // Convert posts
  console.log('\u2500'.repeat(60));
  const postResults = await convertPosts();
  console.log();

  // Convert pages
  console.log('\u2500'.repeat(60));
  const pageResults = await convertPages();
  console.log();

  // Generate category pages
  console.log('\u2500'.repeat(60));
  const categoryCount = await generateCategoryPages();
  console.log();

  // Copy images
  console.log('\u2500'.repeat(60));
  const imageResults = await copyImages();
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('\uD83C\uDFC1 Conversion Complete!');
  console.log('='.repeat(60));
  console.log(`  \uD83D\uDCDD Blog posts converted: ${postResults.converted} (${postResults.errors} errors)`);
  console.log(`  \uD83D\uDCC3 Pages converted:      ${pageResults.converted} (${pageResults.errors} errors)`);
  console.log(`  \uD83C\uDFF7\uFE0F  Category pages:      ${categoryCount}`);
  console.log(`  \uD83D\uDDBC\uFE0F  Images copied:        ${imageResults.copied} (${imageResults.errors} errors)`);
  console.log();
  console.log('\uD83D\uDCC2 Output locations:');
  console.log('   \u251C\u2500\u2500 src/content/blog/     (markdown blog posts)');
  console.log('   \u251C\u2500\u2500 src/content/config.ts (content collection schema)');
  console.log('   \u251C\u2500\u2500 src/pages/            (Astro page components)');
  console.log('   \u251C\u2500\u2500 src/pages/category/   (category archive pages)');
  console.log('   \u2514\u2500\u2500 public/images/        (static images)');
  console.log();
  console.log('\uD83D\uDCA1 Next steps:');
  console.log('   1. Review generated markdown files for content quality');
  console.log('   2. Update Astro page templates with your site layout');
  console.log('   3. Verify Amazon affiliate links are preserved');
  console.log('   4. Run "npm run build" to test the Astro build');
  console.log('   5. Check for any broken image references');
}

main().catch((err) => {
  console.error('\uD83D\uDCA5 Fatal error:', err);
  process.exit(1);
});
