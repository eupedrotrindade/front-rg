import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Operator } from "@/features/operadores/types";

const getOperatorByCpf = async (cpf: string): Promise<Operator | null> => {
  const { data } = await apiClient.get("/operadores", {
    params: { search: cpf, limit: 1 },
  });
  if (!data.data || !data.data.length) return null;
  return data.data[0] as Operator;
};

export const useOperatorLogin = (cpf: string, enabled = false) => {
  return useQuery<Operator | null>({
    queryKey: ["operator", cpf],
    queryFn: () => getOperatorByCpf(cpf),
    enabled: !!cpf && enabled,
  });
};
