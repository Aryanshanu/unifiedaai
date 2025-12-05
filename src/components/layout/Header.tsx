import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models, evaluations..."
            className="w-64 pl-9 h-9 bg-secondary border-border"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="iconSm" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full" />
        </Button>

        {/* User */}
        <Button variant="ghost" size="iconSm">
          <User className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
