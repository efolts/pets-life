/**
 * Keyword Research Script
 * Uses Keywords Everywhere API to find low-competition small pet keywords
 */

import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config();

const API_KEY = process.env.KEYWORDS_EVERYWHERE_API_KEY;
const API_ENDPOINT = 'https://api.keywordseverywhere.com/v1/get_keyword_data';

// Seed keywords for small pets (long-tail focused)
const SEED_KEYWORDS = [
  // Hamsters
  'best hamster wheel',
  'silent hamster wheel',
  'hamster cage setup',
  'dwarf hamster food',
  'hamster bedding safe',
  'hamster toys diy',
  'best hamster cage',
  'hamster water bottle',

  // Guinea Pigs
  'guinea pig cage size',
  'best guinea pig food',
  'guinea pig fleece bedding',
  'guinea pig hay rack',
  'guinea pig water bottle',
  'guinea pig hideout',
  'c&c cage guinea pig',
  'guinea pig vitamins',

  // Rabbits
  'best rabbit litter',
  'rabbit hay feeder',
  'indoor rabbit cage',
  'rabbit grooming tools',
  'rabbit nail clippers',
  'rabbit water bowl',
  'best rabbit pellets',
  'rabbit chew toys',

  // Ferrets
  'ferret cage best',
  'ferret hammock',
  'ferret litter box',
  'ferret food high protein',
  'ferret toys interactive',
  'ferret harness leash',

  // Chinchillas
  'chinchilla dust bath',
  'best chinchilla food',
  'chinchilla cage multi level',
  'chinchilla chew toys',
  'chinchilla cooling stone',
  'chinchilla hay rack',

  // Birds
  'quiet bird species',
  'best budgie cage',
  'cockatiel food pellets',
  'parakeet toys',
  'bird cage cover',
  'bird perch natural',
  'cockatiel nesting box',

  // Gerbils
  'gerbil cage setup',
  'best gerbil bedding',
  'gerbil wheel size',
  'gerbil chew toys',

  // Rats
  'best rat cage',
  'rat hammock',
  'rat food mix',
  'rat chew toys'
];

/**
 * Fetch keyword data from Keywords Everywhere API
 */
async function getKeywordData(keywords) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      country: 'us',
      currency: 'USD',
      dataSource: 'gkp',
      'kw[]': keywords
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Analyze keywords and score them for opportunity
 */
function analyzeKeywords(data) {
  const opportunities = [];

  for (const [keyword, metrics] of Object.entries(data.data || {})) {
    const volume = metrics.vol || 0;
    const competition = metrics.competition || 1;
    const cpc = parseFloat(metrics.cpc?.value || 0);

    // Opportunity score formula
    // Higher volume + lower competition + decent CPC = better
    const opportunityScore = (volume / 100) * (1 - competition) * (cpc > 0.5 ? 1.5 : 1);

    // Filter criteria
    const isGoodOpportunity =
      volume >= 100 &&        // Minimum traffic
      volume <= 5000 &&       // Not too competitive
      competition <= 0.3 &&   // Low competition
      cpc >= 0.3;            // Some commercial intent

    if (isGoodOpportunity) {
      opportunities.push({
        keyword,
        volume,
        competition,
        cpc,
        opportunityScore: Math.round(opportunityScore * 100) / 100,
        difficulty: competition < 0.1 ? 'Very Easy' :
                   competition < 0.2 ? 'Easy' :
                   competition < 0.3 ? 'Medium' : 'Hard'
      });
    }
  }

  // Sort by opportunity score (best first)
  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

/**
 * Generate article ideas from top keywords
 */
function generateArticleIdeas(opportunities) {
  const ideas = [];

  opportunities.slice(0, 20).forEach(opp => {
    const keyword = opp.keyword;

    // Generate article title variations
    let title, type;

    if (keyword.includes('best')) {
      title = keyword.charAt(0).toUpperCase() + keyword.slice(1) + ' 2026: Top 7 Picks';
      type = 'roundup';
    } else if (keyword.includes('vs')) {
      const parts = keyword.split(' vs ');
      title = `${parts[0]} vs ${parts[1]}: Which Is Better?`;
      type = 'comparison';
    } else {
      // Convert to "Best X for Y" format
      const words = keyword.split(' ');
      title = `Best ${words.slice(1).join(' ').charAt(0).toUpperCase() + words.slice(1).join(' ').slice(1)} for ${words[0].charAt(0).toUpperCase() + words[0].slice(1)}s`;
      type = 'buying-guide';
    }

    ideas.push({
      title,
      keyword,
      type,
      ...opp
    });
  });

  return ideas;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Starting keyword research for small pets...\n');

  // Split into batches of 100 (API limit)
  const batches = [];
  for (let i = 0; i < SEED_KEYWORDS.length; i += 100) {
    batches.push(SEED_KEYWORDS.slice(i, i + 100));
  }

  let allOpportunities = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`📊 Fetching batch ${i + 1}/${batches.length} (${batches[i].length} keywords)...`);

    try {
      const data = await getKeywordData(batches[i]);
      const opportunities = analyzeKeywords(data);
      allOpportunities = allOpportunities.concat(opportunities);

      console.log(`✅ Found ${opportunities.length} good opportunities in this batch\n`);

      // Rate limit: wait 1 second between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Error fetching batch ${i + 1}:`, error.message);
    }
  }

  // Sort all opportunities
  allOpportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Generate article ideas
  const articleIdeas = generateArticleIdeas(allOpportunities);

  // Output results
  console.log('\n🎯 TOP 10 KEYWORD OPPORTUNITIES:\n');
  console.log('Rank | Keyword                          | Volume | Comp  | CPC   | Score | Difficulty');
  console.log('-----|----------------------------------|--------|-------|-------|-------|------------');

  allOpportunities.slice(0, 10).forEach((opp, i) => {
    console.log(
      `${String(i + 1).padStart(4)} | ` +
      `${opp.keyword.padEnd(32)} | ` +
      `${String(opp.volume).padStart(6)} | ` +
      `${opp.competition.toFixed(2).padStart(5)} | ` +
      `$${opp.cpc.toFixed(2).padStart(4)} | ` +
      `${String(opp.opportunityScore).padStart(5)} | ` +
      `${opp.difficulty}`
    );
  });

  console.log('\n📝 TOP 10 ARTICLE IDEAS:\n');
  articleIdeas.slice(0, 10).forEach((idea, i) => {
    console.log(`${i + 1}. ${idea.title}`);
    console.log(`   Keyword: "${idea.keyword}" | Volume: ${idea.volume} | Competition: ${idea.competition.toFixed(2)} | Score: ${idea.opportunityScore}`);
    console.log('');
  });

  // Save results to JSON
  const output = {
    generatedAt: new Date().toISOString(),
    totalKeywordsAnalyzed: SEED_KEYWORDS.length,
    opportunitiesFound: allOpportunities.length,
    topOpportunities: allOpportunities.slice(0, 50),
    articleIdeas: articleIdeas.slice(0, 20)
  };

  writeFileSync(
    './keyword-research-results.json',
    JSON.stringify(output, null, 2)
  );

  console.log('💾 Results saved to keyword-research-results.json');
  console.log(`\n✨ Analysis complete! Found ${allOpportunities.length} opportunities from ${SEED_KEYWORDS.length} keywords.`);
}

main().catch(console.error);
