/* eslint-disable @typescript-eslint/no-explicit-any */
// Tipos para a nova estrutura flexível de dias de evento
import { SimpleEventDay } from "./simple-event-days";

export interface EventDay {
  date: string; // formato: "2025-08-11T10:00:00" (ISO datetime)
  start: boolean; // Define se é um dia de início
  end: boolean; // Define se é um dia de fim
  idSync?: string; // ID para sincronizar início e fim do mesmo período
}

export interface EventDaysStructure {
  montagem: SimpleEventDay[];
  evento: SimpleEventDay[];
  desmontagem: SimpleEventDay[];
}

export type EventPhase = "montagem" | "evento" | "desmontagem";

// Tipos para manipulação de dias
export interface EventDayFormData {
  phase: EventPhase;
  date: string;
  start: boolean;
  end: boolean;
}

// Utilitários para trabalhar com EventDays
export interface EventDayRange {
  startDate: string;
  endDate: string;
  phase: EventPhase;
}

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
export type EventWithFlexibleDays = EventDaysStructure &
  Partial<LegacyEventDates> & {
    id: string;
    name: string;
    [key: string]: any;
  };
