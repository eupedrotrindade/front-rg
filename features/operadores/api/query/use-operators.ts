import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Operator } from "@/features/operadores/types";
import { ApiResponse } from "@/features/eventos/types";

const getAllOperators = async (): Promise<Operator[]> => {
  const allOperators: Operator[] = [];
  let currentPage = 1;
  let hasNext = true;

  while (hasNext) {
    try {
      const { data } = await apiClient.get<ApiResponse<Operator[]>>(
        "/operadores",
        {
          params: {
            page: currentPage,
            limit: 100, // Buscar o máximo possível por página
          },
        }
      );

      if (!data.data || !Array.isArray(data.data)) {
        console.warn(`Página ${currentPage}: dados inválidos`, data);
        break;
      }

      allOperators.push(...data.data);

      // Verificar se há próxima página
      if (data.pagination) {
        hasNext = data.pagination.page < data.pagination.totalPages;
        currentPage++;
      } else {
        // Se não há informações de paginação, assumir que é a última página
        hasNext = false;
      }

      console.log(
        `📄 Página ${currentPage - 1}: ${
          data.data.length
        } operadores encontrados`
      );

      // Proteção contra loop infinito
      if (currentPage > 100) {
        console.warn("❌ Limite de páginas atingido (100), parando busca");
        break;
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar página ${currentPage}:`, error);
      break;
    }
  }

  console.log(`✅ Total de operadores carregados: ${allOperators.length}`);
  return allOperators;
};

export const useOperators = () => {
  return useQuery<Operator[]>({
    queryKey: ["operators"],
    queryFn: getAllOperators,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};
