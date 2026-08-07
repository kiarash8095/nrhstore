import { ElementType } from "react"
import UserIcon from "@/components/icons/mobileMenuIcons/UserIcon"
import HomeIcon from "@/components/icons/mobileMenuIcons/HomeIcon"
import CartIcon from "@/components/icons/mobileMenuIcons/CartIcon"
import CategoryIcon from "@/components/icons/mobileMenuIcons/CategoryIcon"


export type MobileMenu =  {
    name: string,
    icon: ElementType
}

export const mobileMenuItems = [
    {name: "خانه", icon: HomeIcon},
    {name: "دسته ها", icon: CategoryIcon},
    {name: "سبد خرید", icon: CartIcon},
    {name: "ورود|ثبت نام", icon: UserIcon},
]