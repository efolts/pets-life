// Pets Life Content Generator - Frontend

let currentArticle = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('btnResearch').addEventListener('click', runResearch);
  document.getElementById('btnGenerate').addEventListener('click', generateArticle);
  document.getElementById('btnPublish').addEventListener('click', publishArticle);
}

// Load system status
async function loadStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    // Update dashboard
    document.getElementById('totalKeywords').textContent = data.keywords.total || 0;
    document.getElementById('publishedCount').textContent = data.keywords.published || 0;
    document.getElementById('remainingKeywords').textContent = data.keywords.remaining || 0;

    // Update status text
    if (data.keywords.total === 0) {
      document.getElementById('keywordsStatus').textContent = 'Run research to find keywords';
    } else {
      document.getElementById('keywordsStatus').textContent = `${data.keywords.remaining} ready to generate`;
    }

    // Check configuration
    const missing = [];
    if (!data.configured.gemini) missing.push('Gemini API key');
    if (!data.configured.keywords) missing.push('Keywords Everywhere API key');

    if (missing.length > 0) {
      const warning = document.getElementById('configWarning');
      warning.textContent = `⚠️ Missing configuration: ${missing.join(', ')}. Add to .env file.`;
      warning.style.display = 'block';
    }

    // Enable/disable buttons
    document.getElementById('btnGenerate').disabled = data.keywords.remaining === 0 || !data.configured.gemini;

    // Load keywords and articles
    if (data.keywords.total > 0) {
      loadKeywords();
      loadArticles();
    }

  } catch (error) {
    showStatus('error', 'Failed to load status: ' + error.message);
  }
}

// Run keyword research
async function runResearch() {
  const btn = document.getElementById('btnResearch');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> <span>Researching...</span>';

  showStatus('loading', '🔍 Running keyword research... This may take 1-2 minutes.');

  try {
    const response = await fetch('/api/research', { method: 'POST' });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    // Poll for results
    let attempts = 0;
    const checkResults = setInterval(async () => {
      attempts++;
      const keywordsResponse = await fetch('/api/keywords');
      const keywordsData = await keywordsResponse.json();

      if (keywordsData.keywords.length > 0 || attempts > 60) {
        clearInterval(checkResults);

        if (keywordsData.keywords.length > 0) {
          showStatus('success', `✓ Found ${keywordsData.keywords.length} keyword opportunities!`);
          loadStatus();
          loadKeywords();
        } else {
          showStatus('error', 'Research completed but no keywords found. Try adjusting search criteria.');
        }

        btn.disabled = false;
        btn.innerHTML = '<span>🔍</span> <span>Run Keyword Research</span>';
      }
    }, 2000);

  } catch (error) {
    showStatus('error', 'Research failed: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<span>🔍</span> <span>Run Keyword Research</span>';
  }
}

// Generate article
async function generateArticle() {
  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> <span>Generating...</span>';

  showStatus('loading', '✍️ Generating article with Gemini... This takes ~30-60 seconds.');

  try {
    const response = await fetch('/api/generate', { method: 'POST' });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    currentArticle = data;

    // Show preview
    document.getElementById('preview').classList.add('show');
    document.getElementById('previewTitle').textContent = data.title;
    document.getElementById('previewKeyword').textContent = data.keyword;
    document.getElementById('previewWordCount').textContent = data.wordCount;
    document.getElementById('previewProducts').textContent = data.products.length;
    document.getElementById('previewContent').innerHTML = formatMarkdown(data.content);

    // Enable publish button
    document.getElementById('btnPublish').disabled = false;

    showStatus('success', `✓ Article generated: "${data.title}" (${data.wordCount} words)`);

    // Scroll to preview
    document.getElementById('preview').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    showStatus('error', 'Generation failed: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✍️</span> <span>Generate Article</span>';
  }
}

// Publish article
async function publishArticle() {
  if (!currentArticle) {
    showStatus('error', 'No article to publish');
    return;
  }

  const btn = document.getElementById('btnPublish');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> <span>Publishing...</span>';

  showStatus('loading', '🚀 Publishing to GitHub...');

  try {
    const response = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: currentArticle.filePath,
        title: currentArticle.title,
      }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    showStatus('success', '✓ Published to GitHub! Cloudflare Pages will auto-deploy in ~2 minutes.');

    // Reset
    currentArticle = null;
    document.getElementById('preview').classList.remove('show');
    btn.disabled = true;
    btn.innerHTML = '<span>🚀</span> <span>Publish to GitHub</span>';

    // Reload status and articles
    setTimeout(() => {
      loadStatus();
      loadArticles();
    }, 1000);

  } catch (error) {
    showStatus('error', 'Publish failed: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = '<span>🚀</span> <span>Publish to GitHub</span>';
  }
}

// Load keywords table
async function loadKeywords() {
  try {
    const response = await fetch('/api/keywords');
    const data = await response.json();

    if (data.keywords.length === 0) return;

    const tbody = document.getElementById('keywordsBody');
    tbody.innerHTML = '';

    data.keywords.slice(0, 20).forEach(kw => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><strong>${kw.keyword}</strong></td>
        <td>${kw.volume.toLocaleString()}</td>
        <td>${(kw.competition * 100).toFixed(0)}%</td>
        <td><span class="badge badge-${kw.difficulty === 'Very Easy' || kw.difficulty === 'Easy' ? 'success' : 'warning'}">${kw.difficulty}</span></td>
        <td>${kw.published ? '<span class="badge badge-info">Published</span>' : '<span class="badge badge-success">Ready</span>'}</td>
      `;
    });

    document.getElementById('keywordsSection').style.display = 'block';

  } catch (error) {
    console.error('Failed to load keywords:', error);
  }
}

// Load articles
async function loadArticles() {
  try {
    const response = await fetch('/api/articles');
    const data = await response.json();

    if (data.articles.length === 0) return;

    const list = document.getElementById('articlesList');
    list.innerHTML = '';

    data.articles.slice(0, 10).forEach(article => {
      const div = document.createElement('div');
      div.className = 'article-item';
      div.innerHTML = `
        <div class="article-info">
          <h4>${article.title}</h4>
          <div class="article-meta">
            <span class="badge badge-info">${article.category}</span>
            ${article.date ? `• ${new Date(article.date).toLocaleDateString()}` : ''}
          </div>
        </div>
      `;
      list.appendChild(div);
    });

    document.getElementById('articlesSection').style.display = 'block';

  } catch (error) {
    console.error('Failed to load articles:', error);
  }
}

// Show status message
function showStatus(type, message) {
  const status = document.getElementById('status');
  status.className = `status show ${type}`;
  status.textContent = message;
}

// Simple markdown to HTML converter
function formatMarkdown(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p><h/g, '<h')
    .replace(/<\/h\d><\/p>/g, (match) => match.replace(/<\/?p>/g, ''));
}
