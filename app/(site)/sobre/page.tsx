import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-10 px-6 py-24">
      <SectionHeading eyebrow="Nossa história" title="Sobre o salão" />
      <Reveal className="text-muted-foreground space-y-4 text-lg leading-relaxed">
        <p>
          {/* TODO: conteúdo real do salão — ver "Pendências" no CLAUDE.md */}
          Um espaço pensado para quem quer cuidar de cabelo, unhas e pele com atendimento
          próximo e atenção aos detalhes, do primeiro agendamento ao resultado final.
        </p>
      </Reveal>
    </main>
  );
}
