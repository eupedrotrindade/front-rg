export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export const EVENT_TYPES = {
  montagem: {
    label: "Montagem",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-500",
    borderColor: "border-yellow-200",
  },
  preparacao: {
    label: "Preparação",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-500",
    borderColor: "border-blue-200",
  },
  finalizacao: {
    label: "Finalização",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgColor: "bg-purple-500",
    borderColor: "border-purple-200",
  },
} as const;
