import { Resend } from "resend";
import { NOME_SALAO } from "@/components/logo";

let cliente: Resend | null = null;

function obterCliente(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("Resend não configurado (RESEND_API_KEY)");
  cliente ??= new Resend(process.env.RESEND_API_KEY);
  return cliente;
}

type EnviarEmailInput = { para: string; assunto: string; html: string };

export async function enviarEmail({ para, assunto, html }: EnviarEmailInput): Promise<void> {
  // TODO: trocar pelo domínio verificado no Resend antes de ir para produção.
  const { error } = await obterCliente().emails.send({
    from: `${NOME_SALAO} <agendamentos@resend.dev>`,
    to: para,
    subject: assunto,
    html,
  });
  if (error) throw error;
}
