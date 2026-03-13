import { siteConfig } from "@/config/site";

export function generatePersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    jobTitle: siteConfig.title,
    url: siteConfig.url,
    email: siteConfig.email,
    sameAs: [siteConfig.linkedin],
  };
}

export function generateBlogPostingJsonLd(post: {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  readingTime: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    url: `${siteConfig.url}/blog/${post.slug}`,
    timeRequired: `PT${post.readingTime}M`,
  };
}

export function generateProjectJsonLd(project: {
  title: string;
  slug: string;
  overview: string;
  tags: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    description: project.overview,
    applicationCategory: "Backend System",
    keywords: project.tags.join(", "),
    url: `${siteConfig.url}/projects/${project.slug}`,
  };
}

export function generateCodeSampleJsonLd(sample: {
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: sample.name,
    description: sample.description,
    author: {
      "@type": "Person",
      name: siteConfig.name,
    },
  };
}
