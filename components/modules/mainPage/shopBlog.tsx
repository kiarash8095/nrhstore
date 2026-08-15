import { useQuery } from "@tanstack/react-query";
import { HiOutlineViewGrid } from "react-icons/hi";
import Image from "next/image";
import { Products } from "@/types/products";
import { getSpecificProducts } from "@/services/getSpecificProducts";



export function ShopBlog()
{
    
    // const {data} = useQuery<Products[]>({
    //     queryKey: ["accessories", "accessory"],
    //     queryFn: () => getSpecificProducts(59)
    // })
    // console.log(data);
    return(
        <div>
            <div className="flex">
                <HiOutlineViewGrid/>
                <div className="flex flex-col items-center">
                    <h2>دسته ها</h2>
                    <span>نمایش همه</span>
                </div>
            </div>

            <div className="flex overflow-x-scroll scrollbar-none scroll-fade gap-10">
                {/* {data?.map(product => {
                    // console.log(product?.images[0].src);
                    return(<div key={product.id} className="flex flex-col items-center gap-2 ">
                        <Image src={product?.images[0].src} width={90} height={90}
                         alt={`عکس دسته بندی ${product.name}`}/>
                         <p>{product?.name}</p>
                         <button>افزودن به سبد خرید</button>
                    </div>)
                })} */}
            </div>
        </div>
    )
}