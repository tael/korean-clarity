import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '0*-*.md', base: '../docs' }),
  schema: z.object({}).passthrough().optional(),
});

export const collections = { docs };
