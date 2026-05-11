import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, StickyNote } from "lucide-react";
import { NoteDialog } from "./NoteDialog";
import { toast } from "sonner";

interface Props {
  taskId?: string;
  meetingId?: string;
}

export function NotesPanel({ taskId, meetingId }: Props) {
  const [notes, setNotes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    let q = supabase.from("notes").select("*").order("created_at", { ascending: false });
    if (taskId) q = q.eq("task_id", taskId);
    if (meetingId) q = q.eq("meeting_id", meetingId);
    const { data } = await q;
    setNotes(data ?? []);
  };
  useEffect(() => { if (taskId || meetingId) load(); }, [taskId, meetingId]);

  const remove = async (id: string) => {
    if (!confirm("Excluir nota?")) return;
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <StickyNote className="size-3" /> Notas ({notes.length})
        </p>
        <Button size="sm" variant="outline" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-3.5" /> Adicionar
        </Button>
      </div>
      <div className="space-y-1.5">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border bg-card/50 p-2.5 text-sm group">
            <div className="flex items-start justify-between gap-2">
              <button className="font-medium text-left flex-1 hover:text-primary" onClick={() => { setEditing(n); setOpen(true); }}>
                {n.title}
              </button>
              <button onClick={() => remove(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </div>
            {n.content && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{n.content}</p>}
            {n.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {n.tags.map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{t}</span>)}
              </div>
            )}
          </div>
        ))}
        {notes.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem notas.</p>}
      </div>
      <NoteDialog open={open} onOpenChange={setOpen} note={editing} defaults={{ task_id: taskId, meeting_id: meetingId }} onSaved={load} />
    </div>
  );
}
