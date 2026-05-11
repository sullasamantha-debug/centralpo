import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  STATUS_OPTIONS, PRIORITY_OPTIONS, KIND_OPTIONS, CHANNEL_OPTIONS,
} from "@/lib/constants";
import { NotesPanel } from "@/components/NotesPanel";
import { toast } from "sonner";

type Product = { id: string; name: string };
type Opt = { value: string; label: string };
type Task = any;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
  defaults?: Partial<Task>;
  onSaved?: () => void;
}

const empty = {
  title: "",
  description: "",
  owner: "",
  followup_owner: "",
  status: "a_fazer",
  priority: "media",
  due_date: "",
  product_id: "",
  demand_type: "",
  origin: "",
  kind: "minha",
  needs_response: false,
  response_channel: "",
  response_summary: "",
  next_followup_date: "",
};

export function TaskDialog({ open, onOpenChange, task, defaults, onSaved }: Props) {
  const [form, setForm] = useState<any>(empty);
  const [products, setProducts] = useState<Product[]>([]);
  const [demandTypes, setDemandTypes] = useState<Opt[]>([]);
  const [origins, setOrigins] = useState<Opt[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("products").select("id,name").order("name").then(({ data }) => setProducts(data ?? []));
    supabase.from("demand_types").select("name").order("name").then(({ data }) =>
      setDemandTypes((data ?? []).map((d) => ({ value: d.name, label: d.name })))
    );
    supabase.from("origins").select("name").order("name").then(({ data }) =>
      setOrigins((data ?? []).map((d) => ({ value: d.name, label: d.name })))
    );
    if (task) {
      setForm({
        ...empty,
        ...task,
        due_date: task.due_date ?? "",
        next_followup_date: task.next_followup_date ?? "",
        product_id: task.product_id ?? "",
        demand_type: task.demand_type ?? "",
        origin: task.origin ?? "",
        response_channel: task.response_channel ?? "",
      });
    } else {
      setForm({ ...empty, ...defaults });
    }
  }, [open, task, defaults]);

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload: any = {
      ...form,
      due_date: form.due_date || null,
      next_followup_date: form.next_followup_date || null,
      product_id: form.product_id || null,
      demand_type: form.demand_type || null,
      origin: form.origin || null,
      response_channel: form.response_channel || null,
      user_id: userData.user?.id,
    };
    let error;
    if (task?.id) {
      const { error: e } = await supabase.from("tasks").update(payload).eq("id", task.id);
      error = e;
    } else {
      const { error: e } = await supabase.from("tasks").insert(payload);
      error = e;
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
    onOpenChange(false);
    onSaved?.();
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <SelectField value={form.status} onValueChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
            </Field>
            <Field label="Prioridade">
              <SelectField value={form.priority} onValueChange={(v) => set("priority", v)} options={PRIORITY_OPTIONS} />
            </Field>
            <Field label="Data limite">
              <Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} />
            </Field>
            <Field label="Próximo follow-up">
              <Input type="date" value={form.next_followup_date ?? ""} onChange={(e) => set("next_followup_date", e.target.value)} />
            </Field>
            <Field label="Produto">
              <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo">
              <SelectField value={form.kind} onValueChange={(v) => set("kind", v)} options={KIND_OPTIONS} />
            </Field>
            <Field label="Tipo de demanda">
              <SelectField value={form.demand_type} onValueChange={(v) => set("demand_type", v)} options={demandTypes} placeholder="—" />
            </Field>
            <Field label="Origem">
              <SelectField value={form.origin} onValueChange={(v) => set("origin", v)} options={origins} placeholder="—" />
            </Field>
            <Field label="Responsável">
              <Input value={form.owner ?? ""} onChange={(e) => set("owner", e.target.value)} placeholder="Quem executa" />
            </Field>
            <Field label="Quem cobrar">
              <Input value={form.followup_owner ?? ""} onChange={(e) => set("followup_owner", e.target.value)} placeholder="Quem cobrar" />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label className="text-sm">Precisa responder</Label>
              <p className="text-xs text-muted-foreground">Aparece na lista “Responder”</p>
            </div>
            <Switch checked={form.needs_response} onCheckedChange={(v) => set("needs_response", v)} />
          </div>

          {form.needs_response && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Canal de resposta">
                <SelectField value={form.response_channel} onValueChange={(v) => set("response_channel", v)} options={CHANNEL_OPTIONS} placeholder="—" />
              </Field>
              <Field label="Resumo do retorno">
                <Input value={form.response_summary ?? ""} onChange={(e) => set("response_summary", e.target.value)} />
              </Field>
            </div>
          )}

          {task?.id && (
            <div className="pt-3 border-t">
              <NotesPanel taskId={task.id} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SelectField({ value, onValueChange, options, placeholder }: { value: string; onValueChange: (v: string) => void; options: readonly { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Selecionar..."} /></SelectTrigger>
      <SelectContent>
        {options.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
