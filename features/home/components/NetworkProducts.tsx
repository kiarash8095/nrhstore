import { PiNetwork } from "react-icons/pi";

import { ProductSection } from "@/features/products";
import { getSpecificProducts } from "@/features/products/server";

export async function NetworkProducts() {
  const products = await getSpecificProducts(58);

  return (
    <ProductSection
      title="تجهیزات شبکه"
      products={products ?? []}
      icon={PiNetwork}
      moreHref="/products/category/network"
    />
  );
}
