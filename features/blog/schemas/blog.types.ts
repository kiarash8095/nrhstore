export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface BlogImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface BlogPostSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  modifiedAt: string;
  author: { id: number; name: string } | null;
  categories: BlogCategory[];
  image: BlogImage | null;
  readingMinutes: number;
}

export interface BlogPost extends BlogPostSummary {
  contentHtml: string;
  headings: { id: string; text: string; level: number }[];
  tags: { id: number; name: string; slug: string }[];
  commentsOpen: boolean;
  relatedIds: number[];
}

export interface BlogCollection {
  items: BlogPostSummary[];
  total: number;
  totalPages: number;
  page: number;
}

export interface BlogComment {
  id: number;
  parent: number;
  author: string;
  content: string;
  publishedAt: string;
}

export interface BlogCommentsPage {
  items: BlogComment[];
  total: number;
  totalPages: number;
  page: number;
}
