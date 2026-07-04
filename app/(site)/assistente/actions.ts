"use server";

import { z } from "zod";
import { responderAssistente } from "@/lib/ia/assistente";
import type { MensagemChat } from "@/lib/ia/groq";

const historicoSchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(500),
    }),
  )
  // limita o contexto enviado ao modelo — controla custo/latência e o usuário não
  // precisa de um histórico infinito num tira-dúvidas
  .max(10);

export type PerguntarAssistenteState =
  | { status: "sucesso"; resposta: string }
  | { status: "erro"; mensagem: string };

export async function perguntarAssistenteAction(
  historico: MensagemChat[],
): Promise<PerguntarAssistenteState> {
  const parsed = historicoSchema.safeParse(historico);
  if (!parsed.success) {
    return { status: "erro", mensagem: "Mensagem inválida." };
  }

  try {
    const resposta = await responderAssistente(parsed.data);
    return { status: "sucesso", resposta };
  } catch (erro) {
    console.error("[assistente] falhou:", erro);
    // Nunca deixa o erro (cota do Groq, chave ausente, etc.) virar uma tela quebrada —
    // mesmo princípio do e-mail: falha aqui é só um degrade, não derruba nada.
    return {
      status: "erro",
      mensagem:
        "Não consegui responder agora. Você pode ver tudo na página de Contato ou tentar de novo em instantes.",
    };
  }
}
