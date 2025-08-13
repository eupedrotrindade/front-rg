import { useQuery } from "@tanstack/react-query";
import { useEventVehicles } from "./use-event-vehicles";
import { EventVehicle } from "@/features/eventos/actions/create-event-vehicle";

interface UseEventVehiclesByEventParams {
  eventId: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  statusFilter?: "all" | "retirada" | "pendente";
  empresaFilter?: string;
  shiftFilter?: string;
}

export const useEventVehiclesByEvent = ({
  eventId,
  search,
  sortBy = "empresa",
  sortOrder = "asc",
  statusFilter = "all",
  empresaFilter,
  shiftFilter,
}: UseEventVehiclesByEventParams) => {
  const {
    data: allVehicles = [],
    isLoading,
    error,
  } = useEventVehicles(eventId);

  const filteredVehicles = Array.isArray(allVehicles)
    ? allVehicles.filter((vehicle) => {
        // Filtro por termo de busca
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch =
            (vehicle.empresa?.toLowerCase().includes(searchLower) || false) ||
            (vehicle.placa?.toLowerCase().includes(searchLower) || false) ||
            (vehicle.modelo?.toLowerCase().includes(searchLower) || false) ||
            (vehicle.tipo_de_credencial?.toLowerCase().includes(searchLower) || false);
          if (!matchesSearch) return false;
        }

        // Filtro por status
        if (statusFilter !== "all") {
          if (vehicle.retirada !== statusFilter) return false;
        }

        // Filtro por empresa
        if (empresaFilter && empresaFilter !== "all") {
          if (vehicle.empresa !== empresaFilter) return false;
        }

        // Filtro por turno (com compatibilidade para campo 'dia')
        if (shiftFilter && shiftFilter !== "all") {
          // Se tem shiftId, usar ele
          if (vehicle.shiftId) {
            if (vehicle.shiftId !== shiftFilter) return false;
          } 
          // Fallback: usar campo 'dia' se disponível
          else if (vehicle.dia) {
            const shiftDate = shiftFilter.split('-').slice(0, 3).join('-'); // Extrair YYYY-MM-DD
            if (vehicle.dia !== shiftDate) return false;
          }
          // Se não tem nem shiftId nem dia, filtrar fora
          else {
            return false;
          }
        }

        return true;
      })
    : [];

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    const aValue = a[sortBy as keyof EventVehicle];
    const bValue = b[sortBy as keyof EventVehicle];

    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === "asc" ? comparison : -comparison;
    }

    if (typeof aValue === "boolean" && typeof bValue === "boolean") {
      const comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
      return sortOrder === "asc" ? comparison : -comparison;
    }

    return 0;
  });

  return {
    data: sortedVehicles,
    isLoading,
    error,
  };
};
