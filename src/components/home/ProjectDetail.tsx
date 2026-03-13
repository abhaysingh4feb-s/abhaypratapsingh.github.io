"use client";

import { motion, AnimatePresence } from "framer-motion";
import Badge from "@/components/shared/Badge";
import ImpactMetrics from "./ImpactMetrics";
import { Project } from "@/lib/projects";

interface ProjectDetailProps {
  project: Project | null;
  onClose: () => void;
}

export default function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--card-border)] hover:bg-[var(--bg-card)] transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <h2 className="text-2xl md:text-3xl font-bold pr-8">{project.title}</h2>
            <p className="mt-1 text-[var(--text-secondary)]">{project.subtitle}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="primary">{tag}</Badge>
              ))}
            </div>

            {/* Impact Metrics */}
            <ImpactMetrics metrics={project.impactMetrics} />

            {/* Problem / Solution */}
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-red-400">Problem</h3>
                <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
                  {project.caseStudy.problem}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-400">Solution</h3>
                <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
                  {project.caseStudy.solution}
                </p>
              </div>

              {/* My Role */}
              <div>
                <h3 className="text-lg font-semibold">My Role</h3>
                <ul className="mt-2 space-y-1">
                  {project.caseStudy.myRole.map((role) => (
                    <li key={role} className="flex items-start gap-2 text-[var(--text-secondary)]">
                      <svg className="w-4 h-4 text-blue-500 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      {role}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Architecture Highlights */}
              <div>
                <h3 className="text-lg font-semibold">Architecture Highlights</h3>
                <ul className="mt-2 space-y-2">
                  {project.architectureHighlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-[var(--text-secondary)]">
                      <svg className="w-4 h-4 text-green-500 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technical Decisions */}
              <div>
                <h3 className="text-lg font-semibold">Key Technical Decisions</h3>
                <div className="mt-3 space-y-3">
                  {project.caseStudy.technicalDecisions.map((td) => (
                    <div key={td.decision} className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)]">
                      <div className="font-medium text-sm">{td.decision}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">{td.reasoning}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenges */}
              <div>
                <h3 className="text-lg font-semibold">Core Technical Challenges</h3>
                <ol className="mt-2 space-y-2 list-decimal list-inside">
                  {project.caseStudy.challenges.map((c) => (
                    <li key={c} className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {c}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tech Stack */}
              <div>
                <h3 className="text-lg font-semibold">Tech Stack</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.caseStudy.techStack.map((tech) => (
                    <Badge key={tech}>{tech}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
