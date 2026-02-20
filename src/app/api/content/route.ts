import { NextResponse } from "next/server";
import { getActiveContentBlocksByPage } from "@/lib/db/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");

    if (!page) {
      return NextResponse.json(
        { error: "page query parameter is required" },
        { status: 400 }
      );
    }

    const blocks = await getActiveContentBlocksByPage(page);
    return NextResponse.json(blocks);
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}
