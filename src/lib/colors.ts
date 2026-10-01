export function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(start => {
      const value = parseInt(hex.slice(start, start + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

export function mix(from: string, to: string, amount: number): string {
  return '#' + [1, 3, 5].map(start => Math.round(
    parseInt(from.slice(start, start + 2), 16) * (1 - amount) +
    parseInt(to.slice(start, start + 2), 16) * amount,
  ).toString(16).padStart(2, '0')).join('');
}

export function correctText(color: string, background: string, minimum = 4.5): string {
  if (contrast(color, background) >= minimum) return color;
  const end = contrast('#000000', background) > contrast('#ffffff', background) ? '#000000' : '#ffffff';
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(color, end, step / 100);
    if (contrast(candidate, background) >= minimum) return candidate;
  }
  return end;
}

export function buttonText(background: string, ink: string, accent: string): string {
  return contrast(background, accent) >= contrast(ink, accent) ? background : ink;
}

export function correctPalette(colors: readonly string[], count: 2 | 3 | 4): string[] {
  const [background, originalInk, originalAccent] = colors;
  const ink = correctText(originalInk, background);
  const surface = colors[3] ?? background;
  const correctedSurface = count === 4 ? correctText(surface, ink) : surface;
  if (count === 2) return [background, ink, originalAccent, surface];
  const accent = correctText(originalAccent, background, 3);
  // Reuse one of the palette colors for the CTA label, keeping exactly three colors.
  for (let step = 0; step <= 100; step++) {
    const candidate = mix(accent, ink, step / 100);
    if (contrast(candidate, background) >= 3 && contrast(buttonText(background, ink, candidate), candidate) >= 4.5) {
      return [background, ink, candidate, correctedSurface];
    }
  }
  return [background, ink, ink, correctedSurface];
}
