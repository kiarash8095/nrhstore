import { getMainCategories } from "@/services/categories";
import { HiOutlineViewGrid } from "react-icons/hi";
import Image from "next/image";
import { shortText } from "@/utils/shortText";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, 
    CarouselItem,CarouselNext, CarouselPrevious} from "@/components/ui/carousel";


export async function Categories()
{
    const slugs = ["edari", "network", "printer", "hardware", "accessory", "laptop"];
    const ids = [55, 85, 57, 58, 59, 215];
    const data = await getMainCategories(ids)
    console.log(data);


    return(
        <div className="w-full my-15">
            <div className="flex mb-7">
                <div className="flex items-center p-2 rounded-lg border">

                    <HiOutlineViewGrid color="orange" size={30}/>
                </div>
                <div className="flex flex-col items-start mr-3">
                    <p className="text-2xl font-bold">دسته ها</p>
                    <span className="font-thin text-sm text-gray-500">نمایش همه</span>
                </div>
            </div>

            <Carousel className="w-full m-auto" opts={{
                direction: 'rtl',
            }}>

                <CarouselContent>
                    {data?.map(category => {

                        return(<Link href={`/products/category/${category.slug}`} key={category.id}>
                            <CarouselItem>
                                <div className="p-1">
                                    <Card className="">
                                        <CardContent className="flex flex-col aspect-square items-center justify-center
                                         p-6">
                                            <Image width={80} height={80} src={category?.image.src} alt={`${category.name}`}/>
                                            <p>{shortText(category?.name)}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        </Link>)
                    })}
                </CarouselContent>
                <CarouselPrevious/>
                <CarouselNext/>
            </Carousel>

        </div>
    )
}