import fs from "fs";
import path from "path";

export interface ImpactMetric {
  metric: string;
  result: string;
}

export interface TechnicalDecision {
  decision: string;
  reasoning: string;
}

export interface CaseStudy {
  problem: string;
  solution: string;
  myRole: string[];
  architecture: string;
  technicalDecisions: TechnicalDecision[];
  challenges: string[];
  techStack: string[];
}

export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  tags: string[];
  featured: boolean;
  order: number;
  overview: string;
  architectureHighlights: string[];
  impactMetrics: ImpactMetric[];
  caseStudy: CaseStudy;
}

const projectsDir = path.join(process.cwd(), "src/content/projects");

export function getAllProjects(): Project[] {
  const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith(".json"));
  const projects = files.map((file) => {
    const content = fs.readFileSync(path.join(projectsDir, file), "utf-8");
    return JSON.parse(content) as Project;
  });
  return projects.sort((a, b) => a.order - b.order);
}

export function getProjectBySlug(slug: string): Project | undefined {
  const projects = getAllProjects();
  return projects.find((p) => p.slug === slug);
}
