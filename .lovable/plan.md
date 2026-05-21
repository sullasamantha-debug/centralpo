# Personalização visual: drag & drop de tarefas e dashboard

Adicionar ordenação manual de tarefas e personalização dos cards do dashboard, com persistência por usuário e suporte a mobile.

## 1. Dependência

Instalar `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (suporte nativo a mouse + touch + teclado, leve, acessível).

## 2. Banco de dados

Migration única adicionando:

- `tasks.sort_order` (numeric, nullable) — posição manual. `NULL` = sem ordenação manual (cai no automático).
- `user_preferences` (nova tabela):
  - `user_id` (pk, FK auth.users)
  - `dashboard_layout` (jsonb) — array `[{ id, visible, collapsed }]` com a ordem dos cards
  - `updated_at`
  - RLS: `auth.uid() = user_id`

## 3. Ordenação manual de tarefas

Aplicar em: **Cobrar hoje**, **Minhas tarefas** (dashboard), **Tarefas → Abertas/Todas**.

- Envolver a lista em `<DndContext><SortableContext>` com `verticalListSortingStrategy`.
- Cada `TaskCard` recebe um handle de arrastar (ícone `GripVertical` à esquerda, visível em hover/mobile).
- Ao soltar:
  - Reordena local (otimista).
  - Recalcula `sort_order` dos itens afetados (espaçamento 1000, ex.: 1000, 2000, 3000…) e faz `upsert` em batch no Supabase.
- Sort key combinado: `sort_order ASC NULLS LAST`, depois o critério automático atual (prioridade → due → followup).
- Para "Cobrar hoje" e "Backlog/Abertas" usar a mesma coluna `sort_order` global — simples e suficiente para o uso descrito.

## 4. Personalização do dashboard

Cards: `cobrar_hoje`, `responder`, `atrasadas`, `hoje`, `minhas_tarefas`, `agenda`.

- Carregar `user_preferences.dashboard_layout` no mount; se vazio, usar default.
- `<DndContext>` em volta do grid dos 4 cards superiores + seção "Minhas tarefas" + agenda (todos viram itens reordenáveis no mesmo grid).
- Cada card ganha header com:
  - handle de arrastar
  - botão minimizar (chevron) — esconde o conteúdo, mantém o header
  - botão ocultar (X) — remove da view
- Botão "Restaurar cards ocultos" no topo do dashboard quando houver algum oculto.
- Persistência: debounce 500ms → upsert em `user_preferences`.

## 5. Mobile

`@dnd-kit` PointerSensor + TouchSensor com `activationConstraint: { delay: 150, tolerance: 5 }` para não conflitar com scroll/tap. Handle dedicado evita arrasto acidental.

## 6. UX

- `DragOverlay` com sombra e leve escala para feedback.
- Transições CSS via `useSortable` transform/transition.
- Cursor `grab`/`grabbing` no handle.

## Arquivos

**Novos**
- `supabase/migrations/<ts>_dnd_personalization.sql`
- `src/hooks/useDashboardLayout.ts` — load/save layout + helpers (hide, collapse, reorder)
- `src/components/SortableTaskList.tsx` — wrapper genérico para listas reordenáveis
- `src/components/DashboardCard.tsx` — wrapper com header (drag/minimize/hide)

**Editados**
- `src/components/TaskCard.tsx` — handle opcional via prop `dragHandleProps`
- `src/routes/_authenticated/index.tsx` — DnD do dashboard + lista "Minhas tarefas" sortable + "Cobrar hoje" sortable
- `src/routes/_authenticated/tasks.tsx` — listas "Abertas" e "Todas" sortable

## Fora do escopo

- Ordenação por seção/coluna independente (uma coluna `sort_order` global é suficiente para o uso descrito).
- Drag and drop entre seções diferentes do dashboard de tarefas (apenas reordenação dentro da mesma lista).
