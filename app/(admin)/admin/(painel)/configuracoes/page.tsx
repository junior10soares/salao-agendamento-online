import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obterConfiguracoesSalaoAdmin } from "@/lib/db/supabase/configuracoes";
import { atualizarConfiguracoesAction } from "./actions";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function AdminConfiguracoesPage() {
  const config = await obterConfiguracoesSalaoAdmin().catch(() => null);

  if (!config) {
    return (
      <p className="text-muted-foreground text-sm">
        Não foi possível carregar as configurações — verifique a conexão com o Supabase.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-heading text-2xl">Configurações do salão</h1>

      <form action={atualizarConfiguracoesAction} className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="nomeSalao">Nome do salão</Label>
            <Input id="nomeSalao" name="nomeSalao" defaultValue={config.nomeSalao} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={config.telefone ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" name="instagram" defaultValue={config.instagram ?? ""} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" name="endereco" defaultValue={config.endereco ?? ""} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Horário de funcionamento</Label>
          <p className="text-muted-foreground text-xs">Em branco = fechado nesse dia.</p>
          <div className="grid gap-2">
            {DIAS.map((nomeDia, dia) => {
              const horario = config.horarioFuncionamento[String(dia)];
              return (
                <div key={dia} className="grid grid-cols-3 items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{nomeDia}</span>
                  <Input type="time" name={`dia_${dia}_abre`} defaultValue={horario?.abre ?? ""} />
                  <Input type="time" name={`dia_${dia}_fecha`} defaultValue={horario?.fecha ?? ""} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="feriados">Feriados / dias fechados (um por linha, AAAA-MM-DD)</Label>
          <textarea
            id="feriados"
            name="feriados"
            rows={4}
            defaultValue={config.feriados.join("\n")}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="antecedenciaMinimaMinutos">Antecedência mínima (min)</Label>
            <Input
              id="antecedenciaMinimaMinutos"
              name="antecedenciaMinimaMinutos"
              type="number"
              defaultValue={config.antecedenciaMinimaMinutos}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="antecedenciaMaximaDias">Antecedência máxima (dias)</Label>
            <Input
              id="antecedenciaMaximaDias"
              name="antecedenciaMaximaDias"
              type="number"
              defaultValue={config.antecedenciaMaximaDias}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="antecedenciaCancelamentoHoras">Prazo p/ cancelar (horas)</Label>
            <Input
              id="antecedenciaCancelamentoHoras"
              name="antecedenciaCancelamentoHoras"
              type="number"
              defaultValue={config.antecedenciaCancelamentoHoras}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bufferPadraoMinutos">Buffer entre atendimentos (min)</Label>
            <Input
              id="bufferPadraoMinutos"
              name="bufferPadraoMinutos"
              type="number"
              defaultValue={config.bufferPadraoMinutos}
            />
          </div>
        </div>

        <Button type="submit">Salvar configurações</Button>
      </form>
    </div>
  );
}
