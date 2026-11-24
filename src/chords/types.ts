import { z } from 'zod';
const sixNumbers = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]);
export type Six<T> = readonly [T, T, T, T, T, T];
export const voicingSchema = z.object({
  id: z.string(), root: z.string(), suffix: z.string(), label: z.string(),
  frets: sixNumbers, fingers: sixNumbers, barres: z.array(z.number()),
});
export type Voicing = z.infer<typeof voicingSchema>;
