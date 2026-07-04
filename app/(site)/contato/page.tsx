import { MapPin, Phone, AtSign } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { obterConfiguracoesSalao } from "@/lib/db/supabase/catalogo";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function ContatoPage() {
  const config = await obterConfiguracoesSalao().catch(() => null);

  return (
    <main className="mx-auto max-w-3xl space-y-12 px-6 py-24">
      <SectionHeading eyebrow="Fale com a gente" title="Contato" />

      <Reveal className="grid gap-6 sm:grid-cols-2">
        {config?.endereco && (
          <div className="flex items-start gap-3">
            <MapPin className="text-gold mt-0.5 size-5 shrink-0" />
            <p className="text-muted-foreground">{config.endereco}</p>
          </div>
        )}
        {config?.telefone && (
          <div className="flex items-start gap-3">
            <Phone className="text-gold mt-0.5 size-5 shrink-0" />
            <p className="text-muted-foreground">{config.telefone}</p>
          </div>
        )}
        {config?.instagram && (
          <div className="flex items-start gap-3">
            <AtSign className="text-gold mt-0.5 size-5 shrink-0" />
            <p className="text-muted-foreground">{config.instagram}</p>
          </div>
        )}
      </Reveal>

      {config?.horario_funcionamento && Object.keys(config.horario_funcionamento).length > 0 && (
        <Reveal className="border-border bg-card rounded-lg border p-6">
          <h3 className="font-heading mb-4 text-lg">Horário de funcionamento</h3>
          <dl className="text-muted-foreground space-y-1 text-sm">
            {Object.entries(config.horario_funcionamento).map(([dia, horario]) => (
              <div key={dia} className="flex justify-between">
                <dt>{DIAS[Number(dia)]}</dt>
                <dd>
                  {horario.abre} – {horario.fecha}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      )}
    </main>
  );
}
