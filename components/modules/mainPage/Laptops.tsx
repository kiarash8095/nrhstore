import { IoIosLaptop } from "react-icons/io";

import { getSpecificProducts } from "@/services/getSpecificProducts";
import { ProductSection } from "./ProductSection";

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
