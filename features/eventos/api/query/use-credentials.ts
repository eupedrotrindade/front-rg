import { useQuery } from "@tanstack/react-query";
import { Credential } from "@/features/eventos/types";
import { apiClient } from "@/lib/api-client";

interface UseCredentialsParams {
  eventId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const useCredentials = ({
  eventId,
  search,
  sortBy = "nome",
  sortOrder = "asc",
}: UseCredentialsParams = {}) => {
  return useQuery<Credential[]>({
    queryKey: ["credentials", { eventId, search, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (sortBy) params.append("sortBy", sortBy);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const { data } = await apiClient.get<Credential[]>(
        eventId ? `/credentials/event/${eventId}` : "/credentials",
        { params }
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !eventId || !!eventId,
  });
};

export const useCredential = (id: string) => {
  return useQuery<Credential>({
    queryKey: ["credentials", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Credential>(`/credentials/${id}`);
      return data;
    },
    enabled: !!id,
  });
}; 