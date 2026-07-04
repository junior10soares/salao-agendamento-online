// Groq: free tier de verdade (sem cartão de crédito) e API compatível com o formato da
// OpenAI — por isso um `fetch` direto resolve sem precisar instalar SDK nenhum. Trocar de
// provedor no futuro é só trocar a URL/modelo aqui.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = "llama-3.1-8b-instant";

export type ChamadaFerramenta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type MensagemChat =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ChamadaFerramenta[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type FerramentaGroq = {
  type: "function";
  function: { name: string; description: string; parameters: object };
};

export type RespostaGroq = { conteudo: string | null; chamadas: ChamadaFerramenta[] };

export async function perguntarGroq(
  mensagens: MensagemChat[],
  ferramentas?: FerramentaGroq[],
): Promise<RespostaGroq> {
  if (!process.env.GROQ_API_KEY) throw new Error("Groq não configurado (GROQ_API_KEY)");

  const resposta = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELO,
      messages: mensagens,
      temperature: 0.4,
      max_tokens: 400,
      ...(ferramentas && { tools: ferramentas, tool_choice: "auto" }),
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(`Groq respondeu ${resposta.status}: ${detalhe.slice(0, 200)}`);
  }

  const dados = await resposta.json();
  const msg = dados.choices?.[0]?.message;
  if (!msg) throw new Error("Resposta do Groq sem mensagem");

  return { conteudo: msg.content ?? null, chamadas: msg.tool_calls ?? [] };
}
