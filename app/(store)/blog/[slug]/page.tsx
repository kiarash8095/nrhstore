export {
  BlogPostPage as default,
  generateBlogMetadata as generateMetadata,
} from "@/features/blog/server";
export const revalidate = 300;
