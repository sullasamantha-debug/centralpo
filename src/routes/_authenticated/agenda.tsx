import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Users, Trash2, ListPlus, Repeat, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { TaskDialog } from "@/components/TaskDialog";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

function AgendaPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("meetings").select("*").order("start_at", { ascending: true });
    setMeetings(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const grouped = groupByDay(meetings);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Reuniões e eventos</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Novo evento</Button>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhuma reunião cadastrada. Crie a primeira clicando em “Novo evento”.
        </div>
      )}

      {grouped.map(({ day, items }) => (
        <div key={day}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{day}</p>
          <div className="space-y-2">
            {items.map((m) => (
              <MeetingCard key={m.id} meeting={m} onEdit={() => { setEditing(m); setOpen(true); }} onChanged={load} />
            ))}
          </div>
        </div>
      ))}

      <MeetingDialog open={open} onOpenChange={setOpen} meeting={editing} onSaved={load} />
    </div>
  );
}

function groupByDay(list: any[]) {
  const map = new Map<string, any[]>();
  for (const m of list) {
    const d = new Date(m.start_at);
    const key = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function MeetingCard({ meeting, onEdit, onChanged }: { meeting: any; onEdit: () => void; onChanged: () => void }) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [linkedTasks, setLinkedTasks] = useState<any[]>([]);

  const loadLinked = async () => {
    const { data: links } = await supabase.from("meeting_tasks").select("task_id").eq("meeting_id", meeting.id);
    const ids = (links ?? []).map((l) => l.task_id);
    if (ids.length === 0) { setLinkedTasks([]); return; }
    const { data: ts } = await supabase.from("tasks").select("id,title,status").in("id", ids);
    setLinkedTasks(ts ?? []);
  };
  useEffect(() => { loadLinked(); }, [meeting.id]);

  const remove = async () => {
    if (!confirm("Excluir evento?")) return;
    const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); onChanged(); }
  };

  const onTaskSaved = async () => {
    // link the most recent task from this user to this meeting
    const { data: u } = await supabase.auth.getUser();
    const { data: latest } = await supabase
      .from("tasks").select("id").eq("user_id", u.user!.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest) {
      await supabase.from("meeting_tasks").insert({
        meeting_id: meeting.id, task_id: latest.id, user_id: u.user!.id,
      });
    }
    loadLinked();
    onChanged();
  };

  const start = new Date(meeting.start_at);
  const end = meeting.end_at ? new Date(meeting.end_at) : null;
  const recLabel = { diaria: "Diária", semanal: "Semanal", mensal: "Mensal" }[meeting.recurrence as string];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>
              {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              {end && ` – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
            {recLabel && <Badge variant="outline" className="gap-1"><Repeat className="size-3" />{recLabel}</Badge>}
          </p>
          <button onClick={onEdit} className="font-medium text-left hover:text-primary">{meeting.title}</button>
          {meeting.participants && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Users className="size-3" /> {meeting.participants}
            </p>
          )}
          {meeting.objective && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{meeting.objective}</p>}

          {linkedTasks.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Tarefas vinculadas</p>
              {linkedTasks.map((t) => (
                <div key={t.id} className="text-xs flex items-center gap-1.5">
                  <CheckSquare className="size-3 text-muted-foreground" />
                  <span className={t.status === "concluido" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {meeting.meeting_link && (
            <Button asChild size="sm" variant="outline">
              <a href={meeting.meeting_link} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Entrar</a>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setNewTaskOpen(true)}>
            <ListPlus className="size-3.5" /> Tarefa
          </Button>
          <Button size="icon" variant="ghost" onClick={remove}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      </div>

      <TaskDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        defaults={{ title: `[${meeting.title}] `, origin: "reuniao" } as any}
        onSaved={onTaskSaved}
      />
    </div>
  );
}

function MeetingDialog({ open, onOpenChange, meeting, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; meeting: any | null; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (meeting) {
      setForm({
        title: meeting.title ?? "",
        start_at: meeting.start_at ? new Date(meeting.start_at).toISOString().slice(0, 16) : "",
        end_at: meeting.end_at ? new Date(meeting.end_at).toISOString().slice(0, 16) : "",
        participants: meeting.participants ?? "",
        meeting_link: meeting.meeting_link ?? "",
        objective: meeting.objective ?? "",
        context: meeting.context ?? "",
        decisions: meeting.decisions ?? "",
        pendings: meeting.pendings ?? "",
        next_steps: meeting.next_steps ?? "",
      });
    } else {
      const now = new Date(); now.setMinutes(0, 0, 0); now.setHours(now.getHours() + 1);
      setForm({
        title: "",
        start_at: now.toISOString().slice(0, 16),
        end_at: "",
        participants: "",
        meeting_link: "",
        objective: "",
        context: "",
        decisions: "",
        pendings: "",
        next_steps: "",
      });
    }
  }, [open, meeting]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title?.trim() || !form.start_at) { toast.error("Título e início são obrigatórios"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      ...form,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      user_id: u.user!.id,
    };
    let error;
    if (meeting?.id) {
      ({ error } = await supabase.from("meetings").update(payload).eq("id", meeting.id));
    } else {
      ({ error } = await supabase.from("meetings").insert(payload));
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Salvo"); onOpenChange(false); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{meeting ? "Editar reunião" : "Nova reunião"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label>Título *</Label><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Início *</Label><Input type="datetime-local" value={form.start_at ?? ""} onChange={(e) => set("start_at", e.target.value)} /></div>
            <div className="grid gap-2"><Label>Fim</Label><Input type="datetime-local" value={form.end_at ?? ""} onChange={(e) => set("end_at", e.target.value)} /></div>
            <div className="grid gap-2 col-span-2"><Label>Participantes</Label><Input value={form.participants ?? ""} onChange={(e) => set("participants", e.target.value)} placeholder="Nome 1, Nome 2..." /></div>
            <div className="grid gap-2 col-span-2"><Label>Link da reunião</Label><Input value={form.meeting_link ?? ""} onChange={(e) => set("meeting_link", e.target.value)} placeholder="https://teams.microsoft.com/..." /></div>
          </div>
          <div className="grid gap-2"><Label>Objetivo</Label><Textarea rows={2} value={form.objective ?? ""} onChange={(e) => set("objective", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Contexto</Label><Textarea rows={2} value={form.context ?? ""} onChange={(e) => set("context", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Decisões</Label><Textarea rows={2} value={form.decisions ?? ""} onChange={(e) => set("decisions", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Pendências</Label><Textarea rows={2} value={form.pendings ?? ""} onChange={(e) => set("pendings", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Próximos passos</Label><Textarea rows={2} value={form.next_steps ?? ""} onChange={(e) => set("next_steps", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
