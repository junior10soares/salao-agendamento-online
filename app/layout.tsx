import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { NOME_SALAO } from "@/components/logo";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${NOME_SALAO} | Agendamento Online`,
  description: "Agendamento online de cabelo, unhas e estética.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfairDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo"
          className="bg-primary text-primary-foreground focus:not-sr-only sr-only fixed top-2 left-2 z-50 rounded-md px-4 py-2 text-sm"
        >
          Pular para o conteúdo
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
