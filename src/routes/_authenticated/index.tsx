import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Flame, Reply, AlertCircle, CalendarDays, Boxes, StickyNote } from "lucide-react";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import { NoteDialog } from "@/components/NoteDialog";
import { todayISO } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

type Product = { id: string; name: string; color: string | null };
type Task = any;
type Meeting = any;

function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [quickTitle, setQuickTitle] = useState("");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = todayISO();

  const load = async () => {
    const [t, p, m] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("name"),
      supabase.from("meetings")
        .select("*")
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

  const cobrarHoje = open.filter((t) => t.status === "aguardando_terceiros" && t.next_followup_date && t.next_followup_date <= today);
  const responder = open.filter((t) => t.needs_response);
  const atrasadas = open.filter((t) => t.due_date && t.due_date < today);
  const hoje = open.filter((t) => t.due_date === today);

  const porProduto = products.map((p) => {
    const list = open.filter((t) => t.product_id === p.id);
    const late = list.filter((t) => t.due_date && t.due_date < today).length;
    return { ...p, total: list.length, late };
  });

  const quickCreate = async () => {
    if (!quickTitle.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({ title: quickTitle, user_id: u.user!.id });
    if (error) toast.error(error.message);
    else { setQuickTitle(""); toast.success("Tarefa criada"); load(); }
  };

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

      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          placeholder="Criação rápida: digite o título e Enter…"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && quickCreate()}
        />
        <Button variant="outline" onClick={quickCreate} disabled={!quickTitle.trim()}>Adicionar</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section
          icon={<Flame className="size-4 text-warning-foreground" />}
          title="Cobrar hoje"
          count={cobrarHoje.length}
          tone="warning"
          empty="Nada a cobrar hoje 🎉"
        >
          {cobrarHoje.map((t) => <TaskCard key={t.id} task={t} product={productMap.get(t.product_id)} onChanged={load} />)}
        </Section>

        <Section
          icon={<Reply className="size-4 text-info" />}
          title="Responder"
          count={responder.length}
          tone="info"
          empty="Sem pendências de resposta"
        >
          {responder.map((t) => <TaskCard key={t.id} task={t} product={productMap.get(t.product_id)} onChanged={load} />)}
        </Section>

        <Section
          icon={<AlertCircle className="size-4 text-destructive" />}
          title="Atrasadas"
          count={atrasadas.length}
          tone="destructive"
          empty="Nada atrasado"
        >
          {atrasadas.map((t) => <TaskCard key={t.id} task={t} product={productMap.get(t.product_id)} onChanged={load} />)}
        </Section>

        <Section
          icon={<CalendarDays className="size-4 text-primary" />}
          title="Hoje"
          count={hoje.length + meetings.length}
          tone="primary"
          empty="Nada agendado para hoje"
        >
          {meetings.map((m) => (
            <div key={m.id} className="rounded-xl border bg-card p-3">
              <div className="text-xs text-muted-foreground">
                {new Date(m.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {m.end_at && ` – ${new Date(m.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
              </div>
              <div className="font-medium">{m.title}</div>
              {m.meeting_link && <a href={m.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Entrar na reunião</a>}
            </div>
          ))}
          {hoje.map((t) => <TaskCard key={t.id} task={t} product={productMap.get(t.product_id)} onChanged={load} />)}
        </Section>
      </div>

      {/* Visão por produto */}
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
    </div>
  );
}

function Section({
  icon, title, count, tone, empty, children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  tone: "warning" | "info" | "destructive" | "primary";
  empty: string;
  children: React.ReactNode;
}) {
  const toneRing = {
    warning: "ring-warning/30",
    info: "ring-info/30",
    destructive: "ring-destructive/30",
    primary: "ring-primary/30",
  }[tone];

  return (
    <div className={`rounded-2xl border bg-card/50 p-4 ring-1 ${toneRing}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">{icon} {title}</h3>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">
        {count === 0 ? <p className="text-sm text-muted-foreground py-2">{empty}</p> : children}
      </div>
    </div>
  );
}
