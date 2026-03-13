"use client";

interface TagFilterProps {
  tags: string[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}

export default function TagFilter({ tags, selected, onSelect }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
          selected === null
            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
            : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:border-blue-500/30"
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(tag === selected ? null : tag)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            selected === tag
              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:border-blue-500/30"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
