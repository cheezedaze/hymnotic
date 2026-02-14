import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dir = path.join(process.cwd(), ".cursor");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(
      path.join(dir, "debug.log"),
      JSON.stringify({ ...body, timestamp: body.timestamp ?? Date.now() }) + "\n"
    );
  } catch (_) {}
  return new Response(null, { status: 204 });
}
