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
