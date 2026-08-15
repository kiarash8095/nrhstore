import Image from "next/image";
import Link from "next/link";

import { getSpecificProducts } from "@/services/getSpecificProducts";
import { getSpecificCategory } from "@/services/getSpecificCategory";

import { Products } from "@/types/products";
import { Category } from "@/types/category";
import { sp } from "@/utils/numbers";

const CATEGORY_MAP: Record<string, number> = {
  edari: 365,
  network: 55,
  printer: 59,
  hardware: 57,
  accessory: 58,
};

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { slug } = await params;

  const categoryId = CATEGORY_MAP[slug];

  // دسته‌بندی وجود ندارد
  if (!categoryId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-500">
          دسته‌بندی یافت نشد
        </h1>

        <Link
          href="/"
          className="inline-block mt-4 text-orange-500 hover:underline"
        >
          بازگشت به خانه
        </Link>
      </div>
    );
  }

  // دریافت همزمان دسته‌بندی و محصولات
  const [category, products] = await Promise.all([
    getSpecificCategory(categoryId),
    getSpecificProducts(categoryId),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link
          href="/"
          className="hover:text-orange-500"
        >
          خانه
        </Link>

        <span>/</span>

        <Link
          href="/products"
          className="hover:text-orange-500"
        >
          محصولات
        </Link>

        <span>/</span>

        <span className="text-orange-500">
          {category?.name || slug}
        </span>
      </div>

      {/* Category Header */}
      {category && (
        <div className="flex items-center gap-4 mb-8 p-4 bg-orange-50 rounded-xl">
          <div className="relative w-16 h-16 shrink-0">
            <Image
              src={
                category.image?.src ||
                "/default-category.png"
              }
              alt={category.name}
              fill
              sizes="64px"
              className="object-cover rounded-lg"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              {category.name}
            </h1>

            <span className="text-gray-500">
              {products.length} محصول
            </span>
          </div>
        </div>
      )}

      {/* Products */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group"
            >
              <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Product Image */}
                <div className="relative h-48 bg-gray-100">
                  <Image
                    src={
                      product.images?.[0]?.src ||
                      "/default-product.png"
                    }
                    alt={product.name}
                    fill
                    sizes="
                      (max-width: 768px) 50vw,
                      (max-width: 1024px) 33vw,
                      25vw
                    "
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-orange-500 transition">
                    {product.name}
                  </h3>

                  <p className="text-orange-500 font-bold mt-2">
                    {sp(product.prices?.price)} تومان
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">
            محصولی در این دسته‌بندی وجود ندارد
          </p>

          <Link
            href="/"
            className="inline-block mt-4 text-orange-500 hover:underline"
          >
            بازگشت به خانه
          </Link>
        </div>
      )}
    </div>
  );
}