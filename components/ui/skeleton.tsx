import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative animate-pulse overflow-hidden rounded-2xl bg-muted",
        // لایه درخشش؛ حرکت آن از راست به چپ و هم‌جهت با رابط RTL است
        "after:pointer-events-none after:absolute after:inset-0 after:animate-shimmer",
        "after:bg-gradient-to-l after:from-transparent after:via-white/60 after:to-transparent",
        "dark:after:via-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
