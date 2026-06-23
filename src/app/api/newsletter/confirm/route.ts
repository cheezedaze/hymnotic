import { NextResponse } from "next/server";
import { confirmNewsletterToken } from "@/lib/email/newsletter-confirm";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") || "");

  let status: string;
  try {
    status = await confirmNewsletterToken(token);
  } catch (err) {
    console.error("Newsletter confirm failed:", err);
    status = "error";
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";
  return NextResponse.redirect(
    `${appUrl}/auth/confirm-newsletter?status=${status}`,
    { status: 303 }
  );
}
