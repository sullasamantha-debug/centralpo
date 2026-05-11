import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, CheckSquare, Calendar } from "lucide-react";
import { NoteDialog } from "@/components/NoteDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
});

function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Map<string, any>>(new Map());
  const [meetings, setMeetings] = useState<Map<string, any>>(new Map());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    const [n, p, t, m] = await Promise.all([
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,name,color"),
      supabase.from("tasks").select("id,title"),
      supabase.from("meetings").select("id,title"),
    ]);
    setNotes(n.data ?? []);
    setProducts(p.data ?? []);
    setTasks(new Map((t.data ?? []).map((x) => [x.id, x])));
    setMeetings(new Map((m.data ?? []).map((x) => [x.id, x])));
  };
  useEffect(() => { load(); }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = notes.filter((n) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return n.title.toLowerCase().includes(s) || (n.content ?? "").toLowerCase().includes(s) || (n.tags ?? []).some((t: string) => t.toLowerCase().includes(s));
  });

  const remove = async (id: string) => {
    if (!confirm("Excluir nota?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
          <p className="text-sm text-muted-foreground">Ideias, contexto e anotações</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Nova nota</Button>
      </div>

      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por título, conteúdo ou tag…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((n) => {
          const prod = n.product_id ? productMap.get(n.product_id) : null;
          const task = n.task_id ? tasks.get(n.task_id) : null;
          const meet = n.meeting_id ? meetings.get(n.meeting_id) : null;
          return (
            <div key={n.id} className="rounded-xl border bg-card p-4 group">
              <div className="flex items-start justify-between gap-2">
                <button className="font-medium text-left hover:text-primary flex-1" onClick={() => { setEditing(n); setOpen(true); }}>{n.title}</button>
                <button onClick={() => remove(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="size-4 text-destructive" />
                </button>
              </div>
              {n.content && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{n.content}</p>}
              <div className="flex flex-wrap gap-1.5 items-center mt-2 text-xs">
                {prod && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted"><span className="size-2 rounded-full" style={{ background: prod.color ?? "#999" }} />{prod.name}</span>}
                {task && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted"><CheckSquare className="size-3" />{task.title}</span>}
                {meet && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted"><Calendar className="size-3" />{meet.title}</span>}
                {n.tags?.map((t: string) => <span key={t} className="px-1.5 py-0.5 rounded bg-muted">#{t}</span>)}
                <span className="text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            {q ? "Nenhuma nota encontrada." : <>Nenhuma nota ainda. <Link to="/notes" className="text-primary underline">Crie a primeira.</Link></>}
          </div>
        )}
      </div>

      <NoteDialog open={open} onOpenChange={setOpen} note={editing} onSaved={load} />
    </div>
  );
}
