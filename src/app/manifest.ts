import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Abhay Pratap Singh — Senior Backend Engineer",
    short_name: "Abhay PS",
    description:
      "Portfolio and blog of Abhay Pratap Singh, Senior Backend Engineer & Team Lead",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
