import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingResponses, users } from "@/lib/db/schema";

export async function getSurveyResponses() {
  return db.select().from(onboardingResponses).orderBy(desc(onboardingResponses.completedAt));
}

export async function getSurveyUsers() {
  return db.select({
    id: users.id,
    onboardingCompletedAt: users.onboardingCompletedAt,
    onboardingLastDismissedAt: users.onboardingLastDismissedAt,
    onboardingDismissCount: users.onboardingDismissCount,
  }).from(users);
}

export async function getUserSurvey(userId: string) {
  const [response] = await db.select().from(onboardingResponses)
    .where(eq(onboardingResponses.userId, userId)).limit(1);
  return response ?? null;
}
