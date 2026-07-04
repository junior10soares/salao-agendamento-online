import type { Variants } from "framer-motion";

// Tokens de duração/easing únicos para o site inteiro — mantém o "ritmo" consistente.
// prefers-reduced-motion já é tratado globalmente por <MotionConfig reducedMotion="user">
// em app/layout.tsx, não precisa ser checado componente a componente.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
};

// Container de lista/grid: revela os filhos em cascata (30-50ms por item).
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// Padrão para scroll reveal com whileInView: `<motion.div variants={fadeInUp} initial="hidden"
// whileInView="show" viewport={{ once: true, margin: "-80px" }} />`
export const scrollRevealViewport = { once: true, margin: "-80px" } as const;
