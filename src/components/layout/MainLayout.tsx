import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
}

export function MainLayout({ children, title, subtitle, headerActions }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <Header title={title} subtitle={subtitle} headerActions={headerActions} />
        <main className="p-6 grid-bg min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
