import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export interface ConfiguracaoGeral {
  id: string;
  senha_padrao_operadores: string;
  horario_diurno_inicio: string;
  horario_diurno_fim: string;
  horario_noturno_inicio: string;
  horario_noturno_fim: string;
  lista_negra: string[];
  createdAt: string;
  updatedAt: string;
}

// Hook para buscar configuração geral atual
export const useConfiguracaoGeral = () => {
  return useQuery({
    queryKey: ["configuracao-geral"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ConfiguracaoGeral }>("/configuracoes-gerais");
      return response.data.data;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

// Hook para buscar apenas a senha padrão (mais leve)
export const useDefaultPassword = () => {
  return useQuery({
    queryKey: ["configuracao-geral", "default-password"],
    queryFn: async () => {
      const response = await apiClient.get<{ defaultPassword: string }>("/configuracoes-gerais/default-password");
      return response.data.defaultPassword;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutos - senha padrão não muda com frequência
  });
};

// Hook para verificar se CPF está na lista negra
export const useCheckBlacklist = (cpf: string) => {
  return useQuery({
    queryKey: ["configuracao-geral", "blacklist", cpf],
    queryFn: async () => {
      if (!cpf || cpf.length !== 11) {
        return { isBlacklisted: false, cpf };
      }
      
      const response = await apiClient.get<{ 
        isBlacklisted: boolean; 
        cpf: string; 
      }>(`/configuracoes-gerais/blacklist/${cpf}`);
      return response.data;
    },
    enabled: !!cpf && cpf.length === 11, // Só executa se CPF estiver no formato correto
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

// Hook para buscar configurações de horário
export const useScheduleConfig = () => {
  return useQuery({
    queryKey: ["configuracao-geral", "schedule"],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: {
          diurno: { inicio: string; fim: string };
          noturno: { inicio: string; fim: string };
        };
      }>("/configuracoes-gerais/schedule");
      return response.data.data;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
};