import { apiClient } from "@/lib/api-client";
import { EventManager } from "../types";

export const updateEventManager = async (
  id: string,
  managerData: Partial<EventManager>
): Promise<EventManager | null> => {
  try {
    const { data } = await apiClient.put<EventManager>(
      `/event-managers/${id}`,
      managerData
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar gerente:", error);
    return null;
  }
};

export const updateEventManagerPermissions = async (
  id: string,
  permissions: {
    permissions: "admin" | "manager" | "editor" | "viewer";
    performedBy: string;
  }
): Promise<EventManager | null> => {
  try {
    const { data } = await apiClient.patch<EventManager>(
      `/event-managers/${id}/permissions`,
      permissions
    );
    return data;
  } catch (error) {
    console.error("Erro ao atualizar permissões do gerente:", error);
    return null;
  }
};
