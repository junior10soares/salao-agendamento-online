"use server";

import { revalidatePath } from "next/cache";
import {
  criarProfissional,
  atualizarProfissional,
  excluirProfissional,
  definirHorariosTrabalho,
  type HorarioTrabalho,
} from "@/lib/db/supabase/profissionais";

export async function criarProfissionalAction(formData: FormData) {
  await criarProfissional(String(formData.get("nome") ?? ""));
  revalidatePath("/admin/profissionais");
}

export async function excluirProfissionalAction(id: string) {
  await excluirProfissional(id);
  revalidatePath("/admin/profissionais");
}

export async function atualizarProfissionalAction(id: string, formData: FormData) {
  await atualizarProfissional(id, {
    nome: String(formData.get("nome") ?? ""),
    bio: (formData.get("bio") as string) || null,
    ativo: formData.get("ativo") === "on",
  });

  const horarios: HorarioTrabalho[] = [];
  for (let dia = 0; dia < 7; dia++) {
    const inicio = formData.get(`dia_${dia}_inicio`);
    const fim = formData.get(`dia_${dia}_fim`);
    if (inicio && fim) {
      horarios.push({ diaSemana: dia, horaInicio: String(inicio), horaFim: String(fim) });
    }
  }
  await definirHorariosTrabalho(id, horarios);

  revalidatePath("/admin/profissionais");
}
