"use server";

import { revalidatePath } from "next/cache";
import { criarAgendamento, atualizarStatusAgendamento } from "@/lib/db/supabase/agendamentos";
import type { AgendamentoDetalhes } from "@/lib/db/supabase/agendamentos";

export async function mudarStatusAction(id: string, status: AgendamentoDetalhes["status"]) {
  await atualizarStatusAgendamento(id, status);
  revalidatePath("/admin/agenda");
}

export async function criarAgendamentoManualAction(formData: FormData) {
  await criarAgendamento({
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: null,
    servicoId: String(formData.get("servicoId") ?? ""),
    profissionalId: String(formData.get("profissionalId") ?? ""),
    inicio: new Date(String(formData.get("inicio") ?? "")),
  });
  revalidatePath("/admin/agenda");
}
