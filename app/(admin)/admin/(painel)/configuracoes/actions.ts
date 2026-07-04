"use server";

import { revalidatePath } from "next/cache";
import { atualizarConfiguracoesSalao } from "@/lib/db/supabase/configuracoes";

export async function atualizarConfiguracoesAction(formData: FormData) {
  const horarioFuncionamento: Record<string, { abre: string; fecha: string }> = {};
  for (let dia = 0; dia < 7; dia++) {
    const abre = formData.get(`dia_${dia}_abre`);
    const fecha = formData.get(`dia_${dia}_fecha`);
    if (abre && fecha) {
      horarioFuncionamento[dia] = { abre: String(abre), fecha: String(fecha) };
    }
  }

  const feriados = String(formData.get("feriados") ?? "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  await atualizarConfiguracoesSalao({
    nomeSalao: String(formData.get("nomeSalao") ?? ""),
    telefone: (formData.get("telefone") as string) || null,
    endereco: (formData.get("endereco") as string) || null,
    instagram: (formData.get("instagram") as string) || null,
    horarioFuncionamento,
    feriados,
    antecedenciaMinimaMinutos: Number(formData.get("antecedenciaMinimaMinutos") ?? 60),
    antecedenciaMaximaDias: Number(formData.get("antecedenciaMaximaDias") ?? 30),
    antecedenciaCancelamentoHoras: Number(formData.get("antecedenciaCancelamentoHoras") ?? 4),
    bufferPadraoMinutos: Number(formData.get("bufferPadraoMinutos") ?? 10),
  });

  revalidatePath("/admin/configuracoes");
}
