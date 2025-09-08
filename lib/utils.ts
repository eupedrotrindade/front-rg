import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatação de CPF (000.000.000-00)
export const formatCpf = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
  }
  return cpf;
};

// Formatação de telefone ((00) 00000-0000)
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

// Remove formatação para obter apenas números
export const unformatCpf = (value: string): string => {
  return value.replace(/\D/g, "");
};

export const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, "");
};

export const getEventTypeLabel = (type: string): string => {
  const eventTypes: Record<string, string> = {
    corporativo: "Corporativo",
    cultural: "Cultural",
    entretenimento: "Entretenimento",
    esportivo: "Esportivo",
    religioso: "Religioso",
    show: "Show",
    outros: "Outros",
  };

  return eventTypes[type] || type;
};

// Validação de CPF brasileiro
export const isValidCpf = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
  let check1 = 11 - (sum % 11);
  if (check1 >= 10) check1 = 0;
  if (check1 !== parseInt(cleaned.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
  let check2 = 11 - (sum % 11);
  if (check2 >= 10) check2 = 0;
  return check2 === parseInt(cleaned.charAt(10));
};

// Formatação de CPF para input (formata conforme o usuário digita)
export const formatCpfInput = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9)
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(
    6,
    9
  )}-${cleaned.slice(9, 11)}`;
};

// ===== UTILITÁRIOS DE FORMATAÇÃO DE DATAS =====

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 * Evita problemas de fuso horário tratando strings YYYY-MM-DD diretamente
 *
 * @param dateString - String de data no formato ISO (YYYY-MM-DD) ou Date object
 * @returns String formatada no padrão DD/MM/YYYY
 */
export const formatDateToBR = (dateString: string | Date): string => {
  if (!dateString) return "";

  // Se for string no formato YYYY-MM-DD, tratar diretamente
  if (
    typeof dateString === "string" &&
    dateString.match(/^\d{4}-\d{2}-\d{2}$/)
  ) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  // Para outros formatos, usar Date com horário meio-dia para evitar problemas de timezone
  const dateStr =
    typeof dateString === "string" ? dateString : dateString.toISOString();
  const date = new Date(
    dateStr.includes("T") ? dateStr : dateStr + "T12:00:00"
  );

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Converte data no formato DD/MM/YYYY para ISO (YYYY-MM-DD)
 *
 * @param brDate - String no formato DD/MM/YYYY
 * @returns String no formato YYYY-MM-DD ou empty string se inválida
 */
export const formatDateToISO = (brDate: string): string => {
  if (!brDate || !brDate.includes("/")) return "";

  const [day, month, year] = brDate.split("/");

  if (!day || !month || !year) return "";
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return "";

  return `${year}-${month}-${day}`;
};

/**
 * Valida se uma data no formato DD/MM/YYYY é válida
 *
 * @param brDate - String no formato DD/MM/YYYY
 * @returns boolean indicando se a data é válida
 */
export const isValidBRDate = (brDate: string): boolean => {
  if (!brDate || !brDate.includes("/")) return false;

  const [day, month, year] = brDate.split("/");

  if (!day || !month || !year) return false;

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (dayNum < 1 || dayNum > 31) return false;
  if (monthNum < 1 || monthNum > 12) return false;
  if (yearNum < 1900 || yearNum > 2100) return false;

  // Verificar se a data realmente existe
  const date = new Date(yearNum, monthNum - 1, dayNum);
  return (
    date.getFullYear() === yearNum &&
    date.getMonth() === monthNum - 1 &&
    date.getDate() === dayNum
  );
};

/**
 * Formata uma data corrigindo problemas de timezone
 * Especificamente útil para datas de eventos que devem manter a data local
 *
 * @param dateString - String de data no formato ISO
 * @returns String formatada no padrão DD/MM/YYYY mantendo a data correta
 */
export const formatEventDate = (dateString: string): string => {
  if (!dateString) return "";

  // Para strings no formato YYYY-MM-DD, criar a data sem problemas de timezone
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  // Para outros formatos, usar a função padrão
  return formatDateToBR(dateString);
};

/**
 * Cria uma data atual no formato ISO (YYYY-MM-DD) sem problemas de timezone
 *
 * @returns String no formato YYYY-MM-DD representando o dia atual
 */
export const getCurrentDateISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Cria uma data atual no formato brasileiro (DD/MM/YYYY)
 *
 * @returns String no formato DD/MM/YYYY representando o dia atual
 */
export const getCurrentDateBR = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");

  return `${day}/${month}/${year}`;
};

// ===== ORDENAR DIAS SIMPLIFICADOS POR DATA E PERÍODO =====
import type { SimpleEventDay } from "@/public/types/simple-event-days";

const periodPriority: Record<SimpleEventDay["period"], number> = {
  diurno: 0,
  dia_inteiro: 1,
  noturno: 2,
};

export const sortSimpleEventDays = (
  days: SimpleEventDay[] | null | undefined
): SimpleEventDay[] => {
  if (!Array.isArray(days)) return [];
  return [...days].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return periodPriority[a.period] - periodPriority[b.period];
  });
};
