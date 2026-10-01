import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { REEL_DEFS } from "../data/reels";
import {
  MAX_LEN,
  MAX_PER_REEL,
  type AddResult,
  type Custom,
} from "../hooks/useCustomEntries";
import { parseImport, type SavedBrief } from "../lib/saved";
import type { Key } from "../types";

const MESSAGES: Record<AddResult, string> = {
  ok: "Added.",
  empty: "Type something first.",
  duplicate: "That one already exists.",
  limit: `Limit reached (${MAX_PER_REEL} per reel).`,
};

const MAX_IMPORT_BYTES = 1_000_000;

type MoreToolsProps = {
  custom: Custom;
  onAdd: (key: Key, text: string) => AddResult;
  onRemove: (key: Key, text: string) => void;
  onImport: (list: readonly SavedBrief[]) => number;
};

export default function MoreTools({
  custom,
  onAdd,
  onRemove,
  onImport,
}: MoreToolsProps) {
  const [key, setKey] = useState<Key>("brand");
  const [text, setText] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = onAdd(key, text);
    setAddMsg(MESSAGES[result]);
    if (result === "ok") setText("");
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = ""; // para mapili ulit ang parehong file

    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportMsg("That file is too big.");
      return;
    }

    const list = parseImport(await file.text());
    if (!list) {
      setImportMsg("That isn't a valid briefs file.");
      return;
    }

    const added = onImport(list);
    setImportMsg(added > 0 ? `Imported ${added}.` : "Nothing new to import.");
  }

  const entries = REEL_DEFS.flatMap((r) =>
    custom[r.key].map((value) => ({ key: r.key, label: r.label, value })),
  );

  return (
    <div className="more-body">
      <div>
        <p className="result-label">Add your own entries</p>
        <form className="custom-form" onSubmit={submit}>
          <select
            className="field"
            aria-label="Which reel"
            value={key}
            onChange={(e) => setKey(e.target.value as Key)}
          >
            {REEL_DEFS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            className="field"
            type="text"
            aria-label="New entry"
            placeholder="Type your own…"
            maxLength={MAX_LEN}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="copy">
            Add
          </button>
        </form>
        <p className="msg" role="status">
          {addMsg}
        </p>

        {entries.length > 0 && (
          <ul className="custom-list">
            {entries.map((x) => (
              <li key={`${x.key}|${x.value}`}>
                <span>
                  <small>{x.label}</small> {x.value}
                </span>
                <button
                  type="button"
                  className="remove"
                  onClick={() => onRemove(x.key, x.value)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="result-label">Import saved briefs</p>
        <label className="copy file-pick">
          Choose .json file
          <input
            type="file"
            className="sr-only"
            accept="application/json,.json"
            onChange={handleFile}
          />
        </label>
        <p className="msg" role="status">
          {importMsg}
        </p>
      </div>
    </div>
  );
}
