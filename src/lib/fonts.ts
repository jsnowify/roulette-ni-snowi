import catalog from '../data/googleFonts.json' with { type: 'json' };

// Snapshot sourced from https://fonts.google.com/metadata/fonts.
export const GOOGLE_FONTS = catalog;
export const fontByName = new Map(GOOGLE_FONTS.map(font => [font.name, font]));

export function fontStack(name: string): string {
  const category = fontByName.get(name)?.category;
  const fallback = category === 'Serif' ? 'Georgia, serif' : category === 'Monospace' ? 'monospace' : 'Arial, sans-serif';
  return `"${name}", ${fallback}`;
}

export function googleFontsUrl(names: readonly string[]): string {
  const families = [...new Set(names)].sort().map(name => {
    const font = fontByName.get(name);
    if (!font) throw new Error('Unknown font family');
    return `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@${font.weights.join(';')}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}
