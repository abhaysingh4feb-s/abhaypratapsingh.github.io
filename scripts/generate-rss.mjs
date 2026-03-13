import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Feed } from "feed";

const siteConfig = {
  name: "Abhay Pratap Singh",
  title: "Senior Backend Engineer & Team Lead",
  description: "Backend engineer building scalable SaaS platforms and AI-powered systems",
  url: "https://abhaypratapsingh.co.in",
  email: "abhaysingh4feb@gmail.com",
};

const blogDir = path.join(process.cwd(), "src/content/blog");
const outPath = path.join(process.cwd(), "public/rss.xml");

function getAllPosts() {
  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: data.slug || file.replace(".md", ""),
        title: data.title,
        date: data.date,
        excerpt: data.excerpt || "",
        published: data.published !== false,
      };
    })
    .filter((p) => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const posts = getAllPosts();

const feed = new Feed({
  title: `${siteConfig.name} — ${siteConfig.title}`,
  description: siteConfig.description,
  id: siteConfig.url,
  link: siteConfig.url,
  language: "en",
  copyright: `All rights reserved ${new Date().getFullYear()}, ${siteConfig.name}`,
  author: {
    name: siteConfig.name,
    email: siteConfig.email,
    link: siteConfig.url,
  },
});

posts.forEach((post) => {
  feed.addItem({
    title: post.title,
    id: `${siteConfig.url}/blog/${post.slug}`,
    link: `${siteConfig.url}/blog/${post.slug}`,
    description: post.excerpt,
    date: new Date(post.date),
    author: [{ name: siteConfig.name, email: siteConfig.email }],
  });
});

fs.writeFileSync(outPath, feed.rss2());
console.log(`RSS feed generated at ${outPath} with ${posts.length} posts`);
