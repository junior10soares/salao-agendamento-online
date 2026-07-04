import {
  listarCategoriasComServicos,
  listarProfissionais,
  obterConfiguracoesSalao,
} from "@/lib/db/supabase/catalogo";
import { perguntarGroq, type MensagemChat, type ChamadaFerramenta } from "@/lib/ia/groq";
import { FERRAMENTAS, consultarDisponibilidade, criarAgendamentoViaChat } from "@/lib/ia/ferramentas";
import { NOME_SALAO } from "@/components/logo";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Contexto sempre buscado na hora (catálogo é pequeno, não vale a pena cachear) — assim
// o assistente nunca inventa serviço/preço que não existe de verdade no banco.
async function montarPromptSistema(): Promise<string> {
  const [categorias, profissionais, config] = await Promise.all([
    listarCategoriasComServicos().catch(() => []),
    listarProfissionais().catch(() => []),
    obterConfiguracoesSalao().catch(() => null),
  ]);

  const servicosTexto = categorias
    .map((c) =>
      c.servicos
        .map(
          (s) =>
            `- ${s.nome} (${c.nome}): ${s.duracao_minutos}min${s.preco ? `, R$${s.preco}` : ""}`,
        )
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n");

  const profissionaisTexto = profissionais
    .map((p) => `- ${p.nome}${p.bio ? `: ${p.bio}` : ""}`)
    .join("\n");

  const horarioTexto = config?.horario_funcionamento
    ? Object.entries(config.horario_funcionamento)
        .map(([dia, h]) => `${DIAS[Number(dia)]}: ${h.abre}–${h.fecha}`)
        .join(", ")
    : "não informado";

  // Local, não toISOString() (UTC) — perto da meia-noite em -03:00 o UTC já é outro dia.
  const agora = new Date();
  const hojeIso = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

  return `Você é o assistente virtual do ${NOME_SALAO}, um salão de beleza (cabelo, unhas, estética).
Responda em português, de forma breve, calorosa e direta (2-4 frases).

Hoje é ${DIAS[agora.getDay()]}, ${hojeIso} (formato ISO). Use essa data como referência para calcular "amanhã", "sexta que vem", etc.

Serviços disponíveis:
${servicosTexto || "catálogo ainda não cadastrado"}

Profissionais:
${profissionaisTexto || "nenhum cadastrado ainda"}

Horário de funcionamento: ${horarioTexto}
Endereço: ${config?.endereco ?? "não informado"}
Telefone: ${config?.telefone ?? "não informado"}

Você TAMBÉM pode criar o agendamento de verdade durante a conversa (ferramenta
criar_agendamento) — não precisa mais mandar a pessoa pro site pra isso, só se ela
preferir.

Regras importantes:
- Só fale sobre serviços, preços, profissionais e horários que estão listados acima. Nunca invente serviço, preço ou profissional que não apareça aqui.
- Para QUALQUER pergunta sobre horário livre/ocupado, disponibilidade ou agenda de um dia, use a ferramenta consultar_disponibilidade — nunca responda isso de cabeça, você não sabe a agenda real sem consultar.
- Depois de consultar, se não houver horário nenhum livre no dia pedido, avise isso claramente e sugira tentar outro dia (a ferramenta não sugere outro dia sozinha).
- Para chamar criar_agendamento você precisa ter, coletado NESTA conversa: serviço, profissional (se o serviço tiver mais de um, pergunte qual), data, horário, nome completo e telefone. Pergunte o que faltar, um item de cada vez — não invente nada disso.
- Assim que tiver TODAS essas informações e o cliente já demonstrou que quer agendar (ex.: disse "quero agendar", ou respondeu com nome/telefone depois de você confirmar o horário), chame criar_agendamento diretamente na mesma resposta. Não pergunte "posso confirmar?" de novo depois de já ter perguntado uma vez — isso só atrasa e confunde. Só volte a perguntar se alguma informação for ambígua ou mudar.
- Só diga que o agendamento foi confirmado se a ferramenta criar_agendamento realmente retornou sucesso. Se ela retornar erro (ex.: horário ocupado, fora do expediente), avise o erro real e ofereça consultar outro horário.
- Quando o agendamento for criado com sucesso, sempre passe pro cliente o link de gerenciamento que a ferramenta devolveu (pra ele poder ver ou cancelar depois).
- Se perguntarem algo que você não sabe, diga que não tem essa informação e sugira ver a página de Contato.
- Não responda perguntas sem relação com o salão (é um assistente só do salão).`;
}

function paraMensagemAssistente(chamadas: ChamadaFerramenta[]): MensagemChat {
  return { role: "assistant", content: null, tool_calls: chamadas };
}

export async function responderAssistente(historico: MensagemChat[]): Promise<string> {
  const prompt = await montarPromptSistema();
  let mensagens: MensagemChat[] = [{ role: "system", content: prompt }, ...historico];

  const primeira = await perguntarGroq(mensagens, FERRAMENTAS);
  if (primeira.chamadas.length === 0) {
    return primeira.conteudo ?? "Não consegui gerar uma resposta agora.";
  }

  // só um round de ferramenta — cobre o caso de uso (consultar 1+ combinações de
  // serviço/profissional/data numa pergunta) sem abrir espaço pra loop sem fim de custo.
  mensagens = [...mensagens, paraMensagemAssistente(primeira.chamadas)];
  for (const chamada of primeira.chamadas) {
    const args = JSON.parse(chamada.function.arguments);
    const resultado =
      chamada.function.name === "consultar_disponibilidade"
        ? await consultarDisponibilidade(args)
        : chamada.function.name === "criar_agendamento"
          ? await criarAgendamentoViaChat(args)
          : { erro: "ferramenta desconhecida" };
    mensagens.push({ role: "tool", tool_call_id: chamada.id, content: JSON.stringify(resultado) });
  }

  const segunda = await perguntarGroq(mensagens);
  return segunda.conteudo ?? "Não consegui gerar uma resposta agora.";
}
