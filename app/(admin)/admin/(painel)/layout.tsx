import { AdminSidebar } from "@/components/admin-sidebar";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
