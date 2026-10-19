import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Keep streamed placeholders static instead of animating every small shape.
        "relative overflow-hidden rounded-2xl bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
