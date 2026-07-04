import { z } from "zod";
import {
  listarCategoriasComServicos,
  listarProfissionaisPorServico,
} from "@/lib/db/supabase/catalogo";
import {
  buscarSlotsDisponiveis,
  criarAgendamento,
  mensagemDeErroAgendamento,
} from "@/lib/db/supabase/agendamentos";
import type { FerramentaGroq } from "@/lib/ia/groq";

const normaliza = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const FERRAMENTAS: FerramentaGroq[] = [
  {
    type: "function",
    function: {
      name: "consultar_disponibilidade",
      description:
        "Consulta em tempo real os horários livres de um serviço (com um profissional específico ou todos que atendem esse serviço) numa data. Use sempre que o cliente perguntar se um horário está livre, pedir os horários disponíveis, ou perguntar sobre agenda de um dia específico — nunca responda isso de cabeça.",
      parameters: {
        type: "object",
        properties: {
          servico: {
            type: "string",
            description: "Nome do serviço, ex: 'Manicure', 'Corte feminino'.",
          },
          profissional: {
            type: "string",
            description: "Nome do profissional, se o cliente mencionou um. Deixe vazio se não.",
          },
          data: {
            type: "string",
            description:
              "Data no formato YYYY-MM-DD. Calcule a partir da data de hoje informada no contexto (ex.: 'amanhã', 'segunda que vem').",
          },
        },
        required: ["servico", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_agendamento",
      description:
        "Cria o agendamento de verdade no sistema. SÓ chame isso depois de: 1) o cliente confirmar explicitamente o serviço, profissional, data e horário exatos que quer; 2) você já ter perguntado e recebido o nome completo e telefone do cliente NESTA conversa. Nunca invente nome, telefone ou confirme um agendamento sem ter chamado esta ferramenta de verdade.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo do cliente, informado por ele na conversa." },
          telefone: { type: "string", description: "Telefone do cliente, informado por ele na conversa." },
          email: { type: "string", description: "Email do cliente, se ele informou. Deixe vazio se não." },
          servico: { type: "string" },
          profissional: {
            type: "string",
            description: "Nome do profissional. Deixe vazio se o cliente não especificou e o serviço só tiver um profissional.",
          },
          data: { type: "string", description: "YYYY-MM-DD" },
          horario: { type: "string", description: "HH:mm" },
        },
        required: ["nome", "telefone", "servico", "data", "horario"],
      },
    },
  },
];

type ResultadoConsulta =
  | { erro: string }
  | { servico: string; data: string; resultados: { profissional: string; horariosLivres: string[] }[] };

export async function consultarDisponibilidade(input: {
  servico?: string;
  profissional?: string;
  data?: string;
}): Promise<ResultadoConsulta> {
  if (!input.servico || !input.data) {
    return { erro: "Faltou informar serviço e/ou data." };
  }

  const data = new Date(`${input.data}T00:00:00`);
  if (Number.isNaN(data.getTime())) {
    return { erro: `Data "${input.data}" inválida.` };
  }

  const categorias = await listarCategoriasComServicos();
  const todosServicos = categorias.flatMap((c) => c.servicos);
  const servico = todosServicos.find(
    (s) =>
      normaliza(s.nome).includes(normaliza(input.servico!)) ||
      normaliza(input.servico!).includes(normaliza(s.nome)),
  );
  if (!servico) {
    return { erro: `Não encontrei o serviço "${input.servico}" no catálogo do salão.` };
  }

  let candidatos = await listarProfissionaisPorServico(servico.id);
  if (input.profissional) {
    const filtrado = candidatos.find((p) => normaliza(p.nome).includes(normaliza(input.profissional!)));
    if (!filtrado) {
      return {
        erro: `Não encontrei "${input.profissional}" atendendo ${servico.nome}, ou o nome está incorreto.`,
      };
    }
    candidatos = [filtrado];
  }
  if (candidatos.length === 0) {
    return { erro: `Nenhum profissional atende ${servico.nome} no momento.` };
  }

  const resultados = await Promise.all(
    candidatos.map(async (p) => {
      const slots = await buscarSlotsDisponiveis(p.id, servico.id, data);
      const horariosLivres = slots
        .filter((s) => s.disponivel)
        .map((s) => s.inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      return { profissional: p.nome, horariosLivres };
    }),
  );

  return { servico: servico.nome, data: input.data, resultados };
}

const criarAgendamentoInputSchema = z.object({
  nome: z.string().trim().min(2, "nome muito curto"),
  telefone: z.string().trim().min(8, "telefone inválido"),
  email: z.string().trim().email().optional().or(z.literal("")),
  servico: z.string().min(1),
  profissional: z.string().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  horario: z.string().regex(/^\d{2}:\d{2}$/, "horário deve ser HH:mm"),
});

type ResultadoCriarAgendamento =
  | { erro: string }
  | { sucesso: true; servico: string; profissional: string; dataHora: string; linkGerenciamento: string };

export async function criarAgendamentoViaChat(input: unknown): Promise<ResultadoCriarAgendamento> {
  const parsed = criarAgendamentoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { erro: `Dados incompletos ou inválidos: ${parsed.error.issues[0].message}.` };
  }
  const { nome, telefone, email, servico: servicoNome, profissional: profissionalNome, data: dataStr, horario } =
    parsed.data;

  const categorias = await listarCategoriasComServicos();
  const todosServicos = categorias.flatMap((c) => c.servicos);
  const servico = todosServicos.find(
    (s) =>
      normaliza(s.nome).includes(normaliza(servicoNome)) || normaliza(servicoNome).includes(normaliza(s.nome)),
  );
  if (!servico) return { erro: `Não encontrei o serviço "${servicoNome}" no catálogo.` };

  let candidatos = await listarProfissionaisPorServico(servico.id);
  if (profissionalNome) {
    const filtrado = candidatos.find((p) => normaliza(p.nome).includes(normaliza(profissionalNome)));
    if (!filtrado) {
      return { erro: `Não encontrei "${profissionalNome}" atendendo ${servico.nome}.` };
    }
    candidatos = [filtrado];
  }
  if (candidatos.length === 0) return { erro: `Nenhum profissional atende ${servico.nome}.` };
  if (candidatos.length > 1) {
    return {
      erro: `Mais de um profissional atende ${servico.nome} (${candidatos.map((p) => p.nome).join(", ")}) — pergunte ao cliente com quem ele quer agendar e chame a ferramenta de novo com o nome do profissional.`,
    };
  }
  const profissional = candidatos[0];

  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);
  const inicio = new Date(ano, mes - 1, dia, hora, minuto);
  if (Number.isNaN(inicio.getTime())) return { erro: "Data ou horário inválido." };

  try {
    const agendamento = await criarAgendamento({
      nome,
      telefone,
      email: email || null,
      servicoId: servico.id,
      profissionalId: profissional.id,
      inicio,
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    return {
      sucesso: true,
      servico: servico.nome,
      profissional: profissional.nome,
      dataHora: inicio.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
      linkGerenciamento: `${siteUrl}/meus-agendamentos/${agendamento.tokenGerenciamento}`,
    };
  } catch (error) {
    return { erro: mensagemDeErroAgendamento(error) };
  }
}
