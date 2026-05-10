import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import { STATUS_OPTIONS, todayISO } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [t, p] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("name"),
    ]);
    setTasks(t.data ?? []); setProducts(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const productMap = new Map(products.map((p) => [p.id, p]));

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (productFilter !== "all" && t.product_id !== productFilter) return false;
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [tasks, productFilter, q]);

  const groups = {
    all: filtered,
    open: filtered.filter((t) => t.status !== "concluido"),
    overdue: filtered.filter((t) => t.status !== "concluido" && t.due_date && t.due_date < todayISO()),
    done: filtered.filter((t) => t.status === "concluido"),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
        <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Nova tarefa</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Abertas ({groups.open.length})</TabsTrigger>
          <TabsTrigger value="overdue">Atrasadas ({groups.overdue.length})</TabsTrigger>
          <TabsTrigger value="done">Concluídas ({groups.done.length})</TabsTrigger>
          <TabsTrigger value="all">Todas ({groups.all.length})</TabsTrigger>
        </TabsList>
        {(["open","overdue","done","all"] as const).map((k) => (
          <TabsContent key={k} value={k} className="space-y-2 mt-3">
            {groups[k].length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nada por aqui.</p>
            ) : groups[k].map((t) => (
              <TaskCard key={t.id} task={t} product={productMap.get(t.product_id)} onChanged={load} />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <TaskDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}

void STATUS_OPTIONS;
