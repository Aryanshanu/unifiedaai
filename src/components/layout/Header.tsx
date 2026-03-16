import { ReactNode, useEffect, useState, useCallback, useRef } from "react";
import { Bell, Search, Settings, Sun, Moon, ArrowLeftRight } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
}

export function Header({ title, subtitle, headerActions }: HeaderProps) {
  const { persona, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleSwitchRole = async () => {
    await signOut();
    navigate('/auth');
  };

  // Optimized notification count with debounce
  const [notificationCount, setNotificationCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCounts = useCallback(async () => {
    const [{ count: incidentCount }, { count: driftCount }] = await Promise.all([
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('drift_alerts').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    setNotificationCount((incidentCount || 0) + (driftCount || 0));
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchCounts, 2000);
  }, [fetchCounts]);
  
  useEffect(() => {
    fetchCounts();
    
    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drift_alerts' }, debouncedFetch)
      .subscribe();
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchCounts, debouncedFetch]);

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {headerActions}
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models, evaluations..."
            className="w-64 pl-9 h-9 bg-secondary border-border"
          />
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2">
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center text-sm bg-gradient-to-br shadow-sm',
                persona.avatarGradient
              )}>
                <span>{persona.avatarEmoji}</span>
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-medium text-foreground">{persona.displayName}</span>
                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                  {persona.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-base bg-gradient-to-br',
                  persona.avatarGradient
                )}>
                  <span>{persona.avatarEmoji}</span>
                </div>
                <div className="flex flex-col">
                  <span>{persona.displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{persona.description}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSwitchRole}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Switch Role
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
