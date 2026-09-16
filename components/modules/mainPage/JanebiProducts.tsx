import { CiHardDrive } from "react-icons/ci";

import { getSpecificProducts } from "@/services/getSpecificProducts";
import { ProductSection } from "./ProductSection";

export async function JanebiProducts() {
  const products = await getSpecificProducts(215);

  return (
    <ProductSection
      title="حافظه‌های جانبی"
      products={products ?? []}
      icon={CiHardDrive}
      moreHref="/products/category/accessory"
    />
  );
}
