"use server";

import { revalidatePath } from "next/cache";
import { cancelarAgendamentoPorToken } from "@/lib/db/supabase/agendamentos";

export async function cancelarAgendamentoAction(token: string): Promise<{ erro?: string }> {
  try {
    await cancelarAgendamentoPorToken(token);
    revalidatePath(`/meus-agendamentos/${token}`);
    return {};
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Não foi possível cancelar.";
    return { erro: mensagem };
  }
}
