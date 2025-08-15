import { apiClient } from '@/lib/api-client'
import { SystemInfo, SystemConfig, SystemStats, SystemLog } from '../types'

export const getSystemInfo = async (): Promise<SystemInfo | null> => {
  try {
    console.log('🔍 Buscando informações do sistema')
    const { data } = await apiClient.get<SystemInfo>('/system/info')
    console.log('📊 Informações do sistema recebidas:', data)
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar informações do sistema:', error)
    return null
  }
}

export const getSystemConfig = async (): Promise<SystemConfig | null> => {
  try {
    console.log('🔍 Buscando configurações do sistema')
    const { data } = await apiClient.get<SystemConfig>('/system/config')
    console.log('⚙️ Configurações do sistema recebidas:', data)
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar configurações do sistema:', error)
    return null
  }
}

export const updateSystemConfig = async (config: SystemConfig, performedBy: string): Promise<boolean> => {
  try {
    console.log('💾 Salvando configurações do sistema:', config)
    await apiClient.put('/system/config', { config, performedBy })
    console.log('✅ Configurações salvas com sucesso')
    return true
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error)
    return false
  }
}

export const getSystemStats = async (): Promise<SystemStats | null> => {
  try {
    console.log('📈 Buscando estatísticas do sistema')
    const { data } = await apiClient.get<SystemStats>('/system/stats')
    console.log('📊 Estatísticas recebidas:', data)
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error)
    return null
  }
}

export const getSystemLogs = async (
  params?: {
    page?: number
    limit?: number
    level?: string
    source?: string
    startDate?: string
    endDate?: string
  }
): Promise<{ data: SystemLog[]; total: number } | null> => {
  try {
    console.log('📋 Buscando logs do sistema com params:', params)
    const { data } = await apiClient.get<{ data: SystemLog[]; total: number }>('/system/logs', {
      params
    })
    console.log('📄 Logs recebidos:', data)
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar logs:', error)
    return null
  }
}

export const restartSystem = async (reason: string, performedBy: string): Promise<boolean> => {
  try {
    console.log('🔄 Reiniciando sistema:', { reason, performedBy })
    await apiClient.post('/system/restart', { reason, performedBy })
    console.log('✅ Reinicialização iniciada')
    return true
  } catch (error) {
    console.error('❌ Erro ao reiniciar sistema:', error)
    return false
  }
}

export const createSystemBackup = async (performedBy: string): Promise<boolean> => {
  try {
    console.log('💾 Criando backup manual do sistema')
    await apiClient.post('/system/backup', { type: 'manual', performedBy })
    console.log('✅ Backup iniciado')
    return true
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error)
    return false
  }
}

export const exportSystemLogs = async (params?: {
  startDate?: string
  endDate?: string
  level?: string
}): Promise<Blob | null> => {
  try {
    console.log('📥 Exportando logs do sistema')
    const response = await apiClient.get('/system/logs/export', {
      params,
      responseType: 'blob'
    })
    console.log('✅ Logs exportados')
    return response.data
  } catch (error) {
    console.error('❌ Erro ao exportar logs:', error)
    return null
  }
}

export const getSystemHealth = async (): Promise<{
  status: 'healthy' | 'degraded' | 'down'
  checks: Record<string, { status: boolean; message: string; responseTime?: number }>
} | null> => {
  try {
    console.log('🏥 Verificando saúde do sistema')
    const { data } = await apiClient.get('/system/health')
    console.log('💚 Status de saúde recebido:', data)
    return data
  } catch (error) {
    console.error('❌ Erro ao verificar saúde do sistema:', error)
    return null
  }
}