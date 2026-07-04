import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn("space-y-3", align === "center" && "text-center", className)}>
      {eyebrow && (
        <p className="text-gold text-sm font-medium tracking-[0.2em] uppercase">{eyebrow}</p>
      )}
      <h2 className="text-3xl md:text-4xl font-heading">{title}</h2>
      {description && (
        <p className="text-muted-foreground mx-auto max-w-2xl text-balance">{description}</p>
      )}
    </Reveal>
  );
}
