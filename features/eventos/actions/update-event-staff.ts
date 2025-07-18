import { apiClient } from "@/lib/api-client";
import { EventStaff } from "../types";

export const updateEventStaff = async (
  id: string,
  staffData: Partial<EventStaff>
): Promise<EventStaff | null> => {
  try {
    const { data } = await apiClient.put<EventStaff>(
      `/event-staff/${id}`,
      staffData
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar staff:", error);
    return null;
  }
};

export const updateEventStaffSupervisor = async (
  id: string,
  supervisorData: {
    supervisorName: string;
    supervisorCpf?: string;
    performedBy: string;
  }
): Promise<EventStaff | null> => {
  try {
    const { data } = await apiClient.patch<EventStaff>(
      `/event-staff/${id}/supervisor`,
      supervisorData
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar supervisor do staff:", error);
    return null;
  }
};
