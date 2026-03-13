"use client";

import AnimateOnScroll from "@/components/shared/AnimateOnScroll";
import SectionHeading from "@/components/shared/SectionHeading";
import { getResume } from "@/lib/resume";

const resume = getResume();

export default function ExperienceSection() {
  return (
    <section id="experience" className="section-padding bg-[var(--bg-secondary)]">
      <div className="container-custom">
        <SectionHeading title="Experience" />

        <div className="max-w-3xl mx-auto">
          {resume.experience.map((exp, i) => (
            <AnimateOnScroll key={`${exp.role}-${exp.period}`} delay={i * 0.15}>
              <div className="relative pl-8 pb-12 last:pb-0">
                {/* Timeline line */}
                <div className="absolute left-0 top-2 bottom-0 w-px bg-gradient-to-b from-blue-500 to-purple-500" />
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 w-2 h-2 -translate-x-[3px] rounded-full bg-blue-500 ring-4 ring-[var(--bg-secondary)]" />

                <div className="glass-card p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{exp.role}</h3>
                      <p className="text-sm text-blue-500">{exp.company}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {exp.period}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-3">{exp.location}</p>
                  <ul className="space-y-2">
                    {exp.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>
          ))}

          {/* Education */}
          <AnimateOnScroll delay={resume.experience.length * 0.15}>
            <div className="relative pl-8">
              <div className="absolute left-0 top-2 w-2 h-2 -translate-x-[3px] rounded-full bg-purple-500 ring-4 ring-[var(--bg-secondary)]" />
              <div className="glass-card p-6">
                <h3 className="font-bold">{resume.education.degree}</h3>
                <p className="text-sm text-blue-500">{resume.education.university}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{resume.education.period}</p>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
