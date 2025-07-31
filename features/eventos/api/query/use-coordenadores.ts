import { useQuery } from "@tanstack/react-query";
import { Coordenador, PaginationParams } from "@/features/eventos/types";
import {
  getCoordenador,
  getCoordenadores,
  getAllCoordenadores,
} from "../../actions/get-coordenadores";

export const useCoordenadores = (
  eventId: string,
  params?: PaginationParams
) => {
  return useQuery<Coordenador[]>({
    queryKey: ["coordenadores", eventId, params],
    queryFn: async () => {
      const data = await getCoordenadores(eventId, params);
      // Garantir que sempre retorne um array
      return Array.isArray(data) ? data : [];
    },
    enabled: !!eventId,
  });
};

export const useCoordenador = (id: string) => {
  return useQuery<Coordenador | null>({
    queryKey: ["coordenador", id],
    queryFn: async () => {
      const data = await getCoordenador(id);
      return data || null;
    },
    enabled: !!id,
  });
};

export const useAllCoordenadores = () => {
  return useQuery<Coordenador[]>({
    queryKey: ["all-coordenadores"],
    queryFn: async () => {
      const data = await getAllCoordenadores();
      // Garantir que sempre retorne um array
      return Array.isArray(data) ? data : [];
    },
  });
};
