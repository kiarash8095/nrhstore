"use client";

import { AnimatePresence,motion } from "motion/react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  // Keep transactional forms single-mounted and editorial SSR content visible before hydration.
  if (pathname === '/cart' || pathname === '/checkout' || pathname === '/blog' || pathname.startsWith('/blog/') || pathname === '/account' || pathname.startsWith('/account/')) return <div className="w-full min-w-0 flex-1">{children}</div>;

  return (
    <AnimatePresence mode="wait" initial={false}>
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
