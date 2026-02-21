import { NextResponse } from "next/server";
import { requireAuthAdmin } from "@/lib/auth/auth";
import {
  getContentBlocksByPage,
  createContentBlock,
} from "@/lib/db/queries";

export async function GET(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") ?? "about";
    const blocks = await getContentBlocksByPage(page);
    return NextResponse.json(blocks);
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAuthAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { page, sectionKey, title, bodyText, icon, sortOrder, active } =
      body;

    if (!page || !sectionKey || !title || !bodyText) {
      return NextResponse.json(
        { error: "page, sectionKey, title, and bodyText are required" },
        { status: 400 }
      );
    }

    const block = await createContentBlock({
      page,
      sectionKey,
      title,
      body: bodyText,
      icon: icon ?? undefined,
      sortOrder: sortOrder ?? 0,
      active: active ?? true,
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("Error creating content block:", error);
    return NextResponse.json(
      { error: "Failed to create content block" },
      { status: 500 }
    );
  }
}
