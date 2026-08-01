import { ElementType } from "react"

import ComputerIcon from "@/components/icons/ComputerIcon"
import LaptopIcon from "@/components/icons/LaptopIcon"
import PrinterIcon from "@/components/icons/PrinterIcon"
import AccessoryIcon from "@/components/icons/AccessoryIcon"
import NetworkIcon from "@/components/icons/NetworkIcon"



// export type Category = {
//     _id: number,
//     name: string,
//     slug: string,
//     icon: ElementType,
// }

export const categories = [
    {_id: 55, name: "لپ تاپ", slug: "laptop", icon: LaptopIcon},
    {_id: 365, name: "کامپیوتر و قطعات", slug: "hardware", icon: AccessoryIcon},
    {_id: 57, name: "ماشین های اداری", slug: "edari", icon: PrinterIcon},
    {_id: 58, name: "تجیزات شبکه", slug: "network", icon: NetworkIcon},
    {_id: 56, name: "لوازم جانبی", slug: "accessory", icon: ComputerIcon},
]