import { getAllProjects } from "@/lib/projects";
import { getAllPosts } from "@/lib/blog";
import { generatePersonJsonLd } from "@/lib/seo";
import HeroSection from "@/components/home/HeroSection";
import SpecializationsSection from "@/components/home/SpecializationsSection";
import AboutSection from "@/components/home/AboutSection";
import ProjectsSection from "@/components/home/ProjectsSection";
import TechStackSection from "@/components/home/TechStackSection";
import ExperienceSection from "@/components/home/ExperienceSection";
import LatestWriting from "@/components/home/LatestWriting";
import CodeSamples from "@/components/home/CodeSamples";
import ContactCTA from "@/components/home/ContactCTA";

export default function HomePage() {
  const projects = getAllProjects();
  const posts = getAllPosts();
  const personJsonLd = generatePersonJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <HeroSection />
      <SpecializationsSection />
      <AboutSection />
      <ProjectsSection projects={projects} />
      <TechStackSection />
      <ExperienceSection />
      <LatestWriting posts={posts} />
      <CodeSamples />
      <ContactCTA />
    </>
  );
}
