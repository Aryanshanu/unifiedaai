import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  showFooter?: boolean;
}

export function MainLayout({ children, title, subtitle, headerActions, showFooter = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <div className="pl-64 transition-all duration-300 flex flex-col flex-1">
        <Header title={title} subtitle={subtitle} headerActions={headerActions} />
        <main className="p-6 grid-bg flex-1">
          {children}
        </main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
