export const STATUS_OPTIONS = [
  { value: "a_fazer", label: "A fazer" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aguardando_terceiros", label: "Aguardando terceiros" },
  { value: "concluido", label: "Concluído" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
] as const;

export const DEMAND_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "melhoria", label: "Melhoria" },
  { value: "duvida", label: "Dúvida" },
  { value: "processo", label: "Processo" },
  { value: "projeto", label: "Projeto" },
] as const;

export const ORIGIN_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "teams", label: "Teams" },
  { value: "reuniao", label: "Reunião" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sistema", label: "Sistema" },
  { value: "interno", label: "Interno" },
] as const;

export const KIND_OPTIONS = [
  { value: "minha", label: "Tarefa minha" },
  { value: "cobranca", label: "Cobrança" },
  { value: "ambos", label: "Ambos" },
] as const;

export const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "teams", label: "Teams" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "reuniao", label: "Reunião" },
] as const;

export function statusLabel(v?: string | null) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.label ?? "—";
}
export function priorityLabel(v?: string | null) {
  return PRIORITY_OPTIONS.find((s) => s.value === v)?.label ?? "—";
}

export function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
