import apiClient from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RadioAssignment,
  RadioAssignmentListResponse,
  RadioAssignmentFilters,
  CreateRadioAssignmentData,
  UpdateRadioAssignmentData,
  PartialReturnData,
  RadioExchangeData,
  AvailableRadiosResponse,
  RadioOperationsResponse,
} from "@/app/(workspaces)/eventos/[id]/radios/types";

// ========================================
// QUERIES
// ========================================

// Buscar rádios disponíveis por evento e estágio
export const useAvailableRadios = (eventId: string, stage?: string) => {
  return useQuery({
    queryKey: ["available-radios", eventId, stage],
    queryFn: async (): Promise<AvailableRadiosResponse> => {
      const params = new URLSearchParams();
      if (stage) params.append("stage", stage);
      
      const queryString = params.toString();
      const url = `/radios/available/${eventId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: !!eventId,
  });
};

// Buscar atribuições de rádios
export const useRadioAssignments = (
  filters: RadioAssignmentFilters,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["radio-assignments", filters],
    queryFn: async (): Promise<RadioAssignmentListResponse> => {
      const params = new URLSearchParams();

      if (filters.eventId) params.append("eventId", filters.eventId);
      if (filters.eventDay) params.append("eventDay", filters.eventDay);
      if (filters.status) params.append("status", filters.status);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.search) params.append("search", filters.search);

      const response = await apiClient.get(
        `/radios/assignments?${params.toString()}`
      );
      return response.data;
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!filters.eventId, // Só precisa do eventId, eventDay é opcional
  });
};

// Buscar operações de uma atribuição específica
export const useRadioOperations = (assignmentId: string) => {
  return useQuery({
    queryKey: ["radio-operations", assignmentId],
    queryFn: async (): Promise<RadioOperationsResponse> => {
      const response = await apiClient.get(
        `/radios/assignments/${assignmentId}/operations`
      );
      return response.data;
    },
    enabled: !!assignmentId,
  });
};

// Buscar todas as atribuições de um evento (para contadores)
export const useAllRadioAssignments = (eventId: string) => {
  return useQuery({
    queryKey: ["all-radio-assignments", eventId],
    queryFn: async (): Promise<RadioAssignmentListResponse> => {
      const params = new URLSearchParams();
      params.append("eventId", eventId);

      const response = await apiClient.get(
        `/radios/assignments?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!eventId,
  });
};

// ========================================
// MUTATIONS
// ========================================

// Criar nova atribuição de rádios
export const useCreateRadioAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateRadioAssignmentData
    ): Promise<RadioAssignment> => {
      const response = await apiClient.post("/radios/assignments", data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["radio-assignments"] });
      queryClient.invalidateQueries({
        queryKey: ["available-radios", data.event_id],
      });
    },
  });
};

// Atualizar atribuição (devolução total)
export const useUpdateRadioAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRadioAssignmentData;
    }): Promise<RadioAssignment> => {
      const response = await apiClient.put(`/radios/assignments/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["radio-assignments"] });
      queryClient.invalidateQueries({
        queryKey: ["available-radios", data.event_id],
      });
    },
  });
};

// Devolução parcial
export const usePartialReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: PartialReturnData
    ): Promise<{ message: string }> => {
      console.log("Dados sendo enviados para devolução parcial:", data);
      console.log(
        "Tipo de returned_radio_codes:",
        typeof data.returned_radio_codes
      );
      console.log("É array?", Array.isArray(data.returned_radio_codes));
      console.log("Conteúdo:", data.returned_radio_codes);

      const response = await apiClient.post(
        `/radios/assignments/${data.assignment_id}/partial-return`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["radio-assignments"] });
      queryClient.invalidateQueries({
        queryKey: ["radio-operations", variables.assignment_id],
      });
    },
  });
};

// Troca de rádios
export const useRadioExchange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: RadioExchangeData
    ): Promise<{ message: string }> => {
      const response = await apiClient.post(
        `/radios/assignments/${data.assignment_id}/exchange`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["radio-assignments"] });
      queryClient.invalidateQueries({
        queryKey: ["radio-operations", variables.assignment_id],
      });
    },
  });
};

// Importar rádios em massa
export const useImportRadios = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      event_id: string;
      radio_codes: string[];
      status?: string;
    }): Promise<{ message: string; imported: number }> => {
      const response = await apiClient.post("/radios/import", data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["available-radios", variables.event_id],
      });
    },
  });
};

// ========================================
// HOOKS UTILITÁRIOS
// ========================================

// Hook para obter atribuições por dia específico
export const useRadioAssignmentsByDay = (
  eventId: string,
  eventDay: string,
  options?: { enabled?: boolean }
) => {
  return useRadioAssignments(
    {
      eventId,
      eventDay,
      limit: 100, // Buscar mais registros para o dia
    },
    options
  );
};

// Hook para obter atribuições ativas por dia
export const useActiveRadioAssignmentsByDay = (
  eventId: string,
  eventDay: string
) => {
  return useRadioAssignments({
    eventId,
    eventDay,
    status: "ativo",
    limit: 100,
  });
};

// Hook para obter atribuições pendentes por dia
export const usePendingRadioAssignmentsByDay = (
  eventId: string,
  eventDay: string
) => {
  return useRadioAssignments({
    eventId,
    eventDay,
    status: "ativo",
    limit: 100,
  });
};

// Exportar hooks de mutations
export { useCreateMultipleRadios } from "./api/mutation/use-radio-mutations";
