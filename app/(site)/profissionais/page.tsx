import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, StaggerGroup } from "@/components/reveal";
import { EmBreve } from "@/components/em-breve";
import { listarProfissionais } from "@/lib/db/supabase/catalogo";

export default async function ProfissionaisPage() {
  const profissionais = await listarProfissionais().catch(() => null);

  return (
    <main className="mx-auto max-w-5xl space-y-16 px-6 py-24">
      <SectionHeading
        eyebrow="Nosso time"
        title="Profissionais"
        description="Especialistas que cuidam de cada detalhe do seu atendimento."
      />

      {!profissionais || profissionais.length === 0 ? (
        <EmBreve mensagem="Time em breve." />
      ) : (
        <StaggerGroup className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {profissionais.map((profissional) => (
            <Reveal key={profissional.id}>
              <Link
                href={`/agendar?profissional=${profissional.id}`}
                className="group hover:border-gold block rounded-lg border border-transparent p-4 text-center transition-colors"
              >
                <div className="bg-muted group-hover:ring-gold mx-auto aspect-square w-40 overflow-hidden rounded-full transition-shadow group-hover:ring-2">
                  {profissional.foto_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profissional.foto_url}
                      alt={profissional.nome}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>
                <h3 className="font-heading mt-4 text-xl">{profissional.nome}</h3>
                {profissional.bio && (
                  <p className="text-muted-foreground mt-1 text-sm">{profissional.bio}</p>
                )}
                <p className="text-gold mt-3 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
                  Agendar com {profissional.nome.split(" ")[0]} →
                </p>
              </Link>
            </Reveal>
          ))}
        </StaggerGroup>
      )}
    </main>
  );
}
