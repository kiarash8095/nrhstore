export function plainText(value: string) {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g, entity => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }[entity] || entity))
    .replace(/\s+/g, ' ').trim();
}

export function description(value: string, fallback: string) {
  return (plainText(value) || fallback).slice(0, 180).trim();
}
