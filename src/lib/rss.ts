import { Feed } from "feed";
import { siteConfig } from "@/config/site";
import { getAllPosts } from "./blog";

export function generateRssFeed(): string {
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

  return feed.rss2();
}
