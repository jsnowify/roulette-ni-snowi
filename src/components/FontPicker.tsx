import { GOOGLE_FONTS } from '../lib/fonts';
import { UI_STYLES } from '../data/uiStyles';
import OptionPicker from './OptionPicker';

const suggested = new Set<string>(UI_STYLES.flatMap(style => [style.heading, style.body]));
const fontOptions = [...GOOGLE_FONTS].sort((a, b) => Number(suggested.has(b.name)) - Number(suggested.has(a.name))).map(font => ({ value: font.name, label: font.name, detail: `${suggested.has(font.name) ? 'Suggested · ' : ''}${font.category}` }));

export default function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (font: string) => void }) {
  return (
    <div className="ui-font-picker">
      <strong>{label}</strong>
      <OptionPicker label={label} value={value} options={fontOptions} onChange={onChange} searchable />
    </div>
  );
}
