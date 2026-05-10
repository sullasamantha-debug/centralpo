import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { todayISO } from "@/lib/constants";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: string;
  followupOwner?: string | null;
  onSaved?: () => void;
}

export function FollowupDialog({ open, onOpenChange, taskId, followupOwner, onSaved }: Props) {
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const today = todayISO();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user!.id;

    const { error: e1 } = await supabase.from("task_followups").insert({
      task_id: taskId,
      user_id: uid,
      note: note || null,
      followup_date: today,
      next_followup_date: nextDate || null,
    });
    if (e1) { setSaving(false); toast.error(e1.message); return; }

    const { error: e2 } = await supabase.from("tasks").update({
      last_followup_date: today,
      last_followup_note: note || null,
      next_followup_date: nextDate || null,
    }).eq("id", taskId);

    setSaving(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Follow-up registrado");
    setNote(""); setNextDate("");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar follow-up</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {followupOwner && (
            <p className="text-sm text-muted-foreground">Cobrando: <span className="font-medium text-foreground">{followupOwner}</span></p>
          )}
          <div className="grid gap-2">
            <Label>Anotação</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="O que foi conversado / status atual" autoFocus />
          </div>
          <div className="grid gap-2">
            <Label>Próximo follow-up</Label>
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
