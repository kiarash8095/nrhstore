import Image from "next/image"
import FireIcon from "@/public/HugeiconsFireSecurity-1.webp"
import HotPriceIcon from "@/public/HugeiconsHotPrice-1.webp"
import TruckIcon from "@/public/HugeiconsTruckDelivery-1.webp"
import QuestionIcon from "@/public/HugeiconsUserQuestion01-1.webp"

export const icons = [
    {name: 'امنیت کامل', desc: "دارای درگاه ایمن و مطمئن", img: FireIcon},
    {name: 'بهترین قیمت', desc: "مطمئن باش کف قیمت بازارو داریم", img: HotPriceIcon},
    {name: 'پشتیبانی خوب', desc: "تلفنی پاسخگوییم", img: QuestionIcon},
    {name: 'ارسال سریع', desc: "ارسال فوری شهر همدان", img: TruckIcon},
]

export function SticksToFooter()
{
    return(
        <div className="flex gap-3 bg-gray-100 w-[95%] m-auto divide-x-3 divide-dashed
        rounded-t-3xl">
            <div className="m-auto flex gap-10">
                {icons.map(item => {

                return(
                    <div key={item.name} className="flex items-center justify-center w-auto px-3 py-2">
                        <Image className="w-[40px] h-[40px] ml-2" src={item.img} alt={item.name}/>
                        <div className="flex flex-col items-start gap-2">
                            <p className="text-sm text-nowrap" style={{fontWeight: "400"}}>{item.name}</p>
                            <span className="text-xs">{item.desc}</span>
                        </div>
                    </div>
                )
            })}
            </div>
            
            </div>
    )
}