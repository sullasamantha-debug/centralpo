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
import { Plus, ExternalLink, Users, Trash2, ListPlus, Repeat, CheckSquare, Check, Eye, EyeOff } from "lucide-react";
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
  completed_at: string | null;
  occurred: boolean | null;
  user_id: string;
};

type SeriesEditScope = "single" | "future" | "all";
type SeriesDeleteScope = "single" | "future" | "all";

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateInput(date: string | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 16) : "";
}

function toDateOnlyISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPreviousDateISO(date: Date) {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  previous.setHours(0, 0, 0, 0);
  return toDateOnlyISO(previous);
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

function buildMeetingPayload(form: Record<string, any>, userId: string) {
  const startDate = new Date(form.start_at);
  const endDate = form.end_at ? new Date(form.end_at) : null;
  const hasRecurrence = Boolean(form.recurrence);

  return {
    payload: {
      title: form.title.trim(),
      participants: form.participants || null,
      meeting_link: form.meeting_link || null,
      objective: form.objective || null,
      context: form.context || null,
      decisions: form.decisions || null,
      pendings: form.pendings || null,
      next_steps: form.next_steps || null,
      recurrence: hasRecurrence ? form.recurrence : null,
      recurrence_interval: hasRecurrence ? Number(form.recurrence_interval) || 1 : null,
      recurrence_days: hasRecurrence && form.recurrence === "semanal" ? form.recurrence_days : null,
      recurrence_monthly_mode: hasRecurrence && form.recurrence === "mensal" ? form.recurrence_monthly_mode : null,
      recurrence_end_type: hasRecurrence ? form.recurrence_end_type : null,
      recurrence_end_date: hasRecurrence && form.recurrence_end_type === "date" ? form.recurrence_end_date : null,
      recurrence_count: hasRecurrence && form.recurrence_end_type === "count" ? Number(form.recurrence_count) || 1 : null,
      start_at: startDate.toISOString(),
      end_at: endDate ? endDate.toISOString() : null,
      user_id: userId,
    },
    startDate,
    endDate,
    hasRecurrence,
  };
}

function getOccurrenceRows(params: {
  source: MeetingRecord;
  rootId: string;
}) {
  const start = new Date(params.source.start_at);
  const end = params.source.end_at ? new Date(params.source.end_at) : null;
  const durationMs = end ? end.getTime() - start.getTime() : 0;
  const occurrences = generateOccurrences(start, getSeriesConfig(params.source), {
    until: addDays(start, SERIES_HORIZON_DAYS),
    maxOccurrences: SERIES_MAX_OCCURRENCES,
  });

  return occurrences.map((date) => ({
    title: params.source.title,
    start_at: date.toISOString(),
    end_at: durationMs ? new Date(date.getTime() + durationMs).toISOString() : null,
    participants: params.source.participants,
    meeting_link: params.source.meeting_link,
    objective: params.source.objective,
    context: params.source.context,
    decisions: params.source.decisions,
    pendings: params.source.pendings,
    next_steps: params.source.next_steps,
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

async function releaseMeetingReferences(meetingIds: string[]) {
  if (meetingIds.length === 0) return;

  const { error: notesError } = await supabase
    .from("notes")
    .update({ meeting_id: null })
    .in("meeting_id", meetingIds);
  if (notesError) throw notesError;

  const { error: linksError } = await supabase
    .from("meeting_tasks")
    .delete()
    .in("meeting_id", meetingIds);
  if (linksError) throw linksError;
}

async function deleteMeetings(meetingIds: string[]) {
  if (meetingIds.length === 0) return;
  await releaseMeetingReferences(meetingIds);
  const { error } = await supabase.from("meetings").delete().in("id", meetingIds);
  if (error) throw error;
}

async function reconcileSeriesChildren(rootMeeting: MeetingRecord, existingChildren: MeetingRecord[]) {
  const targetRows = getOccurrenceRows({ source: rootMeeting, rootId: rootMeeting.id });
  const sortedChildren = [...existingChildren].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );

  const reusable = sortedChildren.slice(0, targetRows.length);
  await Promise.all(
    reusable.map((child, index) =>
      supabase.from("meetings").update(targetRows[index]).eq("id", child.id),
    ),
  );

  const rowsToInsert = targetRows.slice(reusable.length);
  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("meetings").insert(rowsToInsert);
    if (insertError) throw insertError;
  }

  const rowsToDelete = sortedChildren.slice(targetRows.length);
  if (rowsToDelete.length > 0) {
    await deleteMeetings(rowsToDelete.map((row) => row.id));
  }

  return targetRows.length;
}

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

function AgendaPage() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [editing, setEditing] = useState<MeetingRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("meetings").select("*").order("start_at", { ascending: true });
    setMeetings((data ?? []) as MeetingRecord[]);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = showCompleted ? meetings : meetings.filter((m) => !m.completed_at);
  const grouped = groupByDay(visible);
  const completedCount = meetings.filter((m) => m.completed_at).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Reuniões e eventos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCompleted((v) => !v)}>
            {showCompleted ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showCompleted ? "Ocultar concluídos" : `Mostrar concluídos${completedCount ? ` (${completedCount})` : ""}`}
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> Novo evento
          </Button>
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {showCompleted
            ? "Nenhuma reunião encontrada."
            : "Nenhuma reunião pendente. Crie um evento ou exiba os concluídos."}
        </div>
      )}

      {grouped.map(({ day, items }) => (
        <div key={day}>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{day}</p>
          <div className="space-y-2">
            {items.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onEdit={() => { setEditing(meeting); setOpen(true); }}
                onChanged={load}
              />
            ))}
          </div>
        </div>
      ))}

      <MeetingDialog open={open} onOpenChange={setOpen} meeting={editing} onSaved={load} />
    </div>
  );
}

function groupByDay(list: MeetingRecord[]) {
  const map = new Map<string, MeetingRecord[]>();
  for (const meeting of list) {
    const date = new Date(meeting.start_at);
    const key = date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(meeting);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function MeetingCard({
  meeting,
  onEdit,
  onChanged,
}: {
  meeting: MeetingRecord;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [linkedTasks, setLinkedTasks] = useState<any[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<SeriesDeleteScope>("single");
  const [deleting, setDeleting] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const isCompleted = Boolean(meeting.completed_at);
  const isSeriesMember = Boolean(meeting.recurrence || meeting.parent_meeting_id);
  const isGeneratedOccurrence = Boolean(meeting.parent_meeting_id);

  const completeMeeting = async (occurred: boolean) => {
    setCompleting(true);
    try {
      const { error } = await supabase
        .from("meetings")
        .update({ completed_at: new Date().toISOString(), occurred })
        .eq("id", meeting.id);
      if (error) throw error;
      toast.success(occurred ? "Evento marcado como realizado" : "Evento marcado como não realizado");
      setCompleteOpen(false);
      onChanged();
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível concluir o evento");
    } finally {
      setCompleting(false);
    }
  };

  const reopenMeeting = async () => {
    const { error } = await supabase
      .from("meetings")
      .update({ completed_at: null, occurred: null })
      .eq("id", meeting.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Evento reaberto");
    onChanged();
  };

  useEffect(() => {
    setDeleteScope(isSeriesMember ? "single" : "all");
  }, [isSeriesMember, meeting.id]);

  const loadLinked = async () => {
    const { data: links } = await supabase.from("meeting_tasks").select("task_id").eq("meeting_id", meeting.id);
    const ids = (links ?? []).map((link) => link.task_id);
    if (ids.length === 0) {
      setLinkedTasks([]);
      return;
    }
    const { data: tasks } = await supabase.from("tasks").select("id,title,status").in("id", ids);
    setLinkedTasks(tasks ?? []);
  };

  useEffect(() => {
    loadLinked();
  }, [meeting.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (!isSeriesMember) {
        await deleteMeetings([meeting.id]);
      } else {
        const rootId = getSeriesRootId(meeting)!;
        const series = await getSeriesMeetings(rootId);
        const sortedSeries = [...series].sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        );
        const root = sortedSeries.find((item) => item.id === rootId);
        if (!root) throw new Error("Série recorrente não encontrada.");

        if (deleteScope === "all" || (deleteScope === "future" && meeting.id === rootId)) {
          await deleteMeetings(sortedSeries.map((item) => item.id));
        } else if (deleteScope === "future") {
          const cutoff = new Date(meeting.start_at).getTime();
          const futureIds = sortedSeries
            .filter((item) => item.id !== rootId && new Date(item.start_at).getTime() >= cutoff)
            .map((item) => item.id);
          await deleteMeetings(futureIds);
          await supabase
            .from("meetings")
            .update({
              recurrence_end_type: "date",
              recurrence_end_date: getPreviousDateISO(new Date(meeting.start_at)),
              recurrence_count: null,
            })
            .eq("id", rootId);
        } else if (meeting.id === rootId) {
          const children = sortedSeries.filter((item) => item.id !== rootId);
          if (children.length === 0) {
            await deleteMeetings([meeting.id]);
          } else {
            const [promoted, ...remaining] = children;
            const { error: promoteError } = await supabase
              .from("meetings")
              .update({
                parent_meeting_id: null,
                recurrence: root.recurrence,
                recurrence_interval: root.recurrence_interval,
                recurrence_days: root.recurrence_days,
                recurrence_monthly_mode: root.recurrence_monthly_mode,
                recurrence_end_type: root.recurrence_end_type,
                recurrence_end_date: root.recurrence_end_date,
                recurrence_count: root.recurrence_count,
              })
              .eq("id", promoted.id);
            if (promoteError) throw promoteError;

            if (remaining.length > 0) {
              const { error: reparentError } = await supabase
                .from("meetings")
                .update({ parent_meeting_id: promoted.id })
                .in("id", remaining.map((item) => item.id));
              if (reparentError) throw reparentError;
            }

            await deleteMeetings([meeting.id]);
          }
        } else {
          await deleteMeetings([meeting.id]);
        }
      }

      toast.success("Evento excluído");
      setDeleteOpen(false);
      onChanged();
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível excluir o evento");
    } finally {
      setDeleting(false);
    }
  };

  const onTaskSaved = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data: latest } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      await supabase.from("meeting_tasks").insert({
        meeting_id: meeting.id,
        task_id: latest.id,
        user_id: userId,
      });
    }

    loadLinked();
    onChanged();
  };

  const start = new Date(meeting.start_at);
  const end = meeting.end_at ? new Date(meeting.end_at) : null;
  const recurrenceLabel = { diaria: "Diária", semanal: "Semanal", mensal: "Mensal" }[meeting.recurrence as string];

  return (
    <>
      <div className={`rounded-xl border bg-card p-4 ${isCompleted ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {end && ` – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
              </span>
              {recurrenceLabel && (
                <Badge variant="outline" className="gap-1">
                  <Repeat className="size-3" />
                  {recurrenceLabel}
                </Badge>
              )}
              {isGeneratedOccurrence && <Badge variant="secondary">Ocorrência da série</Badge>}
              {isCompleted && (
                <Badge variant={meeting.occurred === false ? "destructive" : "default"}>
                  {meeting.occurred === false ? "Não realizado" : "Realizado"}
                </Badge>
              )}
            </div>

            <button onClick={onEdit} className="mt-1 text-left font-medium hover:text-primary">
              {meeting.title}
            </button>

            {meeting.participants && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" /> {meeting.participants}
              </p>
            )}
            {meeting.objective && (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{meeting.objective}</p>
            )}

            {linkedTasks.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Tarefas vinculadas</p>
                {linkedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-1.5 text-xs">
                    <CheckSquare className="size-3 text-muted-foreground" />
                    <span className={task.status === "concluido" ? "text-muted-foreground line-through" : ""}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1">
            {meeting.meeting_link && !isCompleted && (
              <Button asChild size="sm" variant="outline">
                <a href={meeting.meeting_link} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" /> Entrar
                </a>
              </Button>
            )}
            {!isCompleted && (
              <>
                <Button size="sm" variant="default" onClick={() => setCompleteOpen(true)} title="Concluir">
                  <Check className="size-3.5" /> Concluir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNewTaskOpen(true)}>
                  <ListPlus className="size-3.5" /> Tarefa
                </Button>
              </>
            )}
            {isCompleted && (
              <Button size="sm" variant="outline" onClick={reopenMeeting}>
                Reabrir
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>

        <TaskDialog
          open={newTaskOpen}
          onOpenChange={setNewTaskOpen}
          defaults={{ title: `[${meeting.title}] `, origin: "reuniao" } as any}
          onSaved={onTaskSaved}
        />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir evento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {isSeriesMember ? (
              <div className="grid gap-3">
                <Label>O que deseja excluir?</Label>
                <RadioGroup value={deleteScope} onValueChange={(value) => setDeleteScope(value as SeriesDeleteScope)}>
                  <label className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="single" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Apenas este evento</p>
                      <p className="text-xs text-muted-foreground">Mantém o restante da série.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="future" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Este e os próximos</p>
                      <p className="text-xs text-muted-foreground">Exclui a partir desta ocorrência.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="all" className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">Toda a série</p>
                      <p className="text-xs text-muted-foreground">Remove o evento original e todas as ocorrências.</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Este evento será removido definitivamente.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MeetingDialog({
  open,
  onOpenChange,
  meeting,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  meeting: MeetingRecord | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [editScope, setEditScope] = useState<SeriesEditScope>("single");
  const [seriesRoot, setSeriesRoot] = useState<MeetingRecord | null>(null);

  const isSeriesMember = Boolean(meeting?.recurrence || meeting?.parent_meeting_id);
  const recurrenceLocked = isSeriesMember && editScope === "single";

  useEffect(() => {
    if (!open) return;

    let active = true;

    const prepareForm = async () => {
      let rootRecord: MeetingRecord | null = meeting;

      if (meeting?.parent_meeting_id) {
        const { data, error } = await supabase
          .from("meetings")
          .select("*")
          .eq("id", meeting.parent_meeting_id)
          .single();

        if (error) {
          toast.error(error.message);
          return;
        }

        rootRecord = data as MeetingRecord;
      }

      if (!active) return;

      setSeriesRoot(rootRecord ?? null);
      setEditScope(meeting?.recurrence || meeting?.parent_meeting_id ? "single" : "single");

      if (meeting) {
        setForm({
          title: meeting.title ?? "",
          start_at: toDateInput(meeting.start_at),
          end_at: toDateInput(meeting.end_at),
          participants: meeting.participants ?? "",
          meeting_link: meeting.meeting_link ?? "",
          objective: meeting.objective ?? "",
          context: meeting.context ?? "",
          decisions: meeting.decisions ?? "",
          pendings: meeting.pendings ?? "",
          next_steps: meeting.next_steps ?? "",
          recurrence: rootRecord?.recurrence ?? "",
          recurrence_interval: rootRecord?.recurrence_interval ?? 1,
          recurrence_days: rootRecord?.recurrence_days ?? [],
          recurrence_monthly_mode: rootRecord?.recurrence_monthly_mode ?? "day_of_month",
          recurrence_end_type: rootRecord?.recurrence_end_type ?? "never",
          recurrence_end_date: rootRecord?.recurrence_end_date ?? "",
          recurrence_count: rootRecord?.recurrence_count ?? 10,
        });
      } else {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);
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
    };

    prepareForm();

    return () => {
      active = false;
    };
  }, [open, meeting]);

  const set = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const editScopeOptions = useMemo(
    () => [
      {
        value: "single" as const,
        title: "Apenas este evento",
        description: "Atualiza só a ocorrência aberta agora.",
      },
      {
        value: "future" as const,
        title: "Este e os próximos",
        description: "Mantém o histórico e aplica mudanças daqui para frente.",
      },
      {
        value: "all" as const,
        title: "Toda a série",
        description: "Reorganiza todas as ocorrências vinculadas à série.",
      },
    ],
    [],
  );

  const save = async () => {
    if (!form.title?.trim() || !form.start_at) {
      toast.error("Título e início são obrigatórios");
      return;
    }

    const startDate = new Date(form.start_at);
    const endDate = form.end_at ? new Date(form.end_at) : null;

    if (Number.isNaN(startDate.getTime())) {
      toast.error("Data de início inválida");
      return;
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      toast.error("Data de fim inválida");
      return;
    }
    if (endDate && endDate <= startDate) {
      toast.error("O fim deve ser maior que o início");
      return;
    }
    if (form.recurrence === "semanal" && (form.recurrence_days?.length ?? 0) === 0) {
      toast.error("Selecione ao menos um dia da semana");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      const { payload, hasRecurrence } = buildMeetingPayload(form, userId);

      if (!meeting) {
        const { data: inserted, error: insertError } = await supabase
          .from("meetings")
          .insert(payload)
          .select("*")
          .single();
        if (insertError) throw insertError;

        let generatedCount = 0;
        if (hasRecurrence) {
          generatedCount = await reconcileSeriesChildren(inserted as MeetingRecord, []);
        }

        toast.success(generatedCount > 0 ? `Evento salvo com ${generatedCount} ocorrências futuras` : "Evento salvo");
        onOpenChange(false);
        onSaved();
        return;
      }

      const currentMeeting = meeting as MeetingRecord;
      const rootId = getSeriesRootId(currentMeeting);
      const isRecurringSeries = Boolean(rootId && (currentMeeting.parent_meeting_id || currentMeeting.recurrence));

      if (!isRecurringSeries || editScope === "single") {
        const singlePayload = {
          ...payload,
          recurrence: currentMeeting.parent_meeting_id ? null : currentMeeting.recurrence,
          recurrence_interval: currentMeeting.parent_meeting_id ? null : currentMeeting.recurrence_interval,
          recurrence_days: currentMeeting.parent_meeting_id ? null : currentMeeting.recurrence_days,
          recurrence_monthly_mode: currentMeeting.parent_meeting_id ? null : currentMeeting.recurrence_monthly_mode,
          recurrence_end_type: currentMeeting.parent_meeting_id ? null : currentMeeting.recurrence_end_type,
          recurrence_end_date: currentMeeting.parent_meeting_id ? null : currentMeeting.recurrence_end_date,
          recurrence_count: currentMeeting.parent_meeting_id ? null : currentMeeting.recurrence_count,
          parent_meeting_id: currentMeeting.parent_meeting_id ?? null,
        };

        const { error } = await supabase.from("meetings").update(singlePayload).eq("id", currentMeeting.id);
        if (error) throw error;

        toast.success("Evento atualizado");
        onOpenChange(false);
        onSaved();
        return;
      }

      const series = await getSeriesMeetings(rootId!);
      const rootMeeting = series.find((item) => item.id === rootId);
      if (!rootMeeting) throw new Error("Série recorrente não encontrada.");

      if (editScope === "future" && currentMeeting.parent_meeting_id) {
        const followingChildren = series.filter(
          (item) => item.id !== currentMeeting.id && item.parent_meeting_id === rootId && new Date(item.start_at) >= new Date(currentMeeting.start_at),
        );

        const { error: splitRootError } = await supabase
          .from("meetings")
          .update({
            recurrence_end_type: "date",
            recurrence_end_date: getPreviousDateISO(new Date(currentMeeting.start_at)),
            recurrence_count: null,
          })
          .eq("id", rootId!);
        if (splitRootError) throw splitRootError;

        const futureRootPayload = { ...payload, parent_meeting_id: null };
        const { data: updatedCurrent, error: updateCurrentError } = await supabase
          .from("meetings")
          .update(futureRootPayload)
          .eq("id", currentMeeting.id)
          .select("*")
          .single();
        if (updateCurrentError) throw updateCurrentError;

        const generatedCount = await reconcileSeriesChildren(updatedCurrent as MeetingRecord, followingChildren);
        toast.success(generatedCount > 0 ? `Série futura atualizada com ${generatedCount} ocorrências` : "Série futura atualizada");
        onOpenChange(false);
        onSaved();
        return;
      }

      const targetRoot = rootMeeting;
      const oldSelectedStart = new Date(currentMeeting.start_at).getTime();
      const newSelectedStart = new Date(payload.start_at).getTime();
      const deltaMs = newSelectedStart - oldSelectedStart;
      const rootStart = new Date(targetRoot.start_at);
      const shiftedRootStart = new Date(rootStart.getTime() + deltaMs);
      const targetDurationMs = payload.end_at
        ? new Date(payload.end_at).getTime() - new Date(payload.start_at).getTime()
        : 0;

      const rootPayload = {
        ...payload,
        start_at: shiftedRootStart.toISOString(),
        end_at: payload.end_at ? new Date(shiftedRootStart.getTime() + targetDurationMs).toISOString() : null,
        parent_meeting_id: null,
      };

      const { data: updatedRoot, error: updateRootError } = await supabase
        .from("meetings")
        .update(rootPayload)
        .eq("id", targetRoot.id)
        .select("*")
        .single();
      if (updateRootError) throw updateRootError;

      const existingChildren = series.filter((item) => item.id !== targetRoot.id);
      const generatedCount = await reconcileSeriesChildren(updatedRoot as MeetingRecord, existingChildren);

      toast.success(generatedCount > 0 ? `Série atualizada com ${generatedCount} ocorrências` : "Série atualizada");
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível salvar o evento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting ? "Editar reunião" : "Nova reunião"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Título *</Label>
            <Input value={form.title ?? ""} onChange={(event) => set("title", event.target.value)} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Início *</Label>
              <Input type="datetime-local" value={form.start_at ?? ""} onChange={(event) => set("start_at", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fim</Label>
              <Input type="datetime-local" value={form.end_at ?? ""} onChange={(event) => set("end_at", event.target.value)} />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label>Participantes</Label>
              <Input value={form.participants ?? ""} onChange={(event) => set("participants", event.target.value)} placeholder="Nome 1, Nome 2..." />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label>Link da reunião</Label>
              <Input value={form.meeting_link ?? ""} onChange={(event) => set("meeting_link", event.target.value)} placeholder="https://teams.microsoft.com/..." />
            </div>
          </div>

          {isSeriesMember && (
            <div className="grid gap-3 rounded-lg border p-3">
              <div>
                <Label>Aplicar alterações em</Label>
                <p className="text-xs text-muted-foreground">Escolha como a série deve ser atualizada.</p>
              </div>
              <RadioGroup value={editScope} onValueChange={(value) => setEditScope(value as SeriesEditScope)}>
                {editScopeOptions.map((option) => (
                  <label key={option.value} className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value={option.value} className="mt-1" />
                    <div>
                      <p className="text-sm font-medium">{option.title}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Recorrência</Label>
            <Select
              value={form.recurrence || undefined}
              onValueChange={(value) => set("recurrence", value === "none" ? "" : value)}
              disabled={recurrenceLocked}
            >
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
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">
                    Repetir a cada {form.recurrence === "diaria" ? "(dias)" : form.recurrence === "semanal" ? "(semanas)" : "(meses)"}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.recurrence_interval ?? 1}
                    onChange={(event) => set("recurrence_interval", event.target.value)}
                    disabled={recurrenceLocked}
                  />
                </div>
              </div>

              {form.recurrence === "semanal" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Dias da semana</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS_PT.map((day) => {
                      const selected = (form.recurrence_days ?? []).includes(day.key);
                      return (
                        <Button
                          key={day.key}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          className="h-7 px-2.5 text-xs"
                          disabled={recurrenceLocked}
                          onClick={() => {
                            const current: string[] = form.recurrence_days ?? [];
                            set(
                              "recurrence_days",
                              selected ? current.filter((value) => value !== day.key) : [...current, day.key],
                            );
                          }}
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.recurrence === "mensal" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Padrão mensal</Label>
                  <Select
                    value={form.recurrence_monthly_mode}
                    onValueChange={(value) => set("recurrence_monthly_mode", value)}
                    disabled={recurrenceLocked}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day_of_month">No mesmo dia do mês</SelectItem>
                      <SelectItem value="weekday_of_month">No mesmo dia da semana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-1.5">
                <Label className="text-xs">Termina</Label>
                <Select
                  value={form.recurrence_end_type}
                  onValueChange={(value) => set("recurrence_end_type", value)}
                  disabled={recurrenceLocked}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Nunca</SelectItem>
                    <SelectItem value="date">Em uma data</SelectItem>
                    <SelectItem value="count">Após X ocorrências</SelectItem>
                  </SelectContent>
                </Select>
                {form.recurrence_end_type === "date" && (
                  <Input
                    type="date"
                    value={form.recurrence_end_date ?? ""}
                    onChange={(event) => set("recurrence_end_date", event.target.value)}
                    disabled={recurrenceLocked}
                  />
                )}
                {form.recurrence_end_type === "count" && (
                  <Input
                    type="number"
                    min={1}
                    value={form.recurrence_count ?? 1}
                    onChange={(event) => set("recurrence_count", event.target.value)}
                    placeholder="Número de ocorrências"
                    disabled={recurrenceLocked}
                  />
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                O sistema gera automaticamente os próximos eventos da série para os próximos {SERIES_HORIZON_DAYS} dias.
              </p>
            </div>
          )}

          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Notas da reunião</p>
          <div className="grid gap-2">
            <Label>Objetivo</Label>
            <Textarea rows={2} value={form.objective ?? ""} onChange={(event) => set("objective", event.target.value)} placeholder="O que se espera alcançar" />
          </div>
          <div className="grid gap-2">
            <Label>Contexto</Label>
            <Textarea rows={2} value={form.context ?? ""} onChange={(event) => set("context", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Decisões</Label>
            <Textarea rows={2} value={form.decisions ?? ""} onChange={(event) => set("decisions", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Pendências</Label>
            <Textarea rows={2} value={form.pendings ?? ""} onChange={(event) => set("pendings", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Próximos passos</Label>
            <Textarea rows={2} value={form.next_steps ?? ""} onChange={(event) => set("next_steps", event.target.value)} />
          </div>
          {meeting?.id && <div className="border-t pt-3"><NotesPanel meetingId={meeting.id} /></div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
