import type { MetadataRoute } from "next";
import { query } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const events = await query<{ slug: string; updated_at: string }>(
    `SELECT slug, updated_at FROM events WHERE is_published = TRUE`
  );

  return [
    { url: appUrl, changeFrequency: "daily", priority: 1 },
    { url: `${appUrl}/events`, changeFrequency: "daily", priority: 0.9 },
    ...events.map((e) => ({
      url: `${appUrl}/events/${e.slug}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
