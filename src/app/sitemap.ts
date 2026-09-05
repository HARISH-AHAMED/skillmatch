import type { MetadataRoute } from "next";

const BASE = "https://frivvo.com";

/** Only the routes a signed-out visitor can reach; everything else needs a session. */
const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/features",
  "/help",
  "/pricing",
  "/trust",
  "/legal/privacy",
  "/legal/terms",
  "/discover/projects",
  "/discover/talent",
  "/discover/companies",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${BASE}${route}`,
    lastModified,
    changeFrequency: route.startsWith("/discover") ? "daily" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
