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
}

export const useEventVehiclesByEvent = ({
  eventId,
  search,
  sortBy = "empresa",
  sortOrder = "asc",
  statusFilter = "all",
  empresaFilter,
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
            vehicle.empresa.toLowerCase().includes(searchLower) ||
            vehicle.placa.toLowerCase().includes(searchLower) ||
            vehicle.modelo.toLowerCase().includes(searchLower) ||
            vehicle.credencial.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Filtro por status
        if (statusFilter !== "all") {
          const isRetirada = statusFilter === "retirada";
          if (vehicle.status !== isRetirada) return false;
        }

        // Filtro por empresa
        if (empresaFilter && empresaFilter !== "all") {
          if (vehicle.empresa !== empresaFilter) return false;
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
