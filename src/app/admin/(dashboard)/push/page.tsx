import { getPushHistory } from "@/lib/db/queries";
import { PushNotificationsManager } from "@/components/admin/PushNotificationsManager";

export default async function AdminPushPage() {
  const history = await getPushHistory();
  return <PushNotificationsManager history={history} />;
}
