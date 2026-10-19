"use client"

import { useEffect,useRef,useState } from "react";

interface LazySectionProps {
    children: React.ReactNode;
    fallback: React.ReactNode;
    rootMargin?: string,
}

export function LazySection({
    children,
    fallback,
    rootMargin = "300px",
}: LazySectionProps)
{
    const ref = useRef<HTMLDivElement>(null)

    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const element = ref.current

        if(!element) return

        const observer = new IntersectionObserver(([entry]) => {
            if(entry.isIntersecting)
            {
                setIsVisible(true)
                observer.disconnect()
            }
        }, {
            rootMargin,
            threshold: 0,
        })

        observer.observe(element)

        return () => observer.disconnect()
            
    }, [rootMargin])

    return(
        <div ref={ref} className="w-full">
            {isVisible ? children : fallback}
        </div>
    )
}