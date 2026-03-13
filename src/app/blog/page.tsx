import type { Metadata } from "next";
import { getAllPosts, getAllTags } from "@/lib/blog";
import SectionHeading from "@/components/shared/SectionHeading";
import BlogListClient from "@/components/blog/BlogListClient";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Technical articles on backend architecture, AI systems, multi-tenant SaaS, and engineering decisions.",
};

export default function BlogPage() {
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <div className="section-padding">
      <div className="container-custom">
        <SectionHeading
          title="Technical Blog"
          subtitle="Deep dives into backend architecture, AI systems, and engineering decisions"
        />
        <BlogListClient posts={posts} tags={tags} />
      </div>
    </div>
  );
}
