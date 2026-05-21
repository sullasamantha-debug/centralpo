import { ReactNode, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SortableTaskListProps {
  tasks: { id: string; sort_order?: number | null }[];
  renderTask: (task: any) => ReactNode;
  onReordered: () => void;
}

export function SortableTaskList({ tasks, renderTask, onReordered }: SortableTaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;

    const reordered = arrayMove(tasks, oldIdx, newIdx);
    // Recompute sort_order with 1000 spacing
    const updates = reordered.map((t, i) => ({ id: t.id, sort_order: (i + 1) * 1000 }));

    // Optimistic UI: trigger reload after persistence
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await Promise.all(
      updates.map((u2) =>
        supabase.from("tasks").update({ sort_order: u2.sort_order }).eq("id", u2.id)
      )
    );
    onReordered();
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((t) => (
            <SortableTaskItem key={t.id} id={t.id}>
              {renderTask(t)}
            </SortableTaskItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableTaskItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative group/sortable pl-5", isDragging && "opacity-50 z-10")}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-5 grid place-items-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 touch-none cursor-grab active:cursor-grabbing transition-opacity md:opacity-0 md:group-hover/sortable:opacity-100 opacity-60"
        aria-label="Arrastar"
      >
        <GripVertical className="size-4" />
      </button>
      {children}
    </div>
  );
}
