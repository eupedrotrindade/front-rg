import { useQuery } from "@tanstack/react-query";
import { useOperators } from "./use-operators";
import { Operator } from "@/features/operadores/types";

interface UseOperatorsByEventParams {
  eventId: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const useOperatorsByEvent = ({
  eventId,
  search,
  sortBy = "nome",
  sortOrder = "asc",
}: UseOperatorsByEventParams) => {
  const { data: allOperators = [], isLoading, error } = useOperators();

  // Filtrar operadores por evento
  const filteredOperators = allOperators.filter((operator) => {
    // Verificar se o operador está associado ao evento
    const eventIds =
      operator.id_events?.split(",").map((id: string) => id.trim()) || [];
    
    // Verificar se está associado ao evento (com ou sem data específica)
    const isAssociatedWithEvent = eventIds.some((eventAssignment: string) => {
      // Se contém ":", significa que tem data específica (formato: eventId:date)
      if (eventAssignment.includes(":")) {
        const [eventIdFromAssignment] = eventAssignment.split(":");
        return eventIdFromAssignment === eventId;
      }
      // Se não contém ":", é o formato antigo (apenas eventId)
      return eventAssignment === eventId;
    });

    // Aplicar filtro de busca se fornecido
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        operator.nome?.toLowerCase().includes(searchLower) ||
        operator.cpf?.includes(search);

      return isAssociatedWithEvent && matchesSearch;
    }

    return isAssociatedWithEvent;
  });

  // Ordenar resultados
  const sortedOperators = [...filteredOperators].sort((a, b) => {
    const aValue = a[sortBy as keyof Operator];
    const bValue = b[sortBy as keyof Operator];

    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === "asc" ? comparison : -comparison;
    }

    return 0;
  });

  return {
    data: sortedOperators,
    isLoading,
    error,
  };
};
