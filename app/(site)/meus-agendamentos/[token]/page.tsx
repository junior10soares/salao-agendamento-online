import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { CancelarAgendamentoButton } from "@/components/cancelar-agendamento-button";
import { obterAgendamentoPorToken } from "@/lib/db/supabase/agendamentos";

const STATUS_LABEL: Record<string, string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
  no_show: "Não compareceu",
};

export default async function MeuAgendamentoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const agendamento = await obterAgendamentoPorToken(token).catch(() => null);

  if (!agendamento) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-24">
      <SectionHeading eyebrow="Seu horário" title="Meu agendamento" />
      <Reveal className="border-border bg-card space-y-3 rounded-lg border p-8">
        <p>
          <span className="text-muted-foreground">Serviço:</span> {agendamento.servicoNome}
        </p>
        <p>
          <span className="text-muted-foreground">Profissional:</span>{" "}
          {agendamento.profissionalNome}
        </p>
        <p>
          <span className="text-muted-foreground">Quando:</span>{" "}
          {agendamento.inicio.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
        </p>
        <p>
          <span className="text-muted-foreground">Status:</span>{" "}
          {STATUS_LABEL[agendamento.status] ?? agendamento.status}
        </p>
        {agendamento.status === "confirmado" && (
          <div className="pt-2">
            <CancelarAgendamentoButton token={token} />
          </div>
        )}
      </Reveal>
    </main>
  );
}
