import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";
import { STATUS_OPTIONS, statusLabel, todayISO } from "@/lib/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [demandTypes, setDemandTypes] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({
    from: "", to: "", dateField: "created_at",
    status: "", owner: "", followup_owner: "", product_id: "", demand_type: "",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*"),
      supabase.from("demand_types").select("*").order("name"),
    ]).then(([t, p, d]) => {
      setTasks(t.data ?? []); setProducts(p.data ?? []); setDemandTypes(d.data ?? []);
    });
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const dateVal = filters.dateField === "completed_at" ? t.completed_at?.slice(0, 10) : t.created_at?.slice(0, 10);
      if (filters.from && (!dateVal || dateVal < filters.from)) return false;
      if (filters.to && (!dateVal || dateVal > filters.to)) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.product_id && t.product_id !== filters.product_id) return false;
      if (filters.demand_type && t.demand_type !== filters.demand_type) return false;
      if (filters.owner && !(t.owner ?? "").toLowerCase().includes(filters.owner.toLowerCase())) return false;
      if (filters.followup_owner && !(t.followup_owner ?? "").toLowerCase().includes(filters.followup_owner.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filters]);

  const today = todayISO();
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byProduct: Record<string, number> = {};
    let late = 0, done = 0;
    for (const t of filtered) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      const pname = t.product_id ? productMap.get(t.product_id)?.name ?? "—" : "—";
      byProduct[pname] = (byProduct[pname] ?? 0) + 1;
      if (t.due_date && t.due_date < today && t.status !== "concluido") late++;
      if (t.status === "concluido") done++;
    }
    return { byStatus, byProduct, late, done };
  }, [filtered, productMap, today]);

  const rows = () => filtered.map((t) => [
    t.title,
    statusLabel(t.status),
    t.product_id ? productMap.get(t.product_id)?.name ?? "" : "",
    t.owner ?? "",
    t.followup_owner ?? "",
    t.demand_type ?? "",
    t.due_date ?? "",
    t.created_at?.slice(0, 10) ?? "",
    t.completed_at?.slice(0, 10) ?? "",
  ]);

  const exportCSV = () => {
    const head = ["Título", "Status", "Produto", "Responsável", "Quem cobrar", "Tipo", "Prazo", "Criada em", "Concluída em"];
    const csv = [head, ...rows()]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `relatorio-${today}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14); doc.text("Relatório de tarefas", 14, 14);
    doc.setFontSize(10); doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 20);
    doc.text(`Total: ${filtered.length}  •  Concluídas: ${stats.done}  •  Atrasadas: ${stats.late}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [["Título", "Status", "Produto", "Resp.", "Cobrar", "Tipo", "Prazo", "Criada", "Concluída"]],
      body: rows(),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });
    doc.save(`relatorio-${today}.pdf`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Filtre, visualize e exporte suas tarefas</p>
      </div>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Filtros</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <FieldS label="Campo de data">
            <Select value={filters.dateField} onValueChange={(v) => setFilters({ ...filters, dateField: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Criação</SelectItem>
                <SelectItem value="completed_at">Conclusão</SelectItem>
              </SelectContent>
            </Select>
          </FieldS>
          <FieldS label="De"><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></FieldS>
          <FieldS label="Até"><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></FieldS>
          <FieldS label="Status">
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldS>
          <FieldS label="Produto">
            <Select value={filters.product_id || "all"} onValueChange={(v) => setFilters({ ...filters, product_id: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldS>
          <FieldS label="Tipo de demanda">
            <Select value={filters.demand_type || "all"} onValueChange={(v) => setFilters({ ...filters, demand_type: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {demandTypes.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldS>
          <FieldS label="Responsável"><Input value={filters.owner} onChange={(e) => setFilters({ ...filters, owner: e.target.value })} placeholder="Contém…" /></FieldS>
          <FieldS label="Quem cobrar"><Input value={filters.followup_owner} onChange={(e) => setFilters({ ...filters, followup_owner: e.target.value })} placeholder="Contém…" /></FieldS>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={exportPDF}><FileText className="size-4" /> PDF</Button>
          <Button variant="outline" onClick={exportCSV}><Download className="size-4" /> CSV</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat title="Total" value={filtered.length} />
        <Stat title="Concluídas" value={stats.done} />
        <Stat title="Atrasadas" value={stats.late} tone="destructive" />
        <Stat title="Produtos" value={Object.keys(stats.byProduct).length} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Box title="Por status">
          {Object.entries(stats.byStatus).map(([k, v]) => (
            <Row key={k} label={statusLabel(k)} value={v} />
          ))}
          {Object.keys(stats.byStatus).length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
        </Box>
        <Box title="Por produto">
          {Object.entries(stats.byProduct).map(([k, v]) => <Row key={k} label={k} value={v} />)}
          {Object.keys(stats.byProduct).length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
        </Box>
      </div>

      <section className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr>
              <th className="text-left p-2">Título</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Produto</th>
              <th className="text-left p-2">Resp.</th>
              <th className="text-left p-2">Cobrar</th>
              <th className="text-left p-2">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{t.title}</td>
                <td className="p-2">{statusLabel(t.status)}</td>
                <td className="p-2">{t.product_id ? productMap.get(t.product_id)?.name : "—"}</td>
                <td className="p-2">{t.owner ?? "—"}</td>
                <td className="p-2">{t.followup_owner ?? "—"}</td>
                <td className="p-2">{t.due_date ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Nenhuma tarefa.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function FieldS({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Stat({ title, value, tone }: { title: string; value: number; tone?: "destructive" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className={`text-2xl font-semibold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-sm"><span>{label}</span><span className="font-medium">{value}</span></div>;
}
