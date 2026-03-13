"use client";

import Badge from "@/components/shared/Badge";
import { Project } from "@/lib/projects";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-6 text-left w-full group cursor-pointer"
    >
      <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
        {project.title}
      </h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
        {project.overview}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.tags.slice(0, 5).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Architecture Highlights
        </h4>
        <ul className="space-y-1">
          {project.architectureHighlights.slice(0, 3).map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {h}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 text-sm font-medium text-blue-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
        View Case Study
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
