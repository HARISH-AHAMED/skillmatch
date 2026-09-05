import type { MetadataRoute } from "next";

/* Crawlers request /robots.txt on every visit and it used to 404. The signed-in
   surfaces are behind auth and carry nothing a crawler should index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account/", "/admin/", "/company/", "/freelancer/"],
    },
    sitemap: "https://frivvo.com/sitemap.xml",
  };
}
