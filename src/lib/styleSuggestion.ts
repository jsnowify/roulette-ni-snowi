import type { BriefLike } from './brief';

export function suggestedStyle(brief: BriefLike | null): number {
  if (!brief) return 0;
  const match = (text: string): number | null => {
    if (/luxur|elegant|retro|warm|nostalg|editorial/i.test(text)) return 1;
    if (/dark|futur|industrial|mysterious|serious|tech|software/i.test(text)) return 2;
    if (/organic|calm|nature|health|food|wellness|sustain/i.test(text)) return 3;
    if (/dreamy|quirky|art|creative|portfolio/i.test(text)) return 4;
    if (/playful|bold|brutalist|energetic|game|sport/i.test(text)) return 5;
    if (/clean|minimal|business|corporate/i.test(text)) return 0;
    return null;
  };
  const direction = match(brief.mood ?? '') ?? match(brief.category);
  if (direction !== null) return direction;
  let hash = 0;
  for (const char of `${brief.brand}:${brief.category}`) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return hash % 6;
}
