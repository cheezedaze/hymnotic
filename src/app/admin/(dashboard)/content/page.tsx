import { getContentBlocksByPage } from "@/lib/db/queries";
import { ContentManager } from "@/components/admin/ContentManager";

export default async function AdminContentPage() {
  const blocks = await getContentBlocksByPage("about");
  return <ContentManager blocks={blocks} defaultPage="about" />;
}
