import { SectionHeading } from "@/components/section-heading";
import { EmBreve } from "@/components/em-breve";
import { AgendamentoWizard } from "@/components/agendamento-wizard";
import {
  listarCategoriasComServicos,
  listarServicosPorProfissional,
  obterProfissional,
} from "@/lib/db/supabase/catalogo";

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ profissional?: string }>;
}) {
  const { profissional: profissionalId } = await searchParams;

  // Veio de um card em /profissionais: pula a etapa de escolher profissional e já
  // restringe os serviços aos que essa pessoa atende.
  const profissionalFixo = profissionalId ? await obterProfissional(profissionalId).catch(() => null) : null;

  const categorias = profissionalFixo
    ? await listarServicosPorProfissional(profissionalFixo.id)
        .then((servicos) => [{ id: "todos", nome: "Serviços disponíveis", servicos }])
        .catch(() => null)
    : await listarCategoriasComServicos().catch(() => null);
  const temServicos = categorias && categorias.some((c) => c.servicos.length > 0);

  return (
    <main className="mx-auto max-w-3xl space-y-16 px-6 py-24">
      <SectionHeading
        eyebrow="Reserve seu horário"
        title="Agendar"
        description={profissionalFixo ? `Com ${profissionalFixo.nome}` : undefined}
      />
      {!temServicos ? (
        <EmBreve mensagem="Agendamento online em breve." />
      ) : (
        <AgendamentoWizard categorias={categorias!} profissionalFixo={profissionalFixo} />
      )}
    </main>
  );
}
