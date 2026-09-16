import { TiPrinter } from "react-icons/ti";

import { getSpecificProducts } from "@/services/getSpecificProducts";
import { ProductSection } from "./ProductSection";

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
