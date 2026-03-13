"use client";

import AnimateOnScroll from "@/components/shared/AnimateOnScroll";
import SectionHeading from "@/components/shared/SectionHeading";
import { getResume } from "@/lib/resume";

const resume = getResume();

const categoryIcons: Record<string, string> = {
  "Languages & Frameworks": "code",
  "Databases": "database",
  "AI & Search": "sparkles",
  "Caching & Queues": "bolt",
  "Architecture": "building",
  "DevOps": "cloud",
  "Integrations & APIs": "link",
  "Email & Marketing": "mail",
  "Project Management": "clipboard",
};

export default function TechStackSection() {
  const categories = Object.entries(resume.skills);

  return (
    <section id="skills" className="section-padding">
      <div className="container-custom">
        <SectionHeading
          title="Tech Stack"
          subtitle="Technologies and tools I use to build production systems"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(([category, skills], i) => (
            <AnimateOnScroll key={category} delay={i * 0.08}>
              <div className="glass-card p-6 h-full">
                <h3 className="font-semibold text-sm mb-3 text-blue-500">
                  {category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg
                        bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)]
                        hover:border-blue-500/30 hover:text-[var(--text-primary)] transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
