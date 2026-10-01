import { useEffect, useState, type CSSProperties } from 'react';
import { UI_STYLES } from '../data/uiStyles';
import { buttonText, contrast, correctPalette } from '../lib/colors';
import { copyText } from '../lib/clipboard';
import { GOOGLE_FONTS, fontStack, googleFontsUrl } from '../lib/fonts';
import { DEFAULT_PREVIEW, PREVIEW_FIELDS, limitPreviewText } from '../data/previewText';
import FontPicker from './FontPicker';
import { suggestedStyle } from '../lib/styleSuggestion';
import type { BriefLike } from '../lib/brief';

export default function UiStyleGuide({ brief, revision }: { brief: BriefLike | null; revision: number }) {
  const initialStyle = suggestedStyle(brief);
  const [count, setCount] = useState<2 | 3 | 4>(3);
  const [styleIndex, setStyleIndex] = useState(initialStyle);
  const [colors, setColors] = useState<string[]>([...UI_STYLES[initialStyle].colors]);
  const [message, setMessage] = useState('');
  const [headingFont, setHeadingFont] = useState<string>(UI_STYLES[initialStyle].heading);
  const [bodyFont, setBodyFont] = useState<string>(UI_STYLES[initialStyle].body);
  const [previousRevision, setPreviousRevision] = useState(revision);
  const [fontStatus, setFontStatus] = useState('');
  const [previewText, setPreviewText] = useState(DEFAULT_PREVIEW);
  if (previousRevision !== revision) {
    setPreviousRevision(revision);
    setStyleIndex(initialStyle);
    setColors([...UI_STYLES[initialStyle].colors]);
    setHeadingFont(UI_STYLES[initialStyle].heading);
    setBodyFont(UI_STYLES[initialStyle].body);
    setMessage('Palette and fonts matched to your new brief.');
  }
  const style = UI_STYLES[styleIndex];
  const [background, ink] = colors;
  const accent = count >= 3 ? colors[2] : ink;
  const surface = count === 4 ? colors[3] : background;
  const headingStack = fontStack(headingFont);
  const bodyStack = fontStack(bodyFont);
  const fontUrl = googleFontsUrl([headingFont, bodyFont]);
  const label = buttonText(background, ink, accent);
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.dataset.uiFonts = 'true';
    link.onerror = () => setFontStatus('Google Fonts could not load. System fallback fonts are shown.');
    link.onload = () => setFontStatus('');
    document.head.appendChild(link);
    return () => {
      link.onload = null;
      link.onerror = null;
      link.remove();
    };
  }, [fontUrl]);
  const checks = [
    { name: 'Body text', value: contrast(ink, background), minimum: 4.5 },
    { name: 'Button label', value: contrast(label, accent), minimum: 4.5 },
    { name: 'Button against background', value: contrast(accent, background), minimum: 3 },
    ...(count === 4 ? [{ name: 'Text on surface', value: contrast(ink, surface), minimum: 4.5 }] : []),
  ];
  const passes = checks.every(check => check.value >= check.minimum);

  function nextStyle() {
    const next = (styleIndex + 1) % UI_STYLES.length;
    setStyleIndex(next);
    setColors([...UI_STYLES[next].colors]);
    setHeadingFont(UI_STYLES[next].heading);
    setBodyFont(UI_STYLES[next].body);
    setMessage('New palette and font pairing applied.');
  }

  async function copy() {
    const css = `@import url("${fontUrl}");\n\n:root {\n  --ui-background: ${background};\n  --ui-text: ${ink};\n  --ui-accent: ${accent};\n  --ui-on-accent: ${label};\n  --ui-surface: ${surface};\n  --font-heading: ${headingStack};\n  --font-body: ${bodyStack};\n}\n\nbody { background: var(--ui-background); color: var(--ui-text); font-family: var(--font-body); }\nh1, h2, h3 { font-family: var(--font-heading); }\n.ui-card { background: var(--ui-surface); color: var(--ui-text); }\n.primary-button { background: var(--ui-accent); color: var(--ui-on-accent); border: 2px solid var(--ui-accent); }`;
    setMessage(await copyText(css) ? 'CSS copied.' : 'Copy was blocked. You can still use the hex codes and font names below.');
  }

  return (
    <section className="ui-guide" aria-labelledby="ui-guide-title">
      <div className="ui-guide-heading">
        <div>
          <p className="result-label">Design direction</p>
          <h2 id="ui-guide-title">Web UI colors & fonts</h2>
        </div>
        <div className="ui-guide-actions" role="group" aria-label="Palette size">
          {([2, 3, 4] as const).map(size => <button type="button" className="lock" key={size} aria-pressed={count === size} onClick={() => { setCount(size); setMessage(''); }}>{size} colors</button>)}
        </div>
      </div>
      <p className="ui-guide-intro">Start with a small palette. Assign each color a job, then check the text and call to action before building.</p>
      <p className="ui-suggestion-note">{brief ? `Suggested for ${brief.category}${brief.mood ? ` with a ${brief.mood} mood` : ''}. ` : ''}This is just a suggestion to get you started. You can still choose your own colors, fonts, and copy. Each completed spin suggests a new direction for your brief.</p>
      <div className="ui-guide-layout">
        <div>
          <p className="ui-style-name">{style.name}</p>
          <div className="ui-swatches">
            {colors.slice(0, count).map((color, index) => (
              <label className="ui-swatch" key={index}>
                <input type="color" aria-label={['Background color', 'Text color', 'Accent color', 'Surface color'][index]} value={color} onChange={event => { setColors(old => old.map((value, i) => i === index ? event.target.value : value)); setMessage(''); }} />
                <strong>{['Background', count === 2 ? 'Text + CTA' : 'Text', 'Accent / CTA', 'Surface / card'][index]}</strong>
                <code>{color.toUpperCase()}</code>
              </label>
            ))}
          </div>
          <p className="ui-font-note">Suggested: {style.heading} / {style.body}. {style.fontNote}</p>
          <div className="ui-font-controls">
            <FontPicker key={`heading-${styleIndex}`} label="Heading font" value={headingFont} onChange={setHeadingFont} />
            <FontPicker key={`body-${styleIndex}`} label="Body font" value={bodyFont} onChange={setBodyFont} />
          </div>
          <p className="ui-guide-tip">Pick from {GOOGLE_FONTS.length.toLocaleString()} Google Font families. Search is optional. You can also <a href="https://fonts.google.com/" target="_blank" rel="noopener noreferrer">browse Google Fonts</a>. System fonts keep the preview readable if a font is unavailable.</p>
          <p className="ui-font-status" role="status">{fontStatus}</p>
          <p className="ui-guide-tip">{count >= 3 ? `Keep the background dominant, use the text color for reading, and reserve the accent for the main action.${count === 4 ? ' Use the fourth color for cards and supporting surfaces.' : ''}` : 'Use the background for space and the text color for content and filled buttons. Invert the same two colors for the button label.'}</p>
        </div>
        <div className="ui-preview" style={{ '--preview-bg': background, '--preview-ink': ink, '--preview-accent': accent, '--preview-label': label, '--preview-surface': surface, fontFamily: bodyStack } as CSSProperties} aria-label="UI color preview">
          <span className="ui-preview-tag">{previewText.tag.trim() || DEFAULT_PREVIEW.tag}</span>
          <h3 style={{ fontFamily: headingStack }}>{previewText.heading.trim() || DEFAULT_PREVIEW.heading}</h3>
          <div className="ui-preview-card"><p>{previewText.body.trim() || DEFAULT_PREVIEW.body}</p></div>
          <span className="ui-preview-cta">{previewText.cta.trim() || DEFAULT_PREVIEW.cta} <span aria-hidden="true">↗</span></span>
          <span className="ui-preview-caption">Sample UI · live palette preview</span>
        </div>
      </div>
      <details className="more ui-text-editor">
        <summary>Edit preview text</summary>
        <div className="more-body">
          <p className="ui-guide-tip">Write your own sample copy. Character limits keep the preview compact, including pasted text. Empty fields use the sample text.</p>
          {PREVIEW_FIELDS.map(field => <label className="ui-text-field" key={field.key}>
            <strong>{field.label}</strong>
            {field.key === 'body' ? <textarea className="field" aria-label={field.label} maxLength={field.limit} value={previewText[field.key]} aria-describedby={`preview-${field.key}-count`} onChange={event => setPreviewText(old => ({ ...old, [field.key]: limitPreviewText(event.target.value, field.limit) }))} /> : <input className="field" aria-label={field.label} maxLength={field.limit} value={previewText[field.key]} aria-describedby={`preview-${field.key}-count`} onChange={event => setPreviewText(old => ({ ...old, [field.key]: limitPreviewText(event.target.value, field.limit) }))} />}
            <small id={`preview-${field.key}-count`}>{previewText[field.key].length}/{field.limit} characters{previewText[field.key].length === field.limit ? ' · Limit reached' : ''}</small>
          </label>)}
          <button type="button" className="copy" onClick={() => setPreviewText(DEFAULT_PREVIEW)}>Reset preview text</button>
        </div>
      </details>
      <div className="ui-contrast" aria-label="Color contrast checks">
        {checks.map(check => <p key={check.name}><strong>{check.name}</strong><span>{check.value.toFixed(2)}:1 · {check.value >= check.minimum ? 'Pass' : 'Needs correction'} (min {check.minimum}:1)</span></p>)}
      </div>
      <p className="ui-guide-tip">Checks cover these color pairs only. <a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" target="_blank" rel="noopener noreferrer">WCAG contrast guidance</a>. Clear contrast supports readability; test your copy, layout, and CTA with users to learn what converts.</p>
      <div className="ui-guide-actions">
        <button className="copy" type="button" onClick={nextStyle}>Try another direction</button>
        <button className="copy" type="button" disabled={passes} onClick={() => { setColors(correctPalette(colors, count)); setMessage('Contrast corrected. Your background is preserved; text, accent, and surface are adjusted as needed.'); }}>Correct contrast</button>
        <button className="copy" type="button" onClick={copy}>Copy UI CSS</button>
      </div>
      <p className="ui-guide-message" role="status">{message}</p>
    </section>
  );
}
