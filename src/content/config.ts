import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    category: z.string(),
    keywords: z.array(z.string()).default([]),
    products: z.array(
      z.union([
        z.string(),
        z.object({
          asin: z.string(),
          title: z.string(),
          description: z.string().optional(),
          imageUrl: z.string().optional(),
          affiliateUrl: z.string().optional(),
        })
      ])
    ).default([]),
    author: z.string().default('Pets Life Team'),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
