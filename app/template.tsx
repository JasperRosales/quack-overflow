"use client";

import { motion } from "framer-motion";

/** Remounts on navigation, so each page fades/slides in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
