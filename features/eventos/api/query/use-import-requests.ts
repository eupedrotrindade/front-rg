import { useQuery } from "@tanstack/react-query";
import {
  getImportRequestsByEvent,
  getAllImportRequests,
  getImportRequestsByEmpresa,
} from "@/features/eventos/actions/get-import-requests";

export const useImportRequestsByEvent = (eventId: string) => {
  return useQuery({
    queryKey: ["import-requests", "event", eventId],
    queryFn: () => getImportRequestsByEvent(eventId),
    enabled: !!eventId,
  });
};

export const useAllImportRequests = () => {
  return useQuery({
    queryKey: ["import-requests", "all"],
    queryFn: () => getAllImportRequests(),
  });
};

export const useImportRequestsByEmpresa = (empresaId: string) => {
  return useQuery({
    queryKey: ["import-requests", "empresa", empresaId],
    queryFn: () => getImportRequestsByEmpresa(empresaId),
    enabled: !!empresaId,
  });
};
