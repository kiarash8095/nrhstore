import { getMainCategories } from "@/services/categories";
import { useQuery } from "@tanstack/react-query";
import { HiOutlineViewGrid } from "react-icons/hi";
import Image from "next/image";
import { Category } from "@/types/category";



export function Categories()
{
    const slugs = ["edari", "network", "printer", "hardware", "accessory"];
  const ids = [365, 55, 59, 57, 58];
    const {data} = useQuery<Category[]>({
        queryKey: ["main-categories"],
        queryFn: () => getMainCategories(slugs, ids)
    })
    console.log(data);
    return(
        <div>
            <div className="flex">
                <HiOutlineViewGrid/>
                <div className="flex flex-col items-center">
                    <h2>دسته ها</h2>
                    <span>نمایش همه</span>
                </div>
            </div>

            <div className="flex overflow-x-hidden scroll-fade gap-10">
                {data?.map(category => {
                    
                    return(<div key={category.id} className="flex items-center gap-2">
                        <Image src={category?.image.src} width={90} height={90}
                         alt={`عکس دسته بندی ${category.name}`}/>
                         <p>{category?.name}</p>
                    </div>)
                })}
            </div>
        </div>
    )
}