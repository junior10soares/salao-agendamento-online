import { cn } from "@/lib/utils";

export const NOME_SALAO = "Studio Áurea";

// Logotipo simples (monograma + wordmark) — nome genérico até o usuário definir a marca
// real do salão (ver "Pendências" no CLAUDE.md). Trocar aqui troca em todo o site.
export function Logo({
  showWordmark = true,
  className,
}: {
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="border-gold text-gold font-heading flex size-8 shrink-0 items-center justify-center rounded-full border text-sm">
        SA
      </span>
      {showWordmark && <span className="font-heading text-xl">{NOME_SALAO}</span>}
    </span>
  );
}
