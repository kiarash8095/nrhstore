import { IoIosLaptop } from "react-icons/io";

import { ProductSection } from "@/features/products";
import { getSpecificProducts } from "@/features/products/server";

export async function Laptops() {
  const products = await getSpecificProducts(55);

  return (
    <ProductSection
      title="لپ‌تاپ‌ها"
      products={products ?? []}
      icon={IoIosLaptop}
      moreHref="/products/category/laptop"
    />
  );
}
