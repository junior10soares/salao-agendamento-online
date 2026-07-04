"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelarAgendamentoAction } from "@/app/(site)/meus-agendamentos/[token]/actions";

export function CancelarAgendamentoButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function cancelar() {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await cancelarAgendamentoAction(token);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={cancelar} disabled={pending}>
        {pending ? "Cancelando…" : "Cancelar agendamento"}
      </Button>
      {erro && <p className="text-destructive text-sm">{erro}</p>}
    </div>
  );
}
