export interface Event {
  id: string;
  name: string;
  description?: string;
  setupStartDate?: string;
  setupEndDate?: string;
  preparationStartDate?: string;
  preparationEndDate?: string;
  finalizationStartDate?: string;
  finalizationEndDate?: string;
}

export interface EventInterval {
  start: Date;
  end: Date;
  label: string;
  color: string;
  title: string;
  type: "montagem" | "preparacao" | "finalizacao";
  description?: string;
  eventId: string;
}

export type EventType = "montagem" | "preparacao" | "finalizacao";
