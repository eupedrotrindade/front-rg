import { apiClient } from "@/lib/api-client";
import { Event, PaginationParams, ApiResponse } from "../types";

export const getEvent = async (id: string): Promise<Event | null> => {
  try {
    const { data } = await apiClient.get<Event>(`/events/${id}`);
    return data;
  } catch (error) {
    console.error("Erro ao buscar evento:", error);
    return null;
  }
};

export const getEventAll = async (
  params?: PaginationParams
): Promise<Event[] | null> => {
  try {
    const response = await apiClient.get<ApiResponse<Event[]> | Event[]>(
      "/events",
      { params }
    );

    // Verifica se a resposta tem estrutura com data e pagination
    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      return (response.data as ApiResponse<Event[]>).data;
    }

    // Se não, assume que é um array direto
    return response.data as Event[];
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return null;
  }
};
