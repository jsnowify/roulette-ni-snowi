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
    <section className="saved" aria-label="Saved briefs">
      <p className="result-label">Your project archive</p>
      <p className="archive-note">Saved briefs and completed brands. Your current challenge stays fixed until you finish it.</p>
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
              aria-label={`Remove saved brief for ${x.brand}`}
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
