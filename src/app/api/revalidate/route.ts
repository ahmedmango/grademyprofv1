import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paths, secret } = body;

    // Optional: protect with a secret (use ADMIN_SECRET)
    // For now, allow all revalidation requests from the app itself

    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidatePath(path, "page");
      }
    } else {
      // Default: revalidate everything
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ revalidated: true, paths: paths || ["/"] });
  } catch (err) {
    console.error("Revalidation error:", err);
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
