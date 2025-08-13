import { apiClient } from "@/lib/api-client";

export interface CreateEventVehicleData {
  eventId: string;
  empresa?: string;
  modelo?: string;
  placa?: string;
  tipo_de_credencial?: string;
  retirada: "pendente" | "retirada";
  // Novos campos do modelo de turno
  shiftId: string;
  workDate: string;
  workStage: "montagem" | "evento" | "desmontagem";
  workPeriod: "diurno" | "noturno";
}

export interface EventVehicle {
  id: string;
  event_id: string;
  empresa?: string;
  modelo?: string;
  placa?: string;
  tipo_de_credencial?: string;
  retirada: "pendente" | "retirada";
  // Campos de turno (novos)
  shiftId?: string;
  workDate?: string;
  workStage?: "montagem" | "evento" | "desmontagem";
  workPeriod?: "diurno" | "noturno";
  // Campo legado (compatibilidade durante transição)
  dia?: string;
  created_at: string;
  updated_at: string;
}

export const createEventVehicle = async (
  data: CreateEventVehicleData
): Promise<EventVehicle> => {
  const response = await apiClient.post("/event-vehicles", data);
  return response.data;
};
