import type { Metadata } from "next";
import { getAllPosts, getAllTags } from "@/lib/blog";
import { generateBreadcrumbJsonLd } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import SectionHeading from "@/components/shared/SectionHeading";
import BlogListClient from "@/components/blog/BlogListClient";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Technical articles by Abhay Pratap Singh on backend architecture, AI systems, multi-tenant SaaS, and engineering decisions.",
  alternates: {
    canonical: `${siteConfig.url}/blog`,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const tags = getAllTags();
  const breadcrumb = {
    "@context": "https://schema.org",
    ...generateBreadcrumbJsonLd([
      { name: "Home", url: siteConfig.url },
      { name: "Blog", url: `${siteConfig.url}/blog` },
    ]),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="pt-8 pb-20 md:pt-12 md:pb-28">
        <div className="container-custom">
          <SectionHeading
            title="Technical Blog"
            subtitle="Deep dives into backend architecture, AI systems, and engineering decisions"
          />
          <BlogListClient posts={posts} tags={tags} />
        </div>
      </div>
    </>
  );
}
