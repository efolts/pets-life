export const SITE_CONFIG = {
  title: 'Pets Life',
  description: 'Independent pet product discovery. We highlight what\'s working for real pet owners.',
  url: 'https://www.pets-life.com',
  author: 'Pets Life Team',

  // Amazon Associates
  amazonTag: import.meta.env.AMAZON_AFFILIATE_TAG || 'petslife-20',

  // Affiliate disclosure
  affiliateDisclosure: 'Pets Life is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. As an Amazon Associate, we earn from qualifying purchases at no extra cost to you.',

  // Contact
  email: 'admin@pets-life.com',

  // Navigation
  nav: [
    { name: 'Trending This Week', path: '/trending-pet-products-this-week/' },
    { name: 'Dogs', path: '/trends/dogs/' },
    { name: 'Cats', path: '/trends/cats/' },
    { name: 'About', path: '/about/' }
  ],

  // Footer links
  footer: [
    { name: 'About', path: '/about/' },
    { name: 'Contact', path: '/contact/' },
    { name: 'Privacy Policy', path: '/privacy-policy/' },
    { name: 'Affiliate Disclosure', path: '/affiliate-disclosure/' },
    { name: 'Sitemap', path: '/sitemap-index.xml' }
  ],

  // Categories
  categories: [
    { name: 'Dog Food', slug: 'dog-food' },
    { name: 'Dog Treats', slug: 'dog-treats' },
    { name: 'Dog Toys', slug: 'dog-toys' },
    { name: 'Dog Health', slug: 'dog-health' },
    { name: 'Dog Grooming', slug: 'dog-grooming' },
    { name: 'Dog Beds', slug: 'dog-beds' },
    { name: 'Dog Training', slug: 'dog-training' },
    { name: 'Dog Accessories', slug: 'dog-accessories' },
    { name: 'Cat Food', slug: 'cat-food' },
    { name: 'Cat Treats', slug: 'cat-treats' },
    { name: 'Cat Toys', slug: 'cat-toys' },
    { name: 'Cat Health', slug: 'cat-health' },
    { name: 'Cat Grooming', slug: 'cat-grooming' },
    { name: 'Cat Beds', slug: 'cat-beds' },
    { name: 'Cat Litter', slug: 'cat-litter' },
    { name: 'Cat Accessories', slug: 'cat-accessories' },
    { name: 'Small Pets', slug: 'small-pets' },
    { name: 'Fish', slug: 'fish' },
    { name: 'Birds', slug: 'birds' },
    { name: 'Reptiles', slug: 'reptiles' },
    { name: 'Pet Tech', slug: 'pet-tech' },
    { name: 'Pet Travel', slug: 'pet-travel' },
    { name: 'Pet Safety', slug: 'pet-safety' },
    { name: 'Pet Wellness', slug: 'pet-wellness' }
  ]
};

export const SEO_CONFIG = {
  defaultOgImage: '/og-image.jpg',
  twitterCard: 'summary_large_image' as const
};

/**
 * Generate Amazon affiliate link
 */
export function getAffiliateLink(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${SITE_CONFIG.amazonTag}&linkCode=ogi&th=1&psc=1`;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}
