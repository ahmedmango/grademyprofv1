import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paths, secret } = body;

    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret || secret !== expectedSecret)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

    const resolved = paths && Array.isArray(paths) ? paths : ["/"];
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path, "page");
      }
    } else {
      revalidatePath("/", "layout");
    }
    logger.info("REVALIDATE TRIGGERED [revalidate route]", resolved);

    return NextResponse.json({ revalidated: true, paths: resolved }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logger.error("Revalidation error:", err);
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
