export const PREVIEW_FIELDS = [
  { key: 'tag', label: 'Eyebrow text', limit: 40, default: 'A BRAND IN PROGRESS' },
  { key: 'heading', label: 'Headline', limit: 100, default: 'Make the unexpected yours.' },
  { key: 'body', label: 'Description', limit: 300, default: 'One assigned direction. A complete identity, digital experience, and final showcase built from scratch in seven days.' },
  { key: 'cta', label: 'Button text', limit: 40, default: 'Meet the brand' },
] as const;
export type PreviewKey = typeof PREVIEW_FIELDS[number]['key'];
export const DEFAULT_PREVIEW = Object.fromEntries(PREVIEW_FIELDS.map(field => [field.key, field.default])) as Record<PreviewKey, string>;

export function limitPreviewText(text: string, limit: number): string {
  // Single-line fields, bounded in both the DOM and state. Never render user HTML.
  // eslint-disable-next-line no-control-regex -- Strip pasted control characters from preview copy.
  return text.slice(0, limit).replace(/[\u0000-\u001f\u007f]/g, ' ');
}
