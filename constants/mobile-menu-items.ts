import CartIcon from "@/components/icons/mobile-menu/CartIcon"
import CategoryIcon from "@/components/icons/mobile-menu/CategoryIcon"
import HomeIcon from "@/components/icons/mobile-menu/HomeIcon"
import UserIcon from "@/components/icons/mobile-menu/UserIcon"
import { ElementType } from "react"


export type MobileMenu =  {
    /** شناسه‌ی پایدار برای اتصال اکشن؛ نام نمایشی ممکن است تغییر کند */
    id: "home" | "categories" | "cart" | "auth",
    name: string,
    icon: ElementType
}

export const mobileMenuItems: MobileMenu[] = [
    {id: "home", name: "خانه", icon: HomeIcon},
    {id: "categories", name: "دسته ها", icon: CategoryIcon},
    {id: "cart", name: "سبد خرید", icon: CartIcon},
    {id: "auth", name: "ورود|ثبت نام", icon: UserIcon},
]