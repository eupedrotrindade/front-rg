import { apiClient } from "@/lib/api-client";
import { CreateEventStaffRequest, EventStaff } from "../types";

export const createEventStaff = async (
  staffData: CreateEventStaffRequest
): Promise<EventStaff | null> => {
  try {
    const { data } = await apiClient.post<EventStaff>(
      "/event-staff",
      staffData
    );
    return data;
  } catch (error) {
    console.error("Erro ao criar staff:", error);
    return null;
  }
};
