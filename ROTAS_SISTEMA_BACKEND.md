# Rotas do Sistema - Backend

Documentação das rotas que precisam ser implementadas no backend para o sistema de administração.

## 1. GET /system/info
**Descrição**: Retorna informações do sistema em tempo real

**Response**:
```json
{
  "version": "2.1.0",
  "uptime": "15 dias, 8 horas",
  "lastRestart": "2024-01-01T00:00:00Z",
  "environment": "production",
  "nodeVersion": "18.17.0",
  "dbConnections": 25,
  "memoryUsage": {
    "used": 1.2,
    "total": 4.0,
    "percentage": 30
  },
  "cpuUsage": 15,
  "diskUsage": {
    "used": 120,
    "total": 500,
    "percentage": 24
  },
  "apiHealth": {
    "status": "healthy",
    "responseTime": 150,
    "lastCheck": "2024-01-15T10:30:00Z"
  }
}
```

**Implementação necessária**:
- Usar `process.uptime()` para uptime
- Usar `process.version` para nodeVersion
- Usar `process.memoryUsage()` para memória
- Usar bibliotecas como `systeminformation` ou `os` para CPU e disco
- Verificar conexões do banco de dados
- Verificar saúde da API

## 2. GET /system/config
**Descrição**: Retorna configurações atuais do sistema

**Response**:
```json
{
  "maintenance": {
    "enabled": false,
    "message": "Sistema em manutenção. Voltaremos em breve.",
    "allowedUsers": []
  },
  "security": {
    "rateLimiting": true,
    "maxRequestsPerMinute": 60,
    "enableCORS": true,
    "allowedOrigins": ["https://example.com"],
    "sessionTimeout": 24
  },
  "notifications": {
    "emailAlerts": true,
    "slackWebhook": "",
    "discordWebhook": "",
    "alertThresholds": {
      "cpuUsage": 80,
      "memoryUsage": 85,
      "diskUsage": 90,
      "errorRate": 5
    }
  },
  "backup": {
    "enabled": true,
    "frequency": "daily",
    "retentionDays": 30,
    "s3Bucket": "rg-system-backups",
    "lastBackup": "2024-01-15T02:00:00Z"
  },
  "logging": {
    "level": "info",
    "enableFileLogging": true,
    "maxLogFiles": 10,
    "enableDatabaseLogging": true
  }
}
```

**Implementação necessária**:
- Armazenar configurações em banco de dados
- Arquivo de configuração JSON/YAML
- Variáveis de ambiente para configurações sensíveis

## 3. PUT /system/config
**Descrição**: Atualiza configurações do sistema

**Request Body**:
```json
{
  "config": {
    // Objeto de configuração completo
  },
  "performedBy": "user_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Configurações atualizadas com sucesso"
}
```

**Implementação necessária**:
- Validação das configurações
- Aplicação imediata de algumas configurações
- Log da alteração
- Backup da configuração anterior

## 4. GET /system/stats
**Descrição**: Retorna estatísticas gerais do sistema

**Response**:
```json
{
  "totalEvents": 150,
  "totalParticipants": 5200,
  "totalUsers": 45,
  "totalOperators": 12,
  "requestsToday": 15847,
  "errorsToday": 23,
  "averageResponseTime": 145
}
```

**Implementação necessária**:
- Consultas agregadas no banco de dados
- Cache para performance
- Métricas de API (requests, errors, response time)

## 5. GET /system/health
**Descrição**: Verifica saúde do sistema

**Response**:
```json
{
  "status": "healthy", // "healthy" | "degraded" | "down"
  "checks": {
    "database": {
      "status": true,
      "message": "Conectado",
      "responseTime": 25
    },
    "redis": {
      "status": true,
      "message": "Conectado",
      "responseTime": 5
    },
    "storage": {
      "status": true,
      "message": "Espaço disponível",
      "responseTime": 10
    },
    "external_apis": {
      "status": true,
      "message": "APIs externas respondendo",
      "responseTime": 200
    }
  }
}
```

**Implementação necessária**:
- Health checks de todos os serviços
- Timeout para cada verificação
- Status agregado baseado nos checks individuais

## 6. GET /system/logs
**Descrição**: Retorna logs do sistema com filtros

**Query Parameters**:
- `page` (number): Página
- `limit` (number): Limite por página
- `level` (string): Nível do log (error, warn, info, debug)
- `source` (string): Origem do log
- `startDate` (string): Data inicial
- `endDate` (string): Data final

**Response**:
```json
{
  "data": [
    {
      "id": "log_123",
      "timestamp": "2024-01-15T10:30:00Z",
      "level": "info",
      "message": "Sistema inicializado com sucesso",
      "source": "server",
      "metadata": {
        "userId": "user_123",
        "ip": "192.168.1.1"
      }
    }
  ],
  "total": 1500
}
```

**Implementação necessária**:
- Sistema de logging estruturado
- Índices no banco para performance
- Filtros eficientes

## 7. GET /system/logs/export
**Descrição**: Exporta logs do sistema

**Query Parameters**: Mesmos do GET /system/logs

**Response**: Arquivo de texto com logs

**Implementação necessária**:
- Geração de arquivo de texto
- Streaming para arquivos grandes
- Compressão opcional

## 8. POST /system/restart
**Descrição**: Reinicia o sistema

**Request Body**:
```json
{
  "reason": "Aplicação de configurações",
  "performedBy": "user_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Reinicialização iniciada"
}
```

**Implementação necessária**:
- Log da operação
- Notificação para outros serviços
- Graceful shutdown
- PM2 ou similar para restart

## 9. POST /system/backup
**Descrição**: Cria backup manual do sistema

**Request Body**:
```json
{
  "type": "manual",
  "performedBy": "user_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Backup iniciado",
  "backupId": "backup_123"
}
```

**Implementação necessária**:
- Backup do banco de dados
- Backup de arquivos importantes
- Upload para S3 ou storage
- Log da operação

## Bibliotecas Recomendadas

### Para Informações do Sistema:
```bash
npm install systeminformation
npm install node-disk-info
npm install pidusage
```

### Para Logging:
```bash
npm install winston
npm install morgan  # Para logs HTTP
```

### Para Health Checks:
```bash
npm install node-cron  # Para checks periódicos
```

### Para Backup:
```bash
npm install pg_dump  # Para PostgreSQL
npm install mysqldump  # Para MySQL
npm install aws-sdk  # Para S3
```

## Estrutura de Pastas Sugerida:

```
/routes
  /system
    - info.js
    - config.js
    - stats.js
    - health.js
    - logs.js
    - backup.js
    - restart.js

/services
  /system
    - systemInfo.js
    - healthCheck.js
    - backup.js
    - logging.js

/middleware
  - systemMiddleware.js  # Para configurações dinâmicas
  - healthCheck.js       # Para health checks automáticos
```

## Exemplo de Implementação Básica:

### systemInfo.js
```javascript
const os = require('os');
const si = require('systeminformation');

class SystemInfoService {
  async getSystemInfo() {
    const [cpu, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize()
    ]);

    return {
      version: process.env.APP_VERSION || '1.0.0',
      uptime: this.formatUptime(process.uptime()),
      lastRestart: new Date(Date.now() - process.uptime() * 1000),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      dbConnections: await this.getDbConnections(),
      memoryUsage: {
        used: Math.round(mem.used / 1024 / 1024 / 1024 * 100) / 100,
        total: Math.round(mem.total / 1024 / 1024 / 1024 * 100) / 100,
        percentage: Math.round(mem.used / mem.total * 100)
      },
      cpuUsage: Math.round(cpu.currentLoad),
      diskUsage: this.getDiskUsage(disk)
    };
  }

  formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    return `${days} dias, ${hours} horas`;
  }

  async getDbConnections() {
    // Implementar contagem de conexões do banco
    return 0;
  }

  getDiskUsage(disks) {
    const mainDisk = disks[0];
    return {
      used: Math.round(mainDisk.used / 1024 / 1024 / 1024 * 100) / 100,
      total: Math.round(mainDisk.size / 1024 / 1024 / 1024 * 100) / 100,
      percentage: Math.round(mainDisk.used / mainDisk.size * 100)
    };
  }
}

module.exports = SystemInfoService;
```

## Próximos Passos:

1. **Implementar rotas básicas** com dados mock primeiro
2. **Adicionar bibliotecas de sistema** para dados reais
3. **Implementar sistema de configuração** dinâmica
4. **Adicionar sistema de logging** estruturado
5. **Implementar health checks** automáticos
6. **Configurar backups** automáticos
7. **Adicionar monitoramento** e alertas
8. **Testar em ambiente de produção**