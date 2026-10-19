import AccessoryIcon from "@/components/icons/AccessoryIcon"
import ComputerIcon from "@/components/icons/ComputerIcon"
import LaptopIcon from "@/components/icons/LaptopIcon"
import NetworkIcon from "@/components/icons/NetworkIcon"
import PrinterIcon from "@/components/icons/PrinterIcon"
import { ComponentType,SVGProps } from "react"

export const CategoryIcons: Record<string,ComponentType<SVGProps<SVGSVGElement>>> = {
    hardware: ComputerIcon,
    laptop: LaptopIcon,
    network: NetworkIcon,
    accessory: AccessoryIcon,
    edari: PrinterIcon,
}