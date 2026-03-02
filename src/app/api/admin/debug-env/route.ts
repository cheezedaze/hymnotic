import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";

export async function GET() {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyId = process.env.AWS_ACCESS_KEY_ID ?? "";
  const secret = process.env.AWS_SECRET_ACCESS_KEY ?? "";

  return NextResponse.json({
    AWS_ACCESS_KEY_ID: keyId
      ? `${keyId.slice(0, 4)}...${keyId.slice(-4)} (length: ${keyId.length})`
      : "MISSING",
    AWS_SECRET_ACCESS_KEY: secret
      ? `${secret.slice(0, 4)}...${secret.slice(-4)} (length: ${secret.length})`
      : "MISSING",
    AWS_REGION: process.env.AWS_REGION ?? "MISSING",
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET ?? "MISSING",
  });
}
