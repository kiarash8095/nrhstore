"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { CircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive>) {
  return <RadioGroupPrimitive data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root data-slot="radio-group-item" className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-background text-orange-600 outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-orange-200 data-checked:border-orange-600 data-disabled:cursor-not-allowed data-disabled:opacity-40", className)} {...props}>
    <RadioPrimitive.Indicator className="flex items-center justify-center"><CircleIcon className="size-2 fill-current" /></RadioPrimitive.Indicator>
  </RadioPrimitive.Root>
}

export { RadioGroup, RadioGroupItem }
