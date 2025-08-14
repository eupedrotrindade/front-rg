// Nova estrutura simplificada para dias de evento

export interface SimpleEventDay {
  date: string; // formato: "2025-08-12" (apenas data, sem horário)
  period: "diurno" | "noturno"; // Período do dia
  idSync?: string; // ID opcional para sincronizar período
}

export interface SimpleEventDaysStructure {
  montagem: SimpleEventDay[];
  evento: SimpleEventDay[];
  desmontagem: SimpleEventDay[];
}

export type EventPhase = "montagem" | "evento" | "desmontagem";

// Para compatibilidade com a estrutura antiga
export interface LegacyEventDates {
  setupStartDate?: string | Date;
  setupEndDate?: string | Date;
  preparationStartDate?: string | Date;
  preparationEndDate?: string | Date;
  finalizationStartDate?: string | Date;
  finalizationEndDate?: string | Date;
  setupDate?: string | Date;
  preparationDate?: string | Date;
  finalizationDate?: string | Date;
}

// Tipo combinado que suporta ambas as estruturas
export type EventWithSimpleDays = SimpleEventDaysStructure &
  Partial<LegacyEventDates> & {
    id: string;
    name: string;
    [key: string]: any;
  };
