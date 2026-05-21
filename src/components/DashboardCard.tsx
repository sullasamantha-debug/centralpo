import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title: ReactNode;
  count?: number;
  tone?: "warning" | "info" | "destructive" | "primary" | "neutral";
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onHide: () => void;
  className?: string;
  children: ReactNode;
}

const TONE_RING: Record<string, string> = {
  warning: "ring-warning/30",
  info: "ring-info/30",
  destructive: "ring-destructive/30",
  primary: "ring-primary/30",
  neutral: "ring-border",
};

export function DashboardCard({
  id, title, count, tone = "neutral", collapsed, onToggleCollapsed, onHide, className, children,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border bg-card/50 p-4 ring-1 transition-shadow",
        TONE_RING[tone],
        isDragging && "opacity-60 shadow-lg z-10",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            {...attributes}
            {...listeners}
            type="button"
            aria-label="Arrastar card"
            className="size-6 grid place-items-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 touch-none cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="size-4" />
          </button>
          <h3 className="font-semibold text-sm flex items-center gap-2 truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {typeof count === "number" && (
            <span className="text-xs text-muted-foreground mr-1">{count}</span>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={onToggleCollapsed} aria-label={collapsed ? "Expandir" : "Minimizar"}>
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={onHide} aria-label="Ocultar">
            <X className="size-4" />
          </Button>
        </div>
      </div>
      {!collapsed && <div className="space-y-2">{children}</div>}
    </div>
  );
}
