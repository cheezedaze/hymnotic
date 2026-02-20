import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getAllSettings, upsertSetting } from "@/lib/db/queries";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "key and value are required" },
        { status: 400 }
      );
    }

    const setting = await upsertSetting(key, value);
    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error updating setting:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
