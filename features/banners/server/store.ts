import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir,open,readFile,rename,stat,unlink,writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultBannerDocument } from "../constants/defaults";
import { bannerDocumentSchema,uploadFilenamePattern,type BannerDocument,type SiteBanner } from "../schemas/banner.schema";

export function bannerDataDirectory() {
<<<<<<< HEAD
  return process.env.BANNERS_DATA_DIR
    ? path.resolve(/* turbopackIgnore: true */ process.env.BANNERS_DATA_DIR)
    : path.join(process.cwd(), "data", "banners");
=======
  return path.resolve(process.env.BANNERS_DATA_DIR || path.join(process.cwd(), "data", "banners"));
>>>>>>> 5ac6dc77aee4b7ce44d07237d793f692485c06b6
}

export function bannerImagePath(filename: string) {
  if (!uploadFilenamePattern.test(filename)) throw new Error("Invalid banner filename");
  return path.join(bannerDataDirectory(), "images", filename);
}

export async function readBannerDocument(): Promise<BannerDocument> {
  try {
    const content = await readFile(path.join(bannerDataDirectory(), "banners.json"), "utf8");
    return bannerDocumentSchema.parse(JSON.parse(content));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return structuredClone(defaultBannerDocument);
    }
    // Never silently replace a corrupt or unreadable saved configuration.
    throw error;
  }
}

export class BannerConflictError extends Error {}

export async function saveBannerDocument(input: BannerDocument): Promise<BannerDocument> {
  const directory = bannerDataDirectory();
  await mkdir(directory, { recursive: true });
  const lockPath = path.join(directory, "save.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new BannerConflictError("ذخیره دیگری در حال انجام است؛ چند لحظه بعد دوباره تلاش کنید.");
    }
    throw error;
  }
  const temporaryPath = path.join(directory, `${randomUUID()}.tmp`);
  try {
    const current = await readBannerDocument();
    if (current.revision !== input.revision) {
      throw new BannerConflictError("بنرها در نشست دیگری تغییر کرده‌اند. ابتدا صفحه را دوباره باز کنید.");
    }
    await Promise.all(input.banners.map(async (banner) => {
      if (banner.src.startsWith("/api/banner-images/")) {
        await stat(bannerImagePath(banner.src.slice("/api/banner-images/".length)));
      }
    }));
    const document = { revision: randomUUID(), banners: input.banners };
    await writeFile(temporaryPath, JSON.stringify(document, null, 2), "utf8");
    await rename(temporaryPath, path.join(directory, "banners.json"));
    return document;
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
    await lock.close();
    await unlink(lockPath);
  }
}

export async function storeBannerImage(bytes: Uint8Array) {
  // sharp is bundled by Next.js; decoding and re-encoding rejects disguised
  // files and strips metadata. The caller limits the compressed upload size.
  const { default: sharp } = await import("sharp");
  const decoder = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await decoder.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) ||
      !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1 ||
      metadata.width > 10000 || metadata.height > 10000) {
    throw new Error("Unsupported banner image");
  }
  const { data, info } = await decoder.rotate().webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
  const filename = `${randomUUID()}.webp`;
  const imagePath = bannerImagePath(filename);
  await mkdir(path.dirname(imagePath), { recursive: true });
  await writeFile(imagePath, data, { flag: "wx" });
  return { src: `/api/banner-images/${filename}`, width: info.width, height: info.height } satisfies Pick<SiteBanner, "src" | "width" | "height">;
}
