import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, MessageCircle, Check, MoreHorizontal, Clock, AlertTriangle, Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { STATUS_OPTIONS, statusLabel, priorityLabel } from "@/lib/constants";
import { FollowupDialog } from "./FollowupDialog";
import { TaskDialog } from "./TaskDialog";
import { toast } from "sonner";

type Task = any;

interface Props {
  task: Task;
  product?: { id: string; name: string; color?: string | null } | null;
  onChanged: () => void;
}

function dueState(due?: string | null): "overdue" | "today" | "ok" | null {
  if (!due) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(due + "T00:00:00");
  if (d.getTime() < today.getTime()) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  return "ok";
}

export function TaskCard({ task, product, onChanged }: Props) {
  const [followOpen, setFollowOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isDone = task.status === "concluido";
  const dState = dueState(task.due_date);

  const setStatus = async (status: string) => {
    const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", task.id);
    if (error) toast.error(error.message);
    else { toast.success("Status atualizado"); onChanged(); }
  };

  const markResponded = async () => {
    const { error } = await supabase.from("tasks").update({ needs_response: false }).eq("id", task.id);
    if (error) toast.error(error.message);
    else { toast.success("Marcado como respondido"); onChanged(); }
  };

  const remove = async () => {
    if (!confirm("Excluir esta tarefa?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) toast.error(error.message);
    else { toast.success("Excluída"); onChanged(); }
  };

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card p-4 transition-colors",
        isDone && "opacity-60",
        dState === "overdue" && !isDone && "border-destructive/40 bg-destructive/5",
        dState === "today" && !isDone && "border-warning/50 bg-warning/5",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => setStatus(isDone ? "a_fazer" : "concluido")}
          className={cn(
            "mt-0.5 size-5 rounded-md border grid place-items-center transition-colors shrink-0",
            isDone ? "bg-success border-success text-success-foreground" : "hover:border-primary"
          )}
          aria-label="Concluir"
        >
          {isDone && <Check className="size-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className={cn("text-left font-medium leading-tight hover:text-primary", isDone && "line-through text-muted-foreground")}
            >
              {task.title}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 -mt-1 -mr-1 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
                {STATUS_OPTIONS.map((s) => (
                  <DropdownMenuItem key={s.value} onClick={() => setStatus(s.value)}>→ {s.label}</DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={remove} className="text-destructive">Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-xs">
            <Badge variant="secondary">{statusLabel(task.status)}</Badge>
            {task.priority === "alta" && <Badge className="bg-destructive text-destructive-foreground">Alta</Badge>}
            {task.priority === "media" && <Badge variant="outline">Média</Badge>}
            {task.priority === "baixa" && <Badge variant="outline" className="opacity-70">Baixa</Badge>}
            {product && (
              <Badge variant="outline" style={{ borderColor: product.color ?? undefined, color: product.color ?? undefined }}>
                {product.name}
              </Badge>
            )}
            {task.due_date && (
              <span className={cn(
                "inline-flex items-center gap-1 text-muted-foreground",
                dState === "overdue" && "text-destructive font-medium",
                dState === "today" && "text-warning-foreground font-medium",
              )}>
                {dState === "overdue" ? <AlertTriangle className="size-3" /> : <Calendar className="size-3" />}
                {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
            {task.next_followup_date && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" /> Cobrar: {new Date(task.next_followup_date + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
            {task.followup_owner && (
              <span className="text-muted-foreground">→ {task.followup_owner}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setFollowOpen(true)}>
              <MessageCircle className="size-3.5" /> Follow-up
            </Button>
            {task.needs_response && (
              <Button size="sm" variant="outline" onClick={markResponded}>
                <Reply className="size-3.5" /> Marcar respondido
              </Button>
            )}
            {!isDone && task.status !== "em_andamento" && (
              <Button size="sm" variant="ghost" onClick={() => setStatus("em_andamento")}>Iniciar</Button>
            )}
          </div>
        </div>
      </div>

      <FollowupDialog open={followOpen} onOpenChange={setFollowOpen} taskId={task.id} followupOwner={task.followup_owner} onSaved={onChanged} />
      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} onSaved={onChanged} />
    </div>
  );
}
