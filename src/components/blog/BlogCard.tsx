import Link from "next/link";
import Badge from "@/components/shared/Badge";
import { BlogPostMeta } from "@/lib/blog";

interface BlogCardProps {
  post: BlogPostMeta;
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="glass-card p-6 block group h-full">
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3">
        <time dateTime={post.date}>
          {new Date(post.date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </time>
        <span>&middot;</span>
        <span>{post.readingTime} min read</span>
      </div>

      <h2 className="text-lg font-bold group-hover:text-blue-500 transition-colors">
        {post.title}
      </h2>

      <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
        {post.excerpt}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>

      <div className="mt-4 text-sm font-medium text-blue-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
        Read More
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
