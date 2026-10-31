import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir,readFile,rename,unlink,writeFile } from "node:fs/promises";
import path from "node:path";
import { authError } from "./backend/errors";
import { getAuthConfig } from "./config";
import { getSessionId,type CookieJar } from "./cookies";

// Persistent revocations for a single Node server. No WordPress credentials are stored here.
function revokedPath(id: string) {
  const directory = process.env.AUTH_SESSION_DATA_DIR
    ? path.resolve(/* turbopackIgnore: true */ process.env.AUTH_SESSION_DATA_DIR)
    : path.join(process.cwd(), "data", "auth");
  return path.join(directory, "revoked", `${id}.json`);
}

export async function isSessionRevoked(jar: CookieJar): Promise<boolean> {
  // In production, /me validates WordPress sessions on every hosting platform.
  if (getAuthConfig().upstreamSessionRevocation) return false;
  const id = getSessionId(jar);
  if (!id) return false; // A freshly authenticated upstream jar has no local ID yet.
  try {
    const expires = JSON.parse(await readFile(revokedPath(id), "utf8"));
    if (!Number.isSafeInteger(expires)) throw new Error("Invalid revocation record");
    if (expires > Date.now()) return true;
    await unlink(revokedPath(id));
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw authError("backend_unavailable");
  }
}

export async function revokeSession(jar: CookieJar): Promise<void> {
  const id = getSessionId(jar);
  if (!id) return;
  const target = revokedPath(id);
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(temporary, JSON.stringify(Date.now() + getAuthConfig().sessionCookieMaxAge * 1000), { mode: 0o600, flag: "wx" });
    await rename(temporary, target);
  } catch {
    await unlink(temporary).catch(() => {});
    // Never report a successful logout if local revocation could not be persisted.
    throw authError("backend_unavailable");
  }
}
