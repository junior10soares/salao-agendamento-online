import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatAssistant } from "@/components/chat-assistant";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <div id="conteudo" className="flex-1">
        {children}
      </div>
      <SiteFooter />
      <ChatAssistant />
    </div>
  );
}
