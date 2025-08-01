import { apiClient } from "@/lib/api-client";
import { Credential, PaginationParams } from "../types";

export const getCredential = async (id: string): Promise<Credential | null> => {
  try {
    const { data } = await apiClient.get<Credential>(`/credentials/${id}`);
    return data;
  } catch (error) {
    console.error("Erro ao buscar credencial:", error);
    return null;
  }
};

export const getCredentialAll = async (
  params?: PaginationParams
): Promise<Credential[] | null> => {
  try {
    const { data } = await apiClient.get<Credential[]>("/credentials", {
      params,
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao buscar credenciais:", error);
    return null;
  }
};

export const getCredentialByEvent = async (
  eventId: string
): Promise<Credential[] | null> => {
  try {
    const { data } = await apiClient.get<Credential[]>(
      `/credentials/event/${eventId}`
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao buscar credenciais do evento:", error);
    return null;
  }
}; 