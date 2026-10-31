import "server-only";

import sanitizeHtml from "sanitize-html";

export function ProductDescription({ value }: { value: string }) {
  const html = sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
  });

  if (!html.trim()) return <p className="text-sm leading-8 text-gray-500">توضیحی برای این محصول ثبت نشده است.</p>;

  return <div
    className="break-words text-sm leading-8 text-gray-600 [&_a]:text-orange-700 [&_a]:underline [&_blockquote]:border-r-2 [&_blockquote]:border-gray-200 [&_blockquote]:pr-4 [&_h2]:my-4 [&_h2]:text-base [&_h2]:font-bold [&_h3]:my-3 [&_h3]:font-bold [&_h4]:my-3 [&_h4]:font-bold [&_li]:my-1 [&_ol]:list-inside [&_ol]:list-decimal [&_p+p]:mt-3 [&_ul]:list-inside [&_ul]:list-disc"
    dangerouslySetInnerHTML={{ __html: html }}
  />;
}
