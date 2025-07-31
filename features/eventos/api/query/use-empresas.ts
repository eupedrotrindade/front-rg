import { useQuery } from "@tanstack/react-query";
import { Empresa, PaginationParams } from "@/features/eventos/types";
import {
  getEmpresa,
  getEmpresas,
  getAllEmpresas,
  getEmpresasByEvent,
} from "../../actions/get-empresas";

export const useEmpresas = (params?: PaginationParams) => {
  return useQuery<Empresa[] | null>({
    queryKey: ["empresas", params],
    queryFn: async () => {
      const data = await getEmpresas(params);
      return data || [];
    },
  });
};

export const useEmpresa = (id: string) => {
  return useQuery<Empresa | null>({
    queryKey: ["empresa", id],
    queryFn: async () => {
      const data = await getEmpresa(id);
      return data || null;
    },
    enabled: !!id,
  });
};

export const useAllEmpresas = () => {
  return useQuery<Empresa[] | null>({
    queryKey: ["all-empresas"],
    queryFn: async () => {
      const data = await getAllEmpresas();
      return data || [];
    },
  });
};

export const useEmpresasByEvent = (eventId: string) => {
  return useQuery<Empresa[] | null>({
    queryKey: ["empresas-by-event", eventId],
    queryFn: async () => {
      const data = await getEmpresasByEvent(eventId);
      return data || [];
    },
    enabled: !!eventId,
  });
}; 