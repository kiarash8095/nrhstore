import { CiHardDrive } from "react-icons/ci";

import { ProductSection } from "@/features/products";
import { getSpecificProducts } from "@/features/products/server";

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
