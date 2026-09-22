import { FeedbackManager } from "@/components/admin/FeedbackManager";
import { getFeedbackPage } from "@/lib/feedback/queries";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  return <FeedbackManager initialPage={await getFeedbackPage()} />;
}
