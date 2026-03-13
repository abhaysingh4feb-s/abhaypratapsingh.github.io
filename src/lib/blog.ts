import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";

export interface BlogPostMeta {
  title: string;
  slug: string;
  date: string;
  tags: string[];
  excerpt: string;
  readingTime: number;
  published: boolean;
  ogImage?: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

const blogDir = path.join(process.cwd(), "src/content/blog");

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(blogDir)) return [];

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"));
  const posts = files
    .map((file) => {
      const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: data.slug || file.replace(".md", ""),
        title: data.title,
        date: data.date,
        tags: data.tags || [],
        excerpt: data.excerpt || "",
        readingTime: data.readingTime || 5,
        published: data.published !== false,
        ogImage: data.ogImage,
      } as BlogPostMeta;
    })
    .filter((p) => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();
  posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export async function getPostBySlug(
  slug: string
): Promise<BlogPost | undefined> {
  if (!fs.existsSync(blogDir)) return undefined;

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"));
  let matchedFile: string | undefined;
  let matchedData: Record<string, unknown> | undefined;
  let matchedContent: string | undefined;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
    const { data, content } = matter(raw);
    const fileSlug = data.slug || file.replace(".md", "");
    if (fileSlug === slug) {
      matchedFile = file;
      matchedData = data;
      matchedContent = content;
      break;
    }
  }

  if (!matchedFile || !matchedData || matchedContent === undefined)
    return undefined;

  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(matchedContent);

  return {
    slug: (matchedData.slug as string) || matchedFile.replace(".md", ""),
    title: matchedData.title as string,
    date: matchedData.date as string,
    tags: (matchedData.tags as string[]) || [],
    excerpt: (matchedData.excerpt as string) || "",
    readingTime: (matchedData.readingTime as number) || 5,
    published: matchedData.published !== false,
    ogImage: matchedData.ogImage as string | undefined,
    content: result.toString(),
  };
}
