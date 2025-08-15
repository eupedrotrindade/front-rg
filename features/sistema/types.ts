// Types para informações do sistema
export interface SystemInfo {
  version: string
  uptime: string
  lastRestart: string
  environment: 'development' | 'staging' | 'production'
  nodeVersion: string
  dbConnections: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  cpuUsage: number
  diskUsage: {
    used: number
    total: number
    percentage: number
  }
  apiHealth: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    lastCheck: string
  }
}

export interface SystemConfig {
  maintenance: {
    enabled: boolean
    message: string
    allowedUsers: string[]
  }
  security: {
    rateLimiting: boolean
    maxRequestsPerMinute: number
    enableCORS: boolean
    allowedOrigins: string[]
    sessionTimeout: number
  }
  notifications: {
    emailAlerts: boolean
    slackWebhook: string
    discordWebhook: string
    alertThresholds: {
      cpuUsage: number
      memoryUsage: number
      diskUsage: number
      errorRate: number
    }
  }
  backup: {
    enabled: boolean
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
    retentionDays: number
    s3Bucket: string
    lastBackup?: string
  }
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    enableFileLogging: boolean
    maxLogFiles: number
    enableDatabaseLogging: boolean
  }
}

export interface SystemStats {
  totalEvents: number
  totalParticipants: number
  totalUsers: number
  totalOperators: number
  requestsToday: number
  errorsToday: number
  averageResponseTime: number
}

export interface SystemLog {
  id: string
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  source: string
  metadata?: Record<string, any>
}

// Request types
export interface UpdateSystemConfigRequest {
  config: SystemConfig
  performedBy: string
}

export interface SystemBackupRequest {
  type: 'manual' | 'scheduled'
  performedBy: string
}

export interface SystemRestartRequest {
  reason: string
  performedBy: string
}

// Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}