import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DashboardCardId =
  | "cobrar_hoje"
  | "responder"
  | "atrasadas"
  | "hoje"
  | "minhas_tarefas"
  | "agenda";

export interface CardConfig {
  id: DashboardCardId;
  visible: boolean;
  collapsed: boolean;
}

export const DEFAULT_LAYOUT: CardConfig[] = [
  { id: "cobrar_hoje", visible: true, collapsed: false },
  { id: "responder", visible: true, collapsed: false },
  { id: "atrasadas", visible: true, collapsed: false },
  { id: "hoje", visible: true, collapsed: false },
  { id: "minhas_tarefas", visible: true, collapsed: false },
  { id: "agenda", visible: true, collapsed: false },
];

function merge(saved: CardConfig[] | null | undefined): CardConfig[] {
  const map = new Map((saved ?? []).map((c) => [c.id, c]));
  const ordered: CardConfig[] = [];
  // Preserve saved order first
  (saved ?? []).forEach((c) => {
    if (DEFAULT_LAYOUT.find((d) => d.id === c.id)) ordered.push({ ...c });
  });
  // Append any new defaults
  DEFAULT_LAYOUT.forEach((d) => {
    if (!map.has(d.id)) ordered.push(d);
  });
  return ordered;
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState<CardConfig[]>(DEFAULT_LAYOUT);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoaded(true); return; }
      const { data } = await supabase
        .from("user_preferences")
        .select("dashboard_layout")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setLayout(merge((data?.dashboard_layout as any) ?? null));
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback((next: CardConfig[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase
        .from("user_preferences")
        .upsert({ user_id: u.user.id, dashboard_layout: next as any }, { onConflict: "user_id" });
    }, 500);
  }, []);

  const update = useCallback((next: CardConfig[]) => {
    setLayout(next);
    persist(next);
  }, [persist]);

  const reorder = useCallback((fromId: string, toId: string) => {
    setLayout((curr) => {
      const from = curr.findIndex((c) => c.id === fromId);
      const to = curr.findIndex((c) => c.id === toId);
      if (from < 0 || to < 0) return curr;
      const next = [...curr];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      persist(next);
      return next;
    });
  }, [persist]);

  const toggleCollapsed = useCallback((id: DashboardCardId) => {
    setLayout((curr) => {
      const next = curr.map((c) => (c.id === id ? { ...c, collapsed: !c.collapsed } : c));
      persist(next);
      return next;
    });
  }, [persist]);

  const setVisible = useCallback((id: DashboardCardId, visible: boolean) => {
    setLayout((curr) => {
      const next = curr.map((c) => (c.id === id ? { ...c, visible } : c));
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    update(DEFAULT_LAYOUT);
  }, [update]);

  return { layout, loaded, reorder, toggleCollapsed, setVisible, reset };
}
