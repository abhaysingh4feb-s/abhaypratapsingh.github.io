interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export default function SectionHeading({
  title,
  subtitle,
  align = "center",
}: SectionHeadingProps) {
  return (
    <div className={`mb-12 ${align === "center" ? "text-center" : ""}`}>
      <h2 className="text-3xl md:text-4xl font-bold">
        {title}
      </h2>
      <div className={`mt-3 h-1 w-20 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full ${
        align === "center" ? "mx-auto" : ""
      }`} />
      {subtitle && (
        <p className="mt-4 text-[var(--text-secondary)] max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}
