import { useState } from "react";
import type { FormEvent } from "react";
import { REEL_DEFS } from "../data/reels";
import { MAX_LEN, MAX_PER_REEL } from "../hooks/useCustomEntries";
import type { AddResult, Custom } from "../hooks/useCustomEntries";
import type { Key } from "../types";

type Props = {
  custom: Custom;
  busy: boolean;
  onAdd: (key: Key, text: string) => AddResult;
  onRemove: (key: Key, text: string) => void;
};

export default function CustomEntries({
  custom,
  busy,
  onAdd,
  onRemove,
}: Props) {
  const [key, setKey] = useState<Key>("brand");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const entries = REEL_DEFS.flatMap((reel) =>
    custom[reel.key].map((value) => ({ ...reel, value })),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const result = onAdd(key, text);
    const messages: Record<AddResult, string> = {
      ok: "Added to your reel. Spin to try it!",
      empty: "Type an entry first.",
      duplicate: "That entry is already in this reel.",
      limit: `You can add up to ${MAX_PER_REEL} entries per reel. Remove one to make room.`,
    };
    setMessage(messages[result]);
    if (result === "ok") setText("");
  }

  return (
    <details className="more custom-entries">
      <summary>
        Add your own entries{entries.length > 0 && ` (${entries.length})`}
      </summary>
      <div className="more-body">
        <p className="empty">
          Mix your own ideas into the reels. Saved in this browser. Mood entries
          appear when Extra reels is on.
        </p>
        <form className="custom-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="custom-reel">
            Reel
          </label>
          <select
            id="custom-reel"
            className="field"
            value={key}
            disabled={busy}
            onChange={(event) => {
              setKey(event.target.value as Key);
              setMessage("");
            }}
          >
            {REEL_DEFS.map((reel) => (
              <option key={reel.key} value={reel.key}>
                {reel.label} ({custom[reel.key].length}/{MAX_PER_REEL})
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="custom-entry">
            New entry
          </label>
          <input
            id="custom-entry"
            className="field"
            type="text"
            placeholder="Your next idea..."
            maxLength={MAX_LEN}
            value={text}
            disabled={busy}
            onChange={(event) => setText(event.target.value)}
          />
          <button className="copy" type="submit" disabled={busy}>
            Add entry
          </button>
        </form>
        <p className="msg" role="status">
          {busy ? "You can edit entries after the spin finishes." : message}
        </p>
        {entries.length > 0 && (
          <ul className="custom-list" aria-label="Your custom entries">
            {entries.map((entry) => (
              <li key={`${entry.key}:${entry.value}`}>
                <span>
                  <small>{entry.label}</small>
                  {entry.value}
                </span>
                <button
                  className="remove"
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${entry.value} from ${entry.label}`}
                  onClick={() => {
                    onRemove(entry.key, entry.value);
                    setMessage(`Removed ${entry.value} from future spins.`);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="empty">
          Share custom briefs with Copy brief. Custom links open only in
          browsers that have the same entries.
        </p>
      </div>
    </details>
  );
}
