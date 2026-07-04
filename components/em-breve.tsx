// Estado vazio mostrado quando o catálogo ainda não tem conteúdo real cadastrado
// (Supabase não configurado ainda, ou tabela vazia) — ver "Pendências" no CLAUDE.md.
export function EmBreve({ mensagem }: { mensagem: string }) {
  return (
    <div className="border-border rounded-lg border border-dashed py-16 text-center">
      <p className="text-muted-foreground">{mensagem}</p>
    </div>
  );
}
