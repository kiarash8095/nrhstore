import { TiPrinter } from "react-icons/ti";

import { ProductSection } from "@/features/products";
import { getSpecificProducts } from "@/features/products/server";

export async function EdariProducts() {
  const products = await getSpecificProducts(57);

  return (
    <ProductSection
      title="ماشین‌های اداری"
      products={products ?? []}
      icon={TiPrinter}
      moreHref="/products/category/edari"
    />
  );
}
