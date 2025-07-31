import { useQuery } from "@tanstack/react-query";
import { Radio, RadioFilters } from "../../types";
import { getRadios, getRadio } from "../../actions/radio-actions";

export const useRadios = (filters?: RadioFilters) => {
  return useQuery({
    queryKey: ["radios", filters],
    queryFn: async () => {
      const data = await getRadios(filters);
      // Garantir que sempre retorne um array
      const radios = data?.data;
      return Array.isArray(radios) ? radios : [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!filters?.eventId, // Só executa se tiver eventId
  });
};

export const useRadio = (id: string) => {
  return useQuery({
    queryKey: ["radio", id],
    queryFn: async () => {
      const data = await getRadio(id);
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
