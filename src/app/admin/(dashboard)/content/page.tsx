import { getContentBlocksByPage } from "@/lib/db/queries";
import { ContentManager } from "@/components/admin/ContentManager";

export default async function AdminContentPage() {
  const rows = await getContentBlocksByPage("about");
  const blocks = rows.map((b) => ({
    ...b,
    imagePosition: b.imagePosition as "top" | "bottom" | null,
  }));
  return <ContentManager blocks={blocks} defaultPage="about" />;
}
