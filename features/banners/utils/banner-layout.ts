import type { SiteBanner } from "../schemas/banner.schema";

type SideCrop = { left: number; right: number };

// These bounds belong to the bundled artwork, not editable titles or upload IDs.
const sideCrops: Partial<Record<string, SideCrop>> = {
  "/Untitled-1-2.webp": { left: 0.05, right: 0.05 },
  "/Untitled-11.webp": { left: 0.05, right: 0.05 },
  "/slider1-5.webp": { left: 0.24, right: 0.1 },
  "/slider4.webp": { left: 0.22, right: 0.09 },
};

type BannerDimensions = Pick<SiteBanner, "src" | "width" | "height">;

export function getBannerLayout(banner: BannerDimensions, frameAspectRatio?: number) {
  const crop = sideCrops[banner.src] ?? { left: 0, right: 0 };
  const visibleFraction = 1 - crop.left - crop.right;
  const aspectRatio = (banner.width * visibleFraction) / banner.height;
  // Fit the cropped artwork into a shared frame, including portrait uploads.
  const fittedWidth = Math.min(1, aspectRatio / (frameAspectRatio ?? aspectRatio));
  const imageWidth = fittedWidth / visibleFraction;
  const imageLeft = (1 - fittedWidth) / 2 - crop.left * imageWidth;

  return { aspectRatio, imageWidth, imageLeft };
}
