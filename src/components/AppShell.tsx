import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, CheckSquare, Calendar, StickyNote, BarChart3, Settings, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Hoje", icon: LayoutDashboard },
  { to: "/tasks", label: "Tarefas", icon: CheckSquare },
  { to: "/notes", label: "Notas", icon: StickyNote },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const isActive = (to: string) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 border-r bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Central PO</p>
            <p className="text-[11px] text-muted-foreground">Produtividade</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive(to)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "hover:bg-sidebar-accent",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="size-8 rounded-full" />
            ) : (
              <div className="size-8 rounded-full bg-sidebar-accent grid place-items-center text-xs font-medium">
                {user?.email?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{user?.user_metadata?.full_name ?? user?.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between border-b bg-sidebar px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <p className="text-sm font-semibold">Central PO</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="size-4" /></Button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-sidebar overflow-x-auto">
        <div className="flex min-w-max">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-4 text-[10px] flex-1 min-w-[64px]",
              isActive(to) ? "text-primary" : "text-muted-foreground",
            )}>
              <Icon className="size-5" /> {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="md:pl-60 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
