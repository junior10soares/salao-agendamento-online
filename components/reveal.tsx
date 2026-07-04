"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";
import { fadeInUp, scrollRevealViewport, staggerContainer } from "@/lib/motion";

// Átomo de scroll-reveal reutilizado em todas as seções do site público.
export function Reveal({ children, ...props }: ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="show"
      viewport={scrollRevealViewport}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Container para grids/listas: revela os filhos (envolvidos em <Reveal>) em cascata.
export function StaggerGroup({ children, ...props }: ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={scrollRevealViewport}
      {...props}
    >
      {children}
    </motion.div>
  );
}
