import apiClient from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type RadioStatus = "disponivel" | "retirado" | "manutencao";

export interface Radio {
  id: string;
  codes: string[];
  codes_trocados: string[];
  codes_devolvidos: string[];
  status: RadioStatus;
  last_retirada_id?: string | null;
  event_id?: string | null;
  created_at?: string;
  updated_at?: string;
  historico?: any[];
}

// Listar todos os rádios
export const getRadios = async (params?: {
  eventId?: string;
}): Promise<Radio[]> => {
  const queryParams = new URLSearchParams();
  if (params?.eventId) {
    queryParams.append("eventId", params.eventId);
  }

  const url = `/radios${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;
  const { data } = await apiClient.get<Radio[]>(url);
  return data;
};

// Buscar rádio por ID
export const getRadioById = async (id: string): Promise<Radio> => {
  const { data } = await apiClient.get<Radio>(`/radios/${id}`);
  return data;
};

// Criar novo rádio
export const createRadio = async (payload: {
  codes: string[];
  status: RadioStatus;
  event_id?: string | null;
  last_retirada_id?: string | null;
}): Promise<Radio> => {
  const { data } = await apiClient.post<Radio>("/radios", payload);
  return data;
};

// Atualizar rádio
export const updateRadio = async (
  id: string,
  radio: Partial<Radio>
): Promise<Radio> => {
  const { data } = await apiClient.put<Radio>(`/radios/${id}`, radio);
  return data;
};

// Deletar rádio
export const deleteRadio = async (id: string): Promise<void> => {
  await apiClient.delete(`/radios/${id}`);
};

// Hook para buscar todos os rádios
export const useRadios = (params?: { eventId?: string }) => {
  return useQuery<Radio[]>({
    queryKey: ["radios", params],
    queryFn: () => getRadios(params),
  });
};

// Hook para criar rádio
export const useCreateRadio = () => {
  const queryClient = useQueryClient();
  return useMutation<Radio, unknown, Parameters<typeof createRadio>[0]>({
    mutationFn: createRadio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radios"] });
    },
  });
};

// Hook para atualizar rádio
export const useUpdateRadio = () => {
  const queryClient = useQueryClient();
  return useMutation<Radio, unknown, { id: string; radio: Partial<Radio> }>({
    mutationFn: ({ id, radio }) => updateRadio(id, radio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radios"] });
    },
  });
};

// Hook para deletar rádio (opcional, se quiser usar React Query)
export const useDeleteRadio = () => {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: deleteRadio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radios"] });
    },
  });
};
