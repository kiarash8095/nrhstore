import { uploadFilenamePattern } from "@/features/banners/schemas/banner.schema";
import { bannerImagePath } from "@/features/banners/server/store";
import { readFile } from "node:fs/promises";



export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!uploadFilenamePattern.test(filename)) return new Response(null, { status: 404 });
  try {
    const image = await readFile(bannerImagePath(filename));
    return new Response(new Uint8Array(image), { headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    console.error("[banners:image]", error);
    return new Response(null, { status: 500 });
  }
}
