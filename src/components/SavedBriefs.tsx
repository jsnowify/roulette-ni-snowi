import { briefSentence } from "../lib/brief";
import type { SavedBrief } from "../lib/saved";

type SavedBriefsProps = {
  saved: readonly SavedBrief[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function SavedBriefs({
  saved,
  onToggle,
  onRemove,
}: SavedBriefsProps) {
  return (
    <section className="saved">
      <ul>
        {saved.map((x) => (
          <li key={x.id} className={x.done ? "is-done" : ""}>
            <label>
              <input
                type="checkbox"
                checked={x.done}
                onChange={() => onToggle(x.id)}
              />
              <span>{briefSentence(x)}</span>
            </label>
            <button
              type="button"
              className="remove"
              onClick={() => onRemove(x.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
