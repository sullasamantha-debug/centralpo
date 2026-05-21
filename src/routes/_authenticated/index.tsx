import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Flame, Reply, AlertCircle, CalendarDays, Boxes, StickyNote, ListTodo, Calendar, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import { NoteDialog } from "@/components/NoteDialog";
import { SortableTaskList } from "@/components/SortableTaskList";
import { DashboardCard } from "@/components/DashboardCard";
import { useDashboardLayout, DashboardCardId } from "@/hooks/useDashboardLayout";
import { todayISO } from "@/lib/constants";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

const PRIORITY_RANK: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
type AllFilter = "todas" | "minhas" | "terceiros";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

type Product = { id: string; name: string; color: string | null };
type Task = any;
type Meeting = any;

function sortTasks(list: Task[]) {
  return [...list].sort((a, b) => {
    const sa = a.sort_order;
    const sb = b.sort_order;
    if (sa != null && sb != null) return sa - sb;
    if (sa != null) return -1;
    if (sb != null) return 1;
    const pa = PRIORITY_RANK[a.priority] ?? 9;
    const pb = PRIORITY_RANK[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const da = a.due_date ?? "9999-99-99";
    const db = b.due_date ?? "9999-99-99";
    if (da !== db) return da.localeCompare(db);
    const fa = a.next_followup_date ?? "9999-99-99";
    const fb = b.next_followup_date ?? "9999-99-99";
    return fa.localeCompare(fb);
  });
}

function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [quickTitle, setQuickTitle] = useState("");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allFilter, setAllFilter] = useState<AllFilter>("todas");
  const [showDone, setShowDone] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { layout, reorder, toggleCollapsed, setVisible, reset } = useDashboardLayout();

  const today = todayISO();

  const load = async () => {
    const [t, p, m] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("name"),
      supabase.from("meetings")
        .select("*")
        .is("completed_at", null)
        .gte("start_at", today + "T00:00:00")
        .lt("start_at", today + "T23:59:59")
        .order("start_at"),
    ]);
    setTasks(t.data ?? []);
    setProducts(p.data ?? []);
    setMeetings(m.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const open = tasks.filter((t) => t.status !== "concluido");

  const cobrarHoje = sortTasks(open.filter((t) => t.status === "aguardando_terceiros" && t.next_followup_date && t.next_followup_date <= today));
  const responder = sortTasks(open.filter((t) => t.needs_response));
  const atrasadas = sortTasks(open.filter((t) => t.due_date && t.due_date < today));
  const hoje = sortTasks(open.filter((t) => t.due_date === today));

  const porProduto = products.map((p) => {
    const list = open.filter((t) => t.product_id === p.id);
    const late = list.filter((t) => t.due_date && t.due_date < today).length;
    return { ...p, total: list.length, late };
  });

  const allTasksBase = (showDone ? tasks : open).filter((t) => {
    if (allFilter === "minhas") return t.kind === "minha" || t.kind === "ambos";
    if (allFilter === "terceiros") return t.status === "aguardando_terceiros";
    return true;
  });
  const allTasksSorted = sortTasks(allTasksBase);
  const allTasksVisible = showAll ? allTasksSorted : allTasksSorted.slice(0, 5);

  const quickCreate = async () => {
    if (!quickTitle.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({ title: quickTitle, user_id: u.user!.id });
    if (error) toast.error(error.message);
    else { setQuickTitle(""); toast.success("Tarefa criada"); load(); }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleLayoutDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorder(String(active.id), String(over.id));
  };

  const visibleLayout = layout.filter((c) => c.visible);
  const hiddenLayout = layout.filter((c) => !c.visible);

  const renderTaskList = (list: Task[], empty: string) => (
    list.length === 0
      ? <p className="text-sm text-muted-foreground py-2">{empty}</p>
      : <SortableTaskList
          tasks={list}
          renderTask={(t) => <TaskCard task={t} product={productMap.get(t.product_id)} onChanged={load} />}
          onReordered={load}
        />
  );

  const renderCard = (id: DashboardCardId, collapsed: boolean) => {
    const common = { collapsed, onToggleCollapsed: () => toggleCollapsed(id), onHide: () => setVisible(id, false) };
    switch (id) {
      case "cobrar_hoje":
        return (
          <DashboardCard id={id} {...common}
            title={<><Flame className="size-4 text-warning-foreground" /> Cobrar hoje</>}
            count={cobrarHoje.length} tone="warning"
          >
            {renderTaskList(cobrarHoje, "Nada a cobrar hoje 🎉")}
          </DashboardCard>
        );
      case "responder":
        return (
          <DashboardCard id={id} {...common}
            title={<><Reply className="size-4 text-info" /> Responder</>}
            count={responder.length} tone="info"
          >
            {renderTaskList(responder, "Sem pendências de resposta")}
          </DashboardCard>
        );
      case "atrasadas":
        return (
          <DashboardCard id={id} {...common}
            title={<><AlertCircle className="size-4 text-destructive" /> Atrasadas</>}
            count={atrasadas.length} tone="destructive"
          >
            {renderTaskList(atrasadas, "Nada atrasado")}
          </DashboardCard>
        );
      case "hoje":
        return (
          <DashboardCard id={id} {...common}
            title={<><CalendarDays className="size-4 text-primary" /> Hoje</>}
            count={hoje.length} tone="primary"
          >
            {renderTaskList(hoje, "Nada agendado para hoje")}
          </DashboardCard>
        );
      case "agenda":
        return (
          <DashboardCard id={id} {...common}
            title={<><Calendar className="size-4 text-primary" /> Agenda</>}
            count={meetings.length} tone="primary"
          >
            {meetings.length === 0
              ? <p className="text-sm text-muted-foreground py-2">Sem compromissos hoje</p>
              : meetings.map((m) => (
                <div key={m.id} className="rounded-xl border bg-card p-3">
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {m.end_at && ` – ${new Date(m.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                  </div>
                  <div className="font-medium">{m.title}</div>
                  {m.meeting_link && <a href={m.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Entrar na reunião</a>}
                </div>
              ))
            }
          </DashboardCard>
        );
      case "minhas_tarefas":
        return (
          <DashboardCard id={id} {...common}
            title={<><ListTodo className="size-4" /> Minhas tarefas</>}
            count={allTasksSorted.length} tone="neutral"
            className="lg:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {(["todas","minhas","terceiros"] as AllFilter[]).map((f) => (
                <Button key={f} size="sm" variant={allFilter === f ? "default" : "outline"} onClick={() => setAllFilter(f)} className="h-7 text-xs">
                  {f === "todas" ? "Todas" : f === "minhas" ? "Minhas" : "Aguardando terceiros"}
                </Button>
              ))}
              <Button size="sm" variant={showDone ? "default" : "outline"} onClick={() => setShowDone((v) => !v)} className="h-7 text-xs">
                {showDone ? "Ocultar concluídas" : "Mostrar concluídas"}
              </Button>
            </div>
            {allTasksVisible.length === 0
              ? <p className="text-sm text-muted-foreground py-2">Nenhuma tarefa.</p>
              : <SortableTaskList
                  tasks={allTasksVisible}
                  renderTask={(t) => <TaskCard task={t} product={productMap.get(t.product_id)} onChanged={load} />}
                  onReordered={load}
                />
            }
            {allTasksSorted.length > 5 && (
              <div className="flex justify-between items-center mt-3">
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Mostrar menos" : `Ver todas (${allTasksSorted.length})`}
                </Button>
                <Link to="/tasks" className="text-xs text-primary hover:underline">Ir para Tarefas →</Link>
              </div>
            )}
          </DashboardCard>
        );
    }
  };

  const visibleIds = useMemo(() => visibleLayout.map((c) => c.id), [visibleLayout]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hoje</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNoteOpen(true)}><StickyNote className="size-4" /> Nota</Button>
          <Button onClick={() => setDlgOpen(true)}><Plus className="size-4" /> Nova tarefa</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Criação rápida: digite o título e Enter…"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickCreate()}
        />
        <Button variant="outline" onClick={quickCreate} disabled={!quickTitle.trim()}>Adicionar</Button>
      </div>

      {hiddenLayout.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/30 p-3">
          <span className="text-xs text-muted-foreground">Cards ocultos:</span>
          {hiddenLayout.map((c) => (
            <Button key={c.id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVisible(c.id, true)}>
              + {labelFor(c.id)}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={reset}>
            <RotateCcw className="size-3" /> Restaurar padrão
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLayoutDragEnd}>
        <SortableContext items={visibleIds} strategy={rectSortingStrategy}>
          <div className="grid lg:grid-cols-2 gap-4 auto-rows-min">
            {visibleLayout.map((c) => <Fragment key={c.id}>{renderCard(c.id, c.collapsed)}</Fragment>)}
          </div>
        </SortableContext>
      </DndContext>

      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Boxes className="size-4" /> Visão por produto
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {porProduto.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="size-2.5 rounded-full" style={{ background: p.color ?? "#999" }} />
                <p className="text-sm font-medium truncate">{p.name}</p>
              </div>
              <p className="text-2xl font-semibold">{p.total}</p>
              <p className="text-xs text-muted-foreground">
                {p.late > 0 ? <span className="text-destructive font-medium">{p.late} atrasadas</span> : "em dia"}
              </p>
            </div>
          ))}
          {porProduto.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground col-span-full">Nenhum produto cadastrado ainda.</p>
          )}
        </div>
      </div>

      <TaskDialog open={dlgOpen} onOpenChange={setDlgOpen} onSaved={load} />
      <NoteDialog open={noteOpen} onOpenChange={setNoteOpen} />
    </div>
  );
}

function labelFor(id: DashboardCardId) {
  switch (id) {
    case "cobrar_hoje": return "Cobrar hoje";
    case "responder": return "Responder";
    case "atrasadas": return "Atrasadas";
    case "hoje": return "Hoje";
    case "minhas_tarefas": return "Minhas tarefas";
    case "agenda": return "Agenda";
  }
}
