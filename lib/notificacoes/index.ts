import { createAdminClient } from "@/lib/db/supabase/admin";
import { enviarEmail } from "@/lib/notificacoes/email";

export type DadosNotificacao = {
  agendamentoId: string;
  clienteNome: string;
  clienteEmail: string | null;
  servicoNome: string;
  profissionalNome: string;
  inicio: Date;
  linkGerenciamento: string;
};

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

// Loga o resultado em salao_notificacoes_enviadas (chave única agendamento_id+tipo+canal
// serve de idempotência — o cron de lembretes usa isso pra nunca reenviar a mesma coisa).
// Client de service-role porque nem o cliente anônimo nem o cron têm sessão de admin.
async function registrarEnvio(
  agendamentoId: string,
  tipo: "confirmacao" | "lembrete",
  enviar: () => Promise<void>,
): Promise<void> {
  const supabase = createAdminClient();
  try {
    await enviar();
    await supabase
      .from("salao_notificacoes_enviadas")
      .upsert(
        { agendamento_id: agendamentoId, tipo, canal: "email", status: "enviado" },
        { onConflict: "agendamento_id,tipo,canal" },
      );
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    await supabase
      .from("salao_notificacoes_enviadas")
      .upsert(
        { agendamento_id: agendamentoId, tipo, canal: "email", status: "falhou", erro: mensagem },
        { onConflict: "agendamento_id,tipo,canal" },
      );
  }
}

// Best-effort: falha ao notificar nunca deve derrubar a criação/lembrete do agendamento
// em si. Sem cliente.email, não tem o que notificar (não pedimos email obrigatório no
// agendamento) — só pula.
export async function notificarConfirmacao(dados: DadosNotificacao): Promise<void> {
  if (!dados.clienteEmail) return;
  await registrarEnvio(dados.agendamentoId, "confirmacao", () =>
    enviarEmail({
      para: dados.clienteEmail!,
      assunto: "Agendamento confirmado",
      html: `<p>Olá ${dados.clienteNome}, seu agendamento de <strong>${dados.servicoNome}</strong> com ${dados.profissionalNome} está confirmado para ${formatarDataHora(dados.inicio)}.</p><p>Gerencie seu horário: <a href="${dados.linkGerenciamento}">${dados.linkGerenciamento}</a></p>`,
    }),
  );
}

export async function notificarLembrete(dados: DadosNotificacao): Promise<void> {
  if (!dados.clienteEmail) return;
  await registrarEnvio(dados.agendamentoId, "lembrete", () =>
    enviarEmail({
      para: dados.clienteEmail!,
      assunto: "Lembrete do seu agendamento amanhã",
      html: `<p>Olá ${dados.clienteNome}, lembrando do seu agendamento de <strong>${dados.servicoNome}</strong> com ${dados.profissionalNome} amanhã, ${formatarDataHora(dados.inicio)}.</p>`,
    }),
  );
}
