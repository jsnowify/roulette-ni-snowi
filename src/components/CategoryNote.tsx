import { infoFor } from "../data/categories";

/** Short explanation of the chosen category, for beginners. A custom category has no note. */
export default function CategoryNote({ name }: { name: string }) {
  const info = infoFor(name);
  if (!info) return null;

  return (
    <div className="note">
      <p className="result-label">About {info.name}</p>
      <p>
        <strong>What it is:</strong> {info.what}
      </p>
      <p>
        <strong>Think of:</strong> {info.think}
      </p>
    </div>
  );
}
