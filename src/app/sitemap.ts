import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/login", "/legal/impressum", "/legal/privacy", "/legal/terms"].map((p) => ({ url: `${siteUrl}${p}` }));
}
