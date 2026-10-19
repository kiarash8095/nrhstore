"use client";

import { AnimatePresence,motion } from "motion/react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  // Transactional forms must not mount twice during AnimatePresence's exit phase.
  if (pathname === '/cart' || pathname === '/checkout') return <div className="w-full min-w-0 flex-1">{children}</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full min-w-0 flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
