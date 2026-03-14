import { siteConfig } from "@/config/site";

export function generatePersonJsonLd() {
  return {
    "@type": "Person",
    "@id": `${siteConfig.url}/#person`,
    name: siteConfig.name,
    givenName: "Abhay",
    familyName: "Singh",
    additionalName: "Pratap",
    jobTitle: siteConfig.title,
    description:
      "Senior Backend Engineer and Team Lead with 5+ years of experience building scalable multi-tenant SaaS platforms and AI-integrated systems.",
    url: siteConfig.url,
    email: `mailto:${siteConfig.email}`,
    image: `${siteConfig.url}/opengraph-image`,
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Dr. A.P.J. Abdul Kalam Technical University",
    },
    worksFor: {
      "@type": "Organization",
      name: "Voyantt Consultancy Services LLP",
    },
    knowsAbout: [
      "Backend Engineering",
      "Node.js",
      "NestJS",
      "Laravel",
      "PHP",
      "TypeScript",
      "PostgreSQL",
      "MySQL",
      "Multi-Tenant SaaS Architecture",
      "AI Systems",
      "LLM Integration",
      "pgvector",
      "Semantic Search",
      "REST API Design",
      "Redis",
      "Docker",
      "AWS",
    ],
    sameAs: [siteConfig.linkedin, siteConfig.github],
  };
}

export function generateWebSiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: {
      "@id": `${siteConfig.url}/#person`,
    },
    inLanguage: "en-US",
  };
}

export function generateProfilePageJsonLd() {
  return {
    "@type": "ProfilePage",
    "@id": `${siteConfig.url}/#profilepage`,
    name: `${siteConfig.name} — Portfolio`,
    url: siteConfig.url,
    mainEntity: {
      "@id": `${siteConfig.url}/#person`,
    },
    dateCreated: "2025-03-12",
    dateModified: new Date().toISOString().split("T")[0],
  };
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateHomePageJsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      generatePersonJsonLd(),
      generateWebSiteJsonLd(),
      generateProfilePageJsonLd(),
      generateBreadcrumbJsonLd([{ name: "Home", url: siteConfig.url }]),
    ],
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
    dateModified: post.date,
    image: `${siteConfig.url}/opengraph-image`,
    author: {
      "@type": "Person",
      "@id": `${siteConfig.url}/#person`,
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Person",
      "@id": `${siteConfig.url}/#person`,
      name: siteConfig.name,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/blog/${post.slug}`,
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
