import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getSystemInfo, 
  getSystemConfig, 
  updateSystemConfig, 
  getSystemStats, 
  getSystemLogs, 
  restartSystem, 
  createSystemBackup, 
  exportSystemLogs,
  getSystemHealth
} from "../../actions/get-system-info"
import { SystemConfig } from "../../types"

// Hook para informações do sistema
export const useSystemInfo = () => {
  return useQuery({
    queryKey: ["system-info"],
    queryFn: getSystemInfo,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 10000, // Considera stale após 10 segundos
    retry: 3,
  })
}

// Hook para configurações do sistema
export const useSystemConfig = () => {
  return useQuery({
    queryKey: ["system-config"],
    queryFn: getSystemConfig,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  })
}

// Hook para estatísticas do sistema
export const useSystemStats = () => {
  return useQuery({
    queryKey: ["system-stats"],
    queryFn: getSystemStats,
    refetchInterval: 60000, // Atualiza a cada minuto
    staleTime: 30000, // 30 segundos
    retry: 2,
  })
}

// Hook para logs do sistema
export const useSystemLogs = (params?: {
  page?: number
  limit?: number
  level?: string
  source?: string
  startDate?: string
  endDate?: string
}) => {
  return useQuery({
    queryKey: ["system-logs", params],
    queryFn: () => getSystemLogs(params),
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 2,
  })
}

// Hook para saúde do sistema
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: getSystemHealth,
    refetchInterval: 15000, // Atualiza a cada 15 segundos
    staleTime: 5000, // 5 segundos
    retry: 3,
  })
}

// Mutation para atualizar configurações
export const useUpdateSystemConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ config, performedBy }: { config: SystemConfig; performedBy: string }) =>
      updateSystemConfig(config, performedBy),
    onSuccess: () => {
      // Invalidar cache das configurações
      queryClient.invalidateQueries({ queryKey: ["system-config"] })
      // Também invalida info do sistema que pode ter mudado
      queryClient.invalidateQueries({ queryKey: ["system-info"] })
    },
    onError: (error) => {
      console.error("Erro ao atualizar configurações:", error)
    },
  })
}

// Mutation para reiniciar sistema
export const useRestartSystem = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ reason, performedBy }: { reason: string; performedBy: string }) =>
      restartSystem(reason, performedBy),
    onSuccess: () => {
      // Invalidar todos os caches pois o sistema vai reiniciar
      queryClient.invalidateQueries()
    },
    onError: (error) => {
      console.error("Erro ao reiniciar sistema:", error)
    },
  })
}

// Mutation para backup manual
export const useCreateSystemBackup = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ performedBy }: { performedBy: string }) =>
      createSystemBackup(performedBy),
    onSuccess: () => {
      // Invalidar configurações para atualizar data do último backup
      queryClient.invalidateQueries({ queryKey: ["system-config"] })
      queryClient.invalidateQueries({ queryKey: ["system-info"] })
    },
    onError: (error) => {
      console.error("Erro ao criar backup:", error)
    },
  })
}

// Mutation para exportar logs
export const useExportSystemLogs = () => {
  return useMutation({
    mutationFn: (params?: { startDate?: string; endDate?: string; level?: string }) =>
      exportSystemLogs(params),
    onError: (error) => {
      console.error("Erro ao exportar logs:", error)
    },
  })
}