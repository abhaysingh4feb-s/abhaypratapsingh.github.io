"use client";

import { useState, useMemo } from "react";
import BlogCard from "./BlogCard";
import BlogSearch from "./BlogSearch";
import TagFilter from "./TagFilter";
import { BlogPostMeta } from "@/lib/blog";

interface BlogListClientProps {
  posts: BlogPostMeta[];
  tags: string[];
}

export default function BlogListClient({ posts, tags }: BlogListClientProps) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchSearch =
        search === "" ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(search.toLowerCase());
      const matchTag = !selectedTag || post.tags.includes(selectedTag);
      return matchSearch && matchTag;
    });
  }, [posts, search, selectedTag]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <BlogSearch value={search} onChange={setSearch} />
        </div>
      </div>

      <div className="mb-8">
        <TagFilter tags={tags} selected={selectedTag} onSelect={setSelectedTag} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p>No posts found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
