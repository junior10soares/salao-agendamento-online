"use server";

import { z } from "zod";
import { listarProfissionaisPorServico } from "@/lib/db/supabase/catalogo";
import {
  buscarSlotsDisponiveis,
  criarAgendamento,
  mensagemDeErroAgendamento,
} from "@/lib/db/supabase/agendamentos";

export async function buscarProfissionaisAction(servicoId: string) {
  return listarProfissionaisPorServico(servicoId);
}

export async function buscarSlotsAction(profissionalId: string, servicoId: string, dataIso: string) {
  const slots = await buscarSlotsDisponiveis(profissionalId, servicoId, new Date(dataIso));
  return slots.map((s) => ({ inicio: s.inicio.toISOString(), disponivel: s.disponivel }));
}

const criarAgendamentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo"),
  telefone: z.string().trim().min(8, "Informe um telefone válido"),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido")]),
  servicoId: z.string().uuid(),
  profissionalId: z.string().uuid(),
  inicioIso: z.string().datetime(),
});

export type CriarAgendamentoState =
  | { status: "idle" }
  | { status: "erro"; mensagem: string }
  | { status: "sucesso"; token: string };

export async function criarAgendamentoAction(
  input: z.infer<typeof criarAgendamentoSchema>,
): Promise<CriarAgendamentoState> {
  const parsed = criarAgendamentoSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "erro", mensagem: parsed.error.issues[0].message };
  }

  try {
    const agendamento = await criarAgendamento({
      nome: parsed.data.nome,
      telefone: parsed.data.telefone,
      email: parsed.data.email || null,
      servicoId: parsed.data.servicoId,
      profissionalId: parsed.data.profissionalId,
      inicio: new Date(parsed.data.inicioIso),
    });
    return { status: "sucesso", token: agendamento.tokenGerenciamento };
  } catch (error) {
    return { status: "erro", mensagem: mensagemDeErroAgendamento(error) };
  }
}
