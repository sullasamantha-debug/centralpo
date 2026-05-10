import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
});

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#64748b", "#8b5cf6", "#06b6d4", "#ec4899"];

function ProductsPage() {
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
    if (error) toast.error(error.message);
    else { setName(""); toast.success("Produto criado"); load(); }
  };

  const rename = async (id: string, newName: string) => {
    const { error } = await supabase.from("products").update({ name: newName }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir produto? As tarefas vinculadas ficarão sem produto.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); load(); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <p className="text-sm text-muted-foreground">Organize suas tarefas por produto</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm font-medium">Novo produto</p>
        <div className="flex gap-2">
          <Input placeholder="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add}><Plus className="size-4" /> Adicionar</Button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">Cor:</span>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="size-6 rounded-full border-2" style={{ background: c, borderColor: color === c ? "#000" : "transparent" }} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span className="size-3 rounded-full" style={{ background: p.color ?? "#999" }} />
            <Input
              defaultValue={p.name}
              onBlur={(e) => e.target.value !== p.name && rename(p.id, e.target.value)}
              className="border-0 shadow-none focus-visible:ring-1"
            />
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto.</p>}
      </div>
    </div>
  );
}
