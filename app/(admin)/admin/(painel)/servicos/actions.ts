"use server";

import { revalidatePath } from "next/cache";
import {
  criarCategoria,
  excluirCategoria,
  criarServico,
  atualizarServico,
  excluirServico,
} from "@/lib/db/supabase/catalogo";

function paraNumeroOuNull(valor: FormDataEntryValue | null): number | null {
  if (!valor || valor === "") return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

export async function criarCategoriaAction(formData: FormData) {
  await criarCategoria(String(formData.get("nome") ?? ""));
  revalidatePath("/admin/servicos");
}

export async function excluirCategoriaAction(id: string) {
  await excluirCategoria(id);
  revalidatePath("/admin/servicos");
}

export async function criarServicoAction(formData: FormData) {
  await criarServico({
    categoriaId: String(formData.get("categoriaId") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    descricao: (formData.get("descricao") as string) || null,
    duracaoMinutos: Number(formData.get("duracaoMinutos") ?? 0),
    preco: paraNumeroOuNull(formData.get("preco")),
  });
  revalidatePath("/admin/servicos");
}

export async function atualizarServicoAction(id: string, formData: FormData) {
  await atualizarServico(id, {
    nome: String(formData.get("nome") ?? ""),
    descricao: (formData.get("descricao") as string) || null,
    duracaoMinutos: Number(formData.get("duracaoMinutos") ?? 0),
    preco: paraNumeroOuNull(formData.get("preco")),
    ativo: formData.get("ativo") === "on",
  });
  revalidatePath("/admin/servicos");
}

export async function excluirServicoAction(id: string) {
  await excluirServico(id);
  revalidatePath("/admin/servicos");
}
