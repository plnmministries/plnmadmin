import { getPublished } from "@/lib/store";

// Read-only feed of the PUBLISHED content for the public website (separate deployment).
// Drafts, revisions and the admin login are never exposed here.
export async function GET() {
  const content = await getPublished();
  return Response.json(content, {
    headers: { "Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=60" },
  });
}
