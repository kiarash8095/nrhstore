import "server-only";
import { createHash } from "node:crypto";
import { mkdir, open, unlink, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { getStoreApiUrl } from "@/lib/wordpress/config";

export class CartLockBusyError extends Error {}

export function cartTokenIdentity(token: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    // Only a mutex key: WooCommerce still validates every token. Rotation keeps the same lock.
    if (
      payload.iss === "store-api" &&
      typeof payload.user_id === "string" &&
      payload.user_id.length > 0 &&
      payload.user_id.length <= 200
    )
      return "cart:" + payload.user_id;
  } catch {
    /* Opaque tokens use their complete value. */
  }
  return "token:" + token;
}

// All Node workers must share this persistent directory, as with auth/banner storage.
// Locks never expire while a request may still be writing to WooCommerce.
export async function withCartLocks<T>(
  identities: string[],
  operation: () => Promise<T>,
): Promise<T> {
  if (!identities.length) return operation();
<<<<<<< HEAD
  // Runtime lock files are persistent host data, not files to bundle with the app.
  const directory = process.env.CART_LOCK_DIR
    ? path.resolve(/* turbopackIgnore: true */ process.env.CART_LOCK_DIR)
    : path.join(process.cwd(), "data", "cart-locks");
=======
  const directory = path.resolve(
    process.env.CART_LOCK_DIR || path.join("data", "cart-locks"),
  );
>>>>>>> 5ac6dc77aee4b7ce44d07237d793f692485c06b6
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const names = [
    ...new Set(
      identities.map((identity) =>
        createHash("sha256")
          .update(getStoreApiUrl() + ":" + identity)
          .digest("hex"),
      ),
    ),
  ].sort();
  const acquired: { file: string; handle: FileHandle }[] = [];
  const deadline = Date.now() + 60_000;
  try {
    for (const name of names) {
      const file = path.join(directory, name + ".lock");
      while (true) {
        try {
          acquired.push({ file, handle: await open(file, "wx", 0o600) });
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
          if (Date.now() >= deadline)
            throw new CartLockBusyError(
              "سبد در حال به‌روزرسانی است. کمی بعد دوباره تلاش کنید.",
            );
          await delay(40);
        }
      }
    }
    return await operation();
  } finally {
    for (const { file, handle } of acquired.reverse()) {
      await handle.close();
      await unlink(file);
    }
  }
}
