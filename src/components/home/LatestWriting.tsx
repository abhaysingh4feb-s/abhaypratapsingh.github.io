import Link from "next/link";
import AnimateOnScroll from "@/components/shared/AnimateOnScroll";
import SectionHeading from "@/components/shared/SectionHeading";
import Badge from "@/components/shared/Badge";
import { BlogPostMeta } from "@/lib/blog";

interface LatestWritingProps {
  posts: BlogPostMeta[];
}

export default function LatestWriting({ posts }: LatestWritingProps) {
  if (posts.length === 0) return null;

  return (
    <section id="writing" className="section-padding">
      <div className="container-custom">
        <SectionHeading
          title="Latest Technical Writing"
          subtitle="Deep dives into backend architecture, AI systems, and engineering decisions"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {posts.slice(0, 2).map((post, i) => (
            <AnimateOnScroll key={post.slug} delay={i * 0.1}>
              <Link href={`/blog/${post.slug}`} className="glass-card p-6 block group h-full">
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3">
                  <time>{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
                  <span>&middot;</span>
                  <span>{post.readingTime} min read</span>
                </div>
                <h3 className="font-bold text-lg group-hover:text-blue-500 transition-colors">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </Link>
            </AnimateOnScroll>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
          >
            View All Posts
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
