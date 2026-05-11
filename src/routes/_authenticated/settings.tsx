import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#64748b", "#8b5cf6", "#06b6d4", "#ec4899"];

function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize os campos do sistema</p>
      </div>
      <ProductSection />
      <OptionSection table="demand_types" title="Tipos de demanda" />
      <OptionSection table="origins" title="Origens" />
    </div>
  );
}

function ProductSection() {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("products").insert({ name, color, user_id: u.user!.id });
    if (error) toast.error(error.message); else { setName(""); load(); }
  };
  const rename = async (id: string, v: string) => {
    const { error } = await supabase.from("products").update({ name: v }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  return (
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">Produtos</p>
      <div className="flex flex-wrap gap-2">
        <Input className="flex-1 min-w-[180px]" placeholder="Novo produto" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <div className="flex gap-1 items-center">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="size-5 rounded-full border-2" style={{ background: c, borderColor: color === c ? "hsl(var(--foreground))" : "transparent" }} />
          ))}
        </div>
        <Button onClick={add}><Plus className="size-4" /> Adicionar</Button>
      </div>
      <div className="space-y-1.5">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
            <span className="size-3 rounded-full" style={{ background: p.color ?? "#999" }} />
            <Input defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && rename(p.id, e.target.value)} className="border-0 shadow-none focus-visible:ring-1" />
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function OptionSection({ table, title }: { table: "demand_types" | "origins"; title: string }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");

  const load = async () => {
    const { data } = await supabase.from(table).select("*").order("name");
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from(table).insert({ name, user_id: u.user!.id });
    if (error) toast.error(error.message); else { setName(""); load(); }
  };
  const rename = async (id: string, v: string) => {
    const { error } = await supabase.from(table).update({ name: v }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from(table).delete().eq("id", id);
    load();
  };

  return (
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex gap-2">
        <Input placeholder={`Nova opção em ${title.toLowerCase()}`} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}><Plus className="size-4" /></Button>
      </div>
      <div className="space-y-1.5">
        {list.map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-lg border p-2">
            <Input defaultValue={o.name} onBlur={(e) => e.target.value !== o.name && rename(o.id, e.target.value)} className="border-0 shadow-none focus-visible:ring-1" />
            <Button size="icon" variant="ghost" onClick={() => remove(o.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma opção.</p>}
      </div>
    </section>
  );
}
