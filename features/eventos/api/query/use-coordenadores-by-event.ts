import { useQuery } from "@tanstack/react-query";
import { useAllCoordenadores } from "./use-coordenadores";
import { Coordenador } from "@/features/eventos/types";

interface UseCoordenadoresByEventParams {
  eventId: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const useCoordenadoresByEvent = ({
  eventId,
  search,
  sortBy = "firstName",
  sortOrder = "asc",
}: UseCoordenadoresByEventParams) => {
  const {
    data: allCoordenadores = [],
    isLoading,
    error,
  } = useAllCoordenadores() ?? { data: [], isLoading: false, error: null };

  const filteredCoordenadores = (allCoordenadores ?? []).filter(
    (coordenador: Coordenador) => {
      // Verificar se o coordenador tem metadata e eventos
      if (
        !coordenador.metadata?.eventos ||
        !Array.isArray(coordenador.metadata.eventos)
      ) {
        return false;
      }

      // Filtrar por evento - verificar se o coordenador está associado ao evento
      const eventosDoCoordenador = coordenador.metadata.eventos;
      const isAssociatedWithEvent = eventosDoCoordenador.some(
        (evento) => String(evento.id) === String(eventId)
      );

      if (!isAssociatedWithEvent) {
        return false;
      }

      // Filtrar por busca
      if (search) {
        const searchLower = search.toLowerCase();
        const fullName =
          `${coordenador.firstName} ${coordenador.lastName}`.toLowerCase();
        const matchesSearch =
          fullName.includes(searchLower) ||
          coordenador.email.toLowerCase().includes(searchLower);
        return matchesSearch;
      }
      return true;
    }
  );

  const sortedCoordenadores = [...filteredCoordenadores].sort((a, b) => {
    const aValue = a[sortBy as keyof Coordenador];
    const bValue = b[sortBy as keyof Coordenador];
    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === "asc" ? comparison : -comparison;
    }
    return 0;
  });

  return {
    data: sortedCoordenadores,
    isLoading,
    error,
  };
};
