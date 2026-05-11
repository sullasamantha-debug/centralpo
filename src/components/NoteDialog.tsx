import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  note?: any | null;
  defaults?: { task_id?: string; meeting_id?: string; product_id?: string };
  onSaved?: () => void;
}

export function NoteDialog({ open, onOpenChange, note, defaults, onSaved }: Props) {
  const [form, setForm] = useState<any>({ title: "", content: "", tags: "", product_id: "" });
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("products").select("id,name").order("name").then(({ data }) => setProducts(data ?? []));
    if (note) {
      setForm({
        title: note.title ?? "",
        content: note.content ?? "",
        tags: (note.tags ?? []).join(", "),
        product_id: note.product_id ?? "",
      });
    } else {
      setForm({ title: "", content: "", tags: "", product_id: defaults?.product_id ?? "" });
    }
  }, [open, note, defaults]);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const tags = form.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    const payload: any = {
      title: form.title,
      content: form.content || null,
      tags,
      product_id: form.product_id || null,
      task_id: defaults?.task_id ?? note?.task_id ?? null,
      meeting_id: defaults?.meeting_id ?? note?.meeting_id ?? null,
      user_id: u.user!.id,
    };
    const { error } = note?.id
      ? await supabase.from("notes").update(payload).eq("id", note.id)
      : await supabase.from("notes").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(note ? "Nota atualizada" : "Nota criada");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{note ? "Editar nota" : "Nova nota"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>
          <div className="grid gap-1.5"><Label>Conteúdo</Label>
            <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="grid gap-1.5"><Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ideia, contexto" />
          </div>
          <div className="grid gap-1.5"><Label>Produto</Label>
            <Select value={form.product_id || undefined} onValueChange={(v) => setForm({ ...form, product_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
