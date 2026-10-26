import "server-only";
import sanitizeHtml from "sanitize-html";
import { decodeHTML } from "entities";
import { getWordPressApiUrl } from "@/lib/wordpress/config";
import { decodeSlug } from "@/lib/urls";
import { blogPostPath, validBlogSlug } from "../utils/blog";

export function blogText(value: string) {
  return decodeHTML(
    sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }),
  )
    .replace(/\s+/gu, " ")
    .trim();
}

export function safeImageUrl(value: string) {
  try {
    const url = new URL(value);
    const cms = new URL(getWordPressApiUrl());
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      [cms.origin, "https://nrhstore.ir"].includes(url.origin) &&
      url.pathname.startsWith("/wp-content/uploads/")
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function articleLink(value: string) {
  if (value.startsWith("#")) return value;
  try {
    const cms = new URL(getWordPressApiUrl());
    const url = new URL(value, cms.origin);
    if (
      !["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return "";
    if (url.origin === cms.origin || url.origin === "https://nrhstore.ir") {
      const category = url.pathname.match(/^\/blog\/category\/([^/]+)\/?$/);
      if (category && validBlogSlug(category[1]))
        return `/blog/category/${encodeURIComponent(decodeSlug(category[1]))}${url.search}`;
      const match = url.pathname.match(/^\/blog\/([^/]+)\/?$/);
      if (match && validBlogSlug(match[1]))
        return blogPostPath(match[1]) + url.hash;
    }
    return url.href;
  } catch {
    return "";
  }
}

/** Allow editorial HTML, never executable markup or imported theme styles. */
export function prepareBlogContent(value: string) {
  let html = sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "hr",
      "div",
      "span",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "s",
      "u",
      "mark",
      "small",
      "sup",
      "sub",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "figure",
      "figcaption",
      "img",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "caption",
      "pre",
      "code",
      "video",
      "audio",
      "source",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading", "decoding"],
      "*": ["dir"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      h2: ["id", "dir"],
      h3: ["id", "dir"],
      h4: ["id", "dir"],
      video: ["src", "controls", "preload"],
      audio: ["src", "controls", "preload"],
      source: ["src", "type"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["https"],
      video: ["https"],
      audio: ["https"],
      source: ["https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      h1: "h2",
      a: (_tag, attrs) => {
        const href = articleLink(attrs.href || "");
        return {
          tagName: "a",
          attribs: {
            href,
            ...(attrs.title ? { title: attrs.title } : {}),
            ...(!href.startsWith("/") && !href.startsWith("#")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {}),
          },
        };
      },
      img: (_tag, attrs) => ({
        tagName: "img",
        attribs: { ...attrs, loading: "lazy", decoding: "async" },
      }),
      video: (_tag, attrs) => ({
        tagName: "video",
        attribs: { src: attrs.src || "", controls: "", preload: "metadata" },
      }),
      audio: (_tag, attrs) => ({
        tagName: "audio",
        attribs: { src: attrs.src || "", controls: "", preload: "metadata" },
      }),
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  });
  const headings: { id: string; text: string; level: number }[] = [];
  const headingIds = new Map<string, string>();
  html = html.replace(
    /<h([234])([^>]*)>([\s\S]*?)<\/h\1>/g,
    (_match, level: string, attributes: string, content: string) => {
      const id = `article-section-${headings.length + 1}`;
      const original = attributes.match(/\bid="([^"]*)"/);
      if (original) headingIds.set(original[1], id);
      const safeAttributes = attributes.replace(/\s+id="[^"]*"/g, "");
      headings.push({ id, text: blogText(content), level: Number(level) });
      return `<h${level}${safeAttributes} id="${id}">${content}</h${level}>`;
    },
  );
  html = html.replace(/href="#([^"]*)"/g, (match, id: string) =>
    headingIds.has(id) ? `href="#${headingIds.get(id)}"` : match,
  );
  return { html, headings };
}
