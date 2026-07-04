import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/supabase/admin";
import { notificarLembrete } from "@/lib/notificacoes";

type AgendamentoLembreteRow = {
  id: string;
  inicio: string;
  token_gerenciamento: string;
  salao_servicos: { nome: string };
  salao_profissionais: { nome: string };
  salao_clientes: { nome: string; email: string | null };
  salao_notificacoes_enviadas: { tipo: string }[];
};

// Vercel Cron (ver vercel.json) — 1x/dia. Protegido por CRON_SECRET pra não virar
// endpoint público de disparo de mensagens. Idempotente: só processa agendamentos que
// ainda não têm registro de lembrete em salao_notificacoes_enviadas (não confia só no
// upsert dentro de notificarLembrete, filtra aqui antes de tentar enviar de novo).
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const fimAmanha = new Date(amanha);
  fimAmanha.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("salao_agendamentos")
    .select(
      "id, inicio, token_gerenciamento, salao_servicos(nome), salao_profissionais(nome), salao_clientes(nome, email), salao_notificacoes_enviadas(tipo)",
    )
    .eq("status", "confirmado")
    .gte("inicio", amanha.toISOString())
    .lte("inicio", fimAmanha.toISOString())
    .overrideTypes<AgendamentoLembreteRow[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pendentes = data.filter(
    (a) => !a.salao_notificacoes_enviadas.some((n) => n.tipo === "lembrete"),
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  await Promise.allSettled(
    pendentes.map((a) =>
      notificarLembrete({
        agendamentoId: a.id,
        clienteNome: a.salao_clientes.nome,
        clienteEmail: a.salao_clientes.email,
        servicoNome: a.salao_servicos.nome,
        profissionalNome: a.salao_profissionais.nome,
        inicio: new Date(a.inicio),
        linkGerenciamento: `${siteUrl}/meus-agendamentos/${a.token_gerenciamento}`,
      }),
    ),
  );

  return NextResponse.json({ processados: pendentes.length });
}
