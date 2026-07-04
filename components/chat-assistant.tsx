"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fadeInUp } from "@/lib/motion";
import { NOME_SALAO } from "@/components/logo";
import { perguntarAssistenteAction } from "@/app/(site)/assistente/actions";

type Mensagem = { role: "user" | "assistant"; content: string };

const SAUDACAO: Mensagem = {
  role: "assistant",
  content: `Oi! Posso ajudar com dúvidas sobre serviços, preços, profissionais ou horário do ${NOME_SALAO}. O que você quer saber?`,
};

export function ChatAssistant() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([SAUDACAO]);
  const [texto, setTexto] = useState("");
  const [pending, startTransition] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto]);

  function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || pending) return;

    const historico = [...mensagens, { role: "user" as const, content: conteudo }];
    setMensagens(historico);
    setTexto("");

    startTransition(async () => {
      // manda só os últimos turnos — suficiente pro modelo manter contexto da conversa
      // sem carregar um histórico enorme a cada pergunta
      const resultado = await perguntarAssistenteAction(historico.slice(-10));
      const resposta =
        resultado.status === "sucesso" ? resultado.resposta : resultado.mensagem;
      setMensagens((atual) => [...atual, { role: "assistant", content: resposta }]);
    });
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {aberto && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="border-border bg-card mb-3 flex h-[28rem] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-xl sm:w-96"
          >
            <div className="border-border bg-secondary/60 flex items-center justify-between border-b px-4 py-3">
              <p className="font-heading text-sm">Assistente do {NOME_SALAO}</p>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar assistente"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {mensagens.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <p
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </p>
                </div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
                    Digitando…
                  </p>
                </div>
              )}
              <div ref={fimRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
              className="border-border flex items-center gap-2 border-t p-3"
            >
              <Input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite sua pergunta…"
                maxLength={500}
                disabled={pending}
                aria-label="Sua pergunta"
              />
              <Button
                type="submit"
                size="icon"
                disabled={pending || !texto.trim()}
                aria-label="Enviar pergunta"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        className="size-12 rounded-full shadow-lg"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente"}
      >
        {aberto ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}
