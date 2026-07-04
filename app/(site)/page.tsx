import Link from "next/link";
import { Scissors, Sparkles, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, StaggerGroup } from "@/components/reveal";
import { NOME_SALAO } from "@/components/logo";

const destaques = [
  { titulo: "Cabelo", descricao: "Corte, coloração e tratamento.", Icone: Scissors },
  { titulo: "Unhas", descricao: "Manicure, pedicure e nail art.", Icone: Sparkles },
  { titulo: "Estética", descricao: "Limpeza de pele e bem-estar.", Icone: Gem },
];

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_20%,color-mix(in_oklch,var(--gold)_14%,transparent),transparent)]"
        />
        <Reveal className="relative space-y-6">
          <p className="text-gold text-sm font-medium tracking-[0.2em] uppercase">
            {NOME_SALAO}
          </p>
          <h1 className="font-heading max-w-3xl text-5xl leading-tight md:text-7xl">
            Beleza que se agenda em segundos
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg text-balance">
            Cabelo, unhas e estética com atendimento premium — escolha o horário que cabe
            na sua agenda, sem ligação, sem espera.
          </p>
          <Button size="lg" className="mt-2" asChild>
            <Link href="/agendar">Agendar agora</Link>
          </Button>
        </Reveal>
      </section>

      <section className="bg-secondary/40 px-6 py-24">
        <div className="mx-auto max-w-5xl space-y-12">
          <SectionHeading
            eyebrow="O que fazemos"
            title="Serviços"
            description="Um só lugar para cuidar de cabelo, unhas e pele com quem entende do assunto."
          />
          <StaggerGroup className="grid gap-6 md:grid-cols-3">
            {destaques.map((item) => (
              <Reveal
                key={item.titulo}
                className="border-border bg-card hover:border-gold rounded-lg border p-8 text-center transition-colors"
              >
                <div className="bg-gold/10 text-gold mx-auto flex size-12 items-center justify-center rounded-full">
                  <item.Icone className="size-6" aria-hidden />
                </div>
                <h3 className="font-heading mt-4 text-xl">{item.titulo}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{item.descricao}</p>
              </Reveal>
            ))}
          </StaggerGroup>
        </div>
      </section>
    </main>
  );
}
