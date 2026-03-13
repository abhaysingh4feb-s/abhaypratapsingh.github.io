import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getAllProjects } from "@/lib/projects";
import { getAllPosts } from "@/lib/blog";
import { generateHomePageJsonLdGraph } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import HeroSection from "@/components/home/HeroSection";
import SpecializationsSection from "@/components/home/SpecializationsSection";
import AboutSection from "@/components/home/AboutSection";

// Lazy load below-the-fold sections to reduce initial bundle size
const ProjectsSection = dynamic(
  () => import("@/components/home/ProjectsSection"),
  { ssr: true }
);
const TechStackSection = dynamic(
  () => import("@/components/home/TechStackSection"),
  { ssr: true }
);
const ExperienceSection = dynamic(
  () => import("@/components/home/ExperienceSection"),
  { ssr: true }
);
const LatestWriting = dynamic(
  () => import("@/components/home/LatestWriting"),
  { ssr: true }
);
const CodeSamples = dynamic(
  () => import("@/components/home/CodeSamples"),
  { ssr: true }
);
const ContactCTA = dynamic(
  () => import("@/components/home/ContactCTA"),
  { ssr: true }
);

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.title}`,
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "profile",
    title: `${siteConfig.name} — ${siteConfig.title}`,
    description: siteConfig.description,
    url: siteConfig.url,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  const projects = getAllProjects();
  const posts = getAllPosts();
  const jsonLdGraph = generateHomePageJsonLdGraph();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
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
