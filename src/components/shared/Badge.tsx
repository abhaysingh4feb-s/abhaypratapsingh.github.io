interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary";
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        variant === "primary"
          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
          : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)]"
      }`}
    >
      {children}
    </span>
  );
}
