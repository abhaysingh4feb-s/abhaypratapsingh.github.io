"use client";

import { useState } from "react";
import AnimateOnScroll from "@/components/shared/AnimateOnScroll";
import SectionHeading from "@/components/shared/SectionHeading";
import ProjectCard from "./ProjectCard";
import ProjectDetail from "./ProjectDetail";
import { Project } from "@/lib/projects";

interface ProjectsSectionProps {
  projects: Project[];
}

export default function ProjectsSection({ projects }: ProjectsSectionProps) {
  const [selected, setSelected] = useState<Project | null>(null);

  return (
    <section id="projects" className="section-padding">
      <div className="container-custom">
        <SectionHeading
          title="Featured Projects"
          subtitle="Production systems I've architected and built — each solving complex backend challenges at scale"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <AnimateOnScroll key={project.slug} delay={i * 0.1}>
              <ProjectCard
                project={project}
                onClick={() => setSelected(project)}
              />
            </AnimateOnScroll>
          ))}
        </div>
      </div>

      <ProjectDetail
        project={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
