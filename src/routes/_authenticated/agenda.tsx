import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Users, Trash2, ListPlus, Repeat, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { TaskDialog } from "@/components/TaskDialog";
import { NotesPanel } from "@/components/NotesPanel";
import { generateOccurrences, WEEKDAYS_PT, type RecurrenceConfig } from "@/lib/recurrence";

const SERIES_HORIZON_DAYS = 90;
const SERIES_MAX_OCCURRENCES = 365;

type MeetingRecord = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  participants: string | null;
  meeting_link: string | null;
  objective: string | null;
  context: string | null;
  decisions: string | null;
  pendings: string | null;
  next_steps: string | null;
  recurrence: RecurrenceConfig["recurrence"];
  recurrence_interval: number | null;
  recurrence_days: string[] | null;
  recurrence_monthly_mode: string | null;
  recurrence_end_type: string | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  parent_meeting_id: string | null;
  user_id: string;
};

type SeriesEditScope = "single" | "future" | "all";
type SeriesDeleteScope = "single" | "future" | "all";

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getSeriesRootId(meeting: MeetingRecord | null | undefined) {
  if (!meeting) return null;
  return meeting.parent_meeting_id ?? meeting.id;
}

function getSeriesConfig(source: Partial<MeetingRecord> | Record<string, any>): RecurrenceConfig {
  return {
    recurrence: (source.recurrence as RecurrenceConfig["recurrence"]) ?? null,
    recurrence_interval: source.recurrence_interval ?? 1,
    recurrence_days: source.recurrence_days ?? null,
    recurrence_monthly_mode: source.recurrence_monthly_mode ?? null,
    recurrence_end_type: source.recurrence_end_type ?? null,
    recurrence_end_date: source.recurrence_end_date ?? null,
    recurrence_count: source.recurrence_count ?? null,
  };
}

function getOccurrenceRows(params: {
  source: MeetingRecord;
  rootId: string;
  overrides?: Partial<MeetingRecord>;
  startFrom?: Date;
}) {
  const start = new Date(params.overrides?.start_at ?? params.source.start_at);
  const end = params.overrides?.end_at === null
    ? null
    : new Date(params.overrides?.end_at ?? params.source.end_at ?? "");
  const durationMs = end && !Number.isNaN(end.getTime()) ? end.getTime() - start.getTime() : 0;
  const cfg = getSeriesConfig({ ...params.source, ...params.overrides });
  const occurrences = generateOccurrences(start, cfg, {
    until: addDays(start, SERIES_HORIZON_DAYS),
    maxOccurrences: SERIES_MAX_OCCURRENCES,
  });
  const filtered = params.startFrom
    ? occurrences.filter((occ) => occ.getTime() >= params.startFrom!.getTime())
    : occurrences;

  return filtered.map((date) => ({
    title: params.overrides?.title ?? params.source.title,
    start_at: date.toISOString(),
    end_at: durationMs ? new Date(date.getTime() + durationMs).toISOString() : null,
    participants: params.overrides?.participants ?? params.source.participants,
    meeting_link: params.overrides?.meeting_link ?? params.source.meeting_link,
    objective: params.overrides?.objective ?? params.source.objective,
    context: params.overrides?.context ?? params.source.context,
    decisions: params.overrides?.decisions ?? params.source.decisions,
    pendings: params.overrides?.pendings ?? params.source.pendings,
    next_steps: params.overrides?.next_steps ?? params.source.next_steps,
    recurrence: null,
    recurrence_interval: null,
    recurrence_days: null,
    recurrence_monthly_mode: null,
    recurrence_end_type: null,
    recurrence_end_date: null,
    recurrence_count: null,
    parent_meeting_id: params.rootId,
    user_id: params.source.user_id,
  }));
}

async function getSeriesMeetings(rootId: string) {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .or(`id.eq.${rootId},parent_meeting_id.eq.${rootId}`)
    .order("start_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MeetingRecord[];
}

async function deleteMeetingLinks(meetingIds: string[]) {
  if (meetingIds.length === 0) return;
  const { error } = await supabase.from("meeting_tasks").delete().in("meeting_id", meetingIds);
  if (error) throw error;
}

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
        recurrence: meeting.recurrence ?? "",
        recurrence_interval: meeting.recurrence_interval ?? 1,
        recurrence_days: meeting.recurrence_days ?? [],
        recurrence_monthly_mode: meeting.recurrence_monthly_mode ?? "day_of_month",
        recurrence_end_type: meeting.recurrence_end_type ?? "never",
        recurrence_end_date: meeting.recurrence_end_date ?? "",
        recurrence_count: meeting.recurrence_count ?? 10,
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
        recurrence: "",
        recurrence_interval: 1,
        recurrence_days: [],
        recurrence_monthly_mode: "day_of_month",
        recurrence_end_type: "never",
        recurrence_end_date: "",
        recurrence_count: 10,
      });
    }
  }, [open, meeting]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title?.trim() || !form.start_at) { toast.error("Título e início são obrigatórios"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const startDate = new Date(form.start_at);
    const endDate = form.end_at ? new Date(form.end_at) : null;
    const durationMs = endDate ? endDate.getTime() - startDate.getTime() : 0;
    const hasRec = !!form.recurrence;
    const payload: any = {
      title: form.title,
      participants: form.participants,
      meeting_link: form.meeting_link,
      objective: form.objective,
      context: form.context,
      decisions: form.decisions,
      pendings: form.pendings,
      next_steps: form.next_steps,
      recurrence: form.recurrence || null,
      recurrence_interval: hasRec ? Number(form.recurrence_interval) || 1 : null,
      recurrence_days: hasRec && form.recurrence === "semanal" ? form.recurrence_days : null,
      recurrence_monthly_mode: hasRec && form.recurrence === "mensal" ? form.recurrence_monthly_mode : null,
      recurrence_end_type: hasRec ? form.recurrence_end_type : null,
      recurrence_end_date: hasRec && form.recurrence_end_type === "date" ? form.recurrence_end_date : null,
      recurrence_count: hasRec && form.recurrence_end_type === "count" ? Number(form.recurrence_count) || 1 : null,
      start_at: startDate.toISOString(),
      end_at: endDate ? endDate.toISOString() : null,
      user_id: u.user!.id,
    };
    let error;
    let parentId: string | null = meeting?.id ?? null;
    if (meeting?.id) {
      ({ error } = await supabase.from("meetings").update(payload).eq("id", meeting.id));
    } else {
      const { data: ins, error: insErr } = await supabase.from("meetings").insert(payload).select("id").single();
      error = insErr;
      parentId = ins?.id ?? null;
    }
    // Generate occurrences for new meetings only (avoid duplication on edit)
    if (!error && !meeting?.id && hasRec && parentId) {
      const cfg: RecurrenceConfig = {
        recurrence: form.recurrence,
        recurrence_interval: payload.recurrence_interval,
        recurrence_days: payload.recurrence_days,
        recurrence_monthly_mode: payload.recurrence_monthly_mode,
        recurrence_end_type: payload.recurrence_end_type,
        recurrence_end_date: payload.recurrence_end_date,
        recurrence_count: payload.recurrence_count,
      };
      const occurrences = generateOccurrences(startDate, cfg);
      if (occurrences.length > 0) {
        const rows = occurrences.map((d) => ({
          title: form.title,
          start_at: d.toISOString(),
          end_at: durationMs ? new Date(d.getTime() + durationMs).toISOString() : null,
          participants: form.participants,
          meeting_link: form.meeting_link,
          objective: form.objective,
          context: form.context,
          recurrence: null,
          parent_meeting_id: parentId,
          user_id: u.user!.id,
        }));
        const { error: occErr } = await supabase.from("meetings").insert(rows);
        if (occErr) toast.error("Falha ao gerar ocorrências: " + occErr.message);
        else toast.success(`${occurrences.length} ocorrências geradas`);
      }
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
            <div className="grid gap-2 col-span-2">
              <Label>Recorrência</Label>
              <Select value={form.recurrence || undefined} onValueChange={(v) => set("recurrence", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sem recorrência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem recorrência</SelectItem>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.recurrence && (
              <div className="col-span-2 grid gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">
                      Repetir a cada {form.recurrence === "diaria" ? "(dias)" : form.recurrence === "semanal" ? "(semanas)" : "(meses)"}
                    </Label>
                    <Input type="number" min={1} value={form.recurrence_interval ?? 1} onChange={(e) => set("recurrence_interval", e.target.value)} />
                  </div>
                </div>

                {form.recurrence === "semanal" && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Dias da semana</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS_PT.map((d) => {
                        const sel = (form.recurrence_days ?? []).includes(d.key);
                        return (
                          <Button key={d.key} type="button" size="sm" variant={sel ? "default" : "outline"}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => {
                              const cur: string[] = form.recurrence_days ?? [];
                              set("recurrence_days", sel ? cur.filter((x) => x !== d.key) : [...cur, d.key]);
                            }}>
                            {d.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.recurrence === "mensal" && (
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Padrão mensal</Label>
                    <Select value={form.recurrence_monthly_mode} onValueChange={(v) => set("recurrence_monthly_mode", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day_of_month">No mesmo dia do mês</SelectItem>
                        <SelectItem value="weekday_of_month">No mesmo dia da semana (ex: 2ª segunda)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-1.5">
                  <Label className="text-xs">Termina</Label>
                  <Select value={form.recurrence_end_type} onValueChange={(v) => set("recurrence_end_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Nunca</SelectItem>
                      <SelectItem value="date">Em uma data</SelectItem>
                      <SelectItem value="count">Após X ocorrências</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.recurrence_end_type === "date" && (
                    <Input type="date" value={form.recurrence_end_date ?? ""} onChange={(e) => set("recurrence_end_date", e.target.value)} />
                  )}
                  {form.recurrence_end_type === "count" && (
                    <Input type="number" min={1} value={form.recurrence_count ?? 1} onChange={(e) => set("recurrence_count", e.target.value)} placeholder="Número de ocorrências" />
                  )}
                </div>

                {meeting?.id && (
                  <p className="text-xs text-muted-foreground">As ocorrências futuras são geradas apenas na criação. Para alterar a série, exclua e recrie.</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-2">Notas da reunião</p>
          <div className="grid gap-2"><Label>Objetivo</Label><Textarea rows={2} value={form.objective ?? ""} onChange={(e) => set("objective", e.target.value)} placeholder="O que se espera alcançar" /></div>
          <div className="grid gap-2"><Label>Contexto</Label><Textarea rows={2} value={form.context ?? ""} onChange={(e) => set("context", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Decisões</Label><Textarea rows={2} value={form.decisions ?? ""} onChange={(e) => set("decisions", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Pendências</Label><Textarea rows={2} value={form.pendings ?? ""} onChange={(e) => set("pendings", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Próximos passos</Label><Textarea rows={2} value={form.next_steps ?? ""} onChange={(e) => set("next_steps", e.target.value)} /></div>
          {meeting?.id && <div className="pt-3 border-t"><NotesPanel meetingId={meeting.id} /></div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
