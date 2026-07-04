import { createClient } from "@/lib/db/supabase/server";
import {
  gerarHorariosDisponiveis,
  type Intervalo,
  type SlotCandidato,
} from "@/lib/agenda/gerar-horarios-disponiveis";
import { notificarConfirmacao } from "@/lib/notificacoes";

export type NovoAgendamentoInput = {
  nome: string;
  telefone: string;
  email: string | null;
  servicoId: string;
  profissionalId: string;
  inicio: Date;
};

export type Agendamento = {
  id: string;
  tokenGerenciamento: string;
  inicio: Date;
  fim: Date;
};

export type AgendamentoDetalhes = {
  id: string;
  inicio: Date;
  fim: Date;
  status: "confirmado" | "cancelado" | "concluido" | "no_show";
  servicoNome: string;
  profissionalNome: string;
  clienteNome: string;
};

// Início/fim do dia (00:00–23:59:59.999) no fuso local do processo — suficiente para um
// salão com um único fuso horário de operação.
function limitesDoDia(data: Date) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(data);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

export async function buscarSlotsDisponiveis(
  profissionalId: string,
  servicoId: string,
  data: Date,
): Promise<SlotCandidato[]> {
  const supabase = await createClient();
  const { inicio: inicioDia, fim: fimDia } = limitesDoDia(data);
  const diaSemana = data.getDay();

  const [servicoRes, configRes, horariosRes, bloqueiosRes, agendamentosRes] = await Promise.all([
    supabase.from("salao_servicos").select("duracao_minutos").eq("id", servicoId).single(),
    supabase.from("salao_configuracoes").select("buffer_padrao_minutos").single(),
    supabase
      .from("salao_horarios_trabalho")
      .select("hora_inicio, hora_fim")
      .eq("profissional_id", profissionalId)
      .eq("dia_semana", diaSemana),
    // salao_bloqueios_agenda e salao_agendamentos não têm select público (RLS só admin,
    // de propósito, pra não vazar dado de cliente) — por isso via RPC security definer
    // que devolve só o intervalo de tempo, não quem ocupa.
    supabase.rpc("salao_bloqueios_dia", {
      p_profissional_id: profissionalId,
      p_inicio_dia: inicioDia.toISOString(),
      p_fim_dia: fimDia.toISOString(),
    }),
    supabase.rpc("salao_horarios_ocupados_dia", {
      p_profissional_id: profissionalId,
      p_inicio_dia: inicioDia.toISOString(),
      p_fim_dia: fimDia.toISOString(),
    }),
  ]);

  if (servicoRes.error) throw servicoRes.error;
  if (configRes.error) throw configRes.error;
  if (horariosRes.error) throw horariosRes.error;
  if (bloqueiosRes.error) throw bloqueiosRes.error;
  if (agendamentosRes.error) throw agendamentosRes.error;

  const janelasTrabalho: Intervalo[] = horariosRes.data.map((h) => {
    const [horaIni, minIni] = h.hora_inicio.split(":").map(Number);
    const [horaFim, minFim] = h.hora_fim.split(":").map(Number);
    const inicioJanela = new Date(data);
    inicioJanela.setHours(horaIni, minIni, 0, 0);
    const fimJanela = new Date(data);
    fimJanela.setHours(horaFim, minFim, 0, 0);
    return { inicio: inicioJanela, fim: fimJanela };
  });

  const paraIntervalo = (r: { inicio: string; fim: string }): Intervalo => ({
    inicio: new Date(r.inicio),
    fim: new Date(r.fim),
  });

  return gerarHorariosDisponiveis({
    janelasTrabalho,
    bloqueios: bloqueiosRes.data.map(paraIntervalo),
    agendamentosOcupados: agendamentosRes.data.map(paraIntervalo),
    duracaoServicoMinutos: servicoRes.data.duracao_minutos,
    bufferMinutos: configRes.data.buffer_padrao_minutos,
  });
}

// Sem projeto Supabase real ainda não há `supabase gen types` rodado — tipamos o
// retorno das RPCs manualmente aqui (ver "Pendências" no CLAUDE.md).
type CriarAgendamentoRow = { id: string; token_gerenciamento: string; inicio: string; fim: string };

type ObterAgendamentoRow = {
  id: string;
  inicio: string;
  fim: string;
  status: AgendamentoDetalhes["status"];
  servico_nome: string;
  profissional_nome: string;
  cliente_nome: string;
};

// Compartilhado entre a Server Action do wizard (app/(site)/agendar/actions.ts) e a
// ferramenta de agendamento do assistente de chat (lib/ia/ferramentas.ts) — mesma regra
// de tradução de erro nos dois lugares que criam agendamento.
export function mensagemDeErroAgendamento(error: unknown): string {
  // 23P01 = exclusion_violation (Postgres) — outro cliente reservou o mesmo horário
  // entre a checagem de disponibilidade e a confirmação.
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23P01") {
    return "Esse horário acabou de ser reservado por outra pessoa. Escolha outro.";
  }
  // Erros do supabase-js (ex.: PostgrestError de uma exceção `raise` na RPC) são
  // objetos simples com `.message`, não instâncias de Error.
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Não foi possível agendar.";
}

export async function criarAgendamento(input: NovoAgendamentoInput): Promise<Agendamento> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("salao_criar_agendamento", {
      p_nome: input.nome,
      p_telefone: input.telefone,
      p_email: input.email,
      p_servico_id: input.servicoId,
      p_profissional_id: input.profissionalId,
      p_inicio: input.inicio.toISOString(),
    })
    .single<CriarAgendamentoRow>();

  if (error) throw error;

  const agendamento: Agendamento = {
    id: data.id,
    tokenGerenciamento: data.token_gerenciamento,
    inicio: new Date(data.inicio),
    fim: new Date(data.fim),
  };

  // Best-effort: se o email falhar, o agendamento já está confirmado no banco mesmo
  // assim — não bloqueamos a reserva por causa da notificação.
  void notificarConfirmacaoAgendamento(agendamento).catch(() => {});

  return agendamento;
}

async function notificarConfirmacaoAgendamento(agendamento: Agendamento): Promise<void> {
  const detalhes = await obterAgendamentoPorToken(agendamento.tokenGerenciamento);
  if (!detalhes) return;

  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("salao_agendamentos")
    .select("salao_clientes(email)")
    .eq("id", agendamento.id)
    .single<{ salao_clientes: { email: string | null } }>();
  if (!cliente) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  await notificarConfirmacao({
    agendamentoId: agendamento.id,
    clienteNome: detalhes.clienteNome,
    clienteEmail: cliente.salao_clientes.email,
    servicoNome: detalhes.servicoNome,
    profissionalNome: detalhes.profissionalNome,
    inicio: agendamento.inicio,
    linkGerenciamento: `${siteUrl}/meus-agendamentos/${agendamento.tokenGerenciamento}`,
  });
}

export async function obterAgendamentoPorToken(token: string): Promise<AgendamentoDetalhes | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("salao_obter_agendamento_por_token", { p_token: token })
    .maybeSingle<ObterAgendamentoRow>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    inicio: new Date(data.inicio),
    fim: new Date(data.fim),
    status: data.status,
    servicoNome: data.servico_nome,
    profissionalNome: data.profissional_nome,
    clienteNome: data.cliente_nome,
  };
}

export async function cancelarAgendamentoPorToken(token: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("salao_cancelar_agendamento_por_token", { p_token: token });
  if (error) throw error;
}

export type AgendamentoAdmin = {
  id: string;
  inicio: Date;
  fim: Date;
  status: AgendamentoDetalhes["status"];
  servicoNome: string;
  profissionalNome: string;
  clienteNome: string;
  clienteTelefone: string;
};

// Visão do painel admin — bypassa o fallback "sem select público" das tabelas
// salao_clientes/salao_agendamentos porque quem chama já está autenticado como
// salao_is_admin().
export async function listarAgendamentosAdmin(inicio: Date, fim: Date): Promise<AgendamentoAdmin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salao_agendamentos")
    .select(
      "id, inicio, fim, status, salao_servicos(nome), salao_profissionais(nome), salao_clientes(nome, telefone)",
    )
    .gte("inicio", inicio.toISOString())
    .lte("inicio", fim.toISOString())
    .order("inicio")
    .overrideTypes<
      {
        id: string;
        inicio: string;
        fim: string;
        status: AgendamentoDetalhes["status"];
        salao_servicos: { nome: string };
        salao_profissionais: { nome: string };
        salao_clientes: { nome: string; telefone: string };
      }[]
    >();

  if (error) throw error;

  return data.map((a) => ({
    id: a.id,
    inicio: new Date(a.inicio),
    fim: new Date(a.fim),
    status: a.status,
    servicoNome: a.salao_servicos.nome,
    profissionalNome: a.salao_profissionais.nome,
    clienteNome: a.salao_clientes.nome,
    clienteTelefone: a.salao_clientes.telefone,
  }));
}

export async function atualizarStatusAgendamento(
  id: string,
  status: AgendamentoDetalhes["status"],
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("salao_agendamentos").update({ status }).eq("id", id);
  if (error) throw error;
}
