import { BsMouse3 } from "react-icons/bs";

import { ProductSection } from "@/features/products";
import { getSpecificProducts } from "@/features/products/server";

export async function Accessories() {
  const [mouse, keyboard] = await Promise.all([
    getSpecificProducts(60),
    getSpecificProducts(61),
  ]);

  return (
    <ProductSection
      title="موس و کیبورد"
      products={[...(mouse ?? []), ...(keyboard ?? [])]}
      icon={BsMouse3}
      moreHref="/products/category/accessory"
    />
  );
}
