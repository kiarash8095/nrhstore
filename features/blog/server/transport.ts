import "server-only";
import { boundedJson } from "@/lib/http/bounded-json";
import { getWordPressApiUrl } from "@/lib/wordpress/config";

export class BlogApiError extends Error {
  constructor(
    readonly status: number,
    readonly code = "blog_unavailable",
  ) {
    super("Blog service unavailable");
  }
}

export async function blogRequest(
  path: string,
  options: {
    private?: boolean;
    method?: "POST";
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) {
  if (!path.startsWith("/wp/v2/") && !path.startsWith("/boom/v1/blog/"))
    throw new Error("Invalid blog endpoint");
  try {
    const response = await fetch(`${getWordPressApiUrl()}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(options.private ? { "Cache-Control": "no-cache, no-store" } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      ...(options.private
        ? { cache: "no-store" as const }
        : { next: { revalidate: 300, tags: ["blog"] } }),
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    const data = await boundedJson(response, 2 * 1024 * 1024);
    if (
      options.private &&
      (/hit|stale|revalidated/i.test(
        ["X-Cache", "X-LiteSpeed-Cache", "CF-Cache-Status"]
          .map((h) => response.headers.get(h))
          .join(" "),
      ) ||
        Number(response.headers.get("Age")) > 0)
    )
      throw new BlogApiError(502);
    if (!response.ok) {
      const code =
        data &&
        typeof data === "object" &&
        "code" in data &&
        typeof data.code === "string"
          ? data.code
          : undefined;
      throw new BlogApiError(response.status, code);
    }
    return { data, headers: response.headers };
  } catch (error) {
    if (error instanceof BlogApiError) throw error;
    throw new BlogApiError(502);
  }
}
