import { PiNetwork } from "react-icons/pi";

import { getSpecificProducts } from "@/services/getSpecificProducts";
import { ProductSection } from "./ProductSection";

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
