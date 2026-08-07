import { Skeleton } from "../ui/skeleton"

export function MainMenuSkeleton()
{
    return(
        <div className="flex w-full max-w-xs flex-col gap-2">
            <Skeleton className="h-4 w-full"/>
        </div>
    )
}