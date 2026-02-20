import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/db/queries";

export async function GET() {
  try {
    const settings = await getAllSettings();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
