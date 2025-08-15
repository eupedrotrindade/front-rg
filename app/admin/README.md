# Dashboard Administrativo RG

Sistema completo de administração para gerenciamento de eventos, usuários, operadores e monitoramento do sistema.

## 🚀 Funcionalidades Implementadas

### 🏠 Visão Geral
- Dashboard com métricas em tempo real
- Estatísticas de eventos, usuários, operadores e atividades
- Atividades recentes do sistema
- Métricas consolidadas

### 📅 Gerenciamento de Eventos
- Listagem completa de eventos com filtros avançados
- Configurações específicas por evento através de modal dedicado
- Controle de inscrições (permitir/bloquear novos usuários)
- Definição de operadores e coordenadores por evento
- Controle de acesso por domínios e emails bloqueados
- Configurações de notificações (email, SMS, webhooks)

### 👥 Gerenciamento de Usuários (Clerk)
- Integração completa com Clerk para autenticação
- Listagem de usuários com status em tempo real
- Funcionalidades de banimento/desbloqueio
- Remoção de usuários
- Estatísticas de usuários verificados, online e banidos
- Detalhes completos de cada usuário

### ⚙️ Gerenciamento de Operadores
- Sistema de operadores independente do Clerk
- CRUD completo de operadores
- Atribuição de eventos por operador
- Monitoramento de atividades e ações realizadas
- Status de operadores (ativo, disponível, inativo)
- Histórico de ações por operador

### 📊 Histórico do Sistema
- Visualização completa do event-histories
- Filtros por tipo de entidade, ação, data e usuário
- Timeline de atividades em tempo real
- Detalhes completos de cada atividade
- Estatísticas de atividades por período
- Exportação de dados

## 🔧 Estrutura Técnica

### Arquivos Principais

```
app/admin/
├── layout.tsx                           # Layout com proteção Clerk
├── page.tsx                            # Redirecionamento para dashboard
├── dashboard/
│   ├── page.tsx                        # Dashboard principal com tabs
│   └── components/
│       ├── event-config-modal.tsx      # Modal de configurações de eventos
│       ├── users-management.tsx        # Gerenciamento de usuários Clerk
│       ├── operators-management.tsx    # Gerenciamento de operadores
│       └── system-history-dashboard.tsx # Dashboard de histórico
└── components/
    ├── admin-header.tsx                # Header administrativo
    └── admin-sidebar.tsx               # Sidebar de navegação
```

### APIs Implementadas

```
app/api/admin/
└── users/
    └── route.ts                        # API para gerenciamento de usuários Clerk
```

## 🎯 Como Usar

### 1. Acessando o Dashboard
Navegue para `/admin/dashboard` - o sistema redirecionará automaticamente para login se não autenticado.

### 2. Abas Disponíveis

#### **Visão Geral**
- Métricas consolidadas do sistema
- Atividades recentes
- Status geral da plataforma

#### **Eventos**
- Clique em "Configurar" em qualquer evento para acessar:
  - **Aba Geral**: Controle de inscrições e limites
  - **Aba Operadores**: Adicionar/remover operadores e coordenadores
  - **Aba Controle de Acesso**: Restringir domínios e bloquear emails
  - **Aba Notificações**: Configurar email, SMS e webhooks

#### **Usuários**
- Visualizar todos os usuários autenticados via Clerk
- Banir/desbanir usuários
- Remover usuários do sistema
- Ver detalhes e último acesso

#### **Operadores**
- Criar novos operadores do sistema
- Atribuir eventos específicos
- Monitorar atividades realizadas
- Editar informações e permissões

#### **Sistema**
- Visualizar histórico completo de atividades
- Filtrar por tipo de entidade e ação
- Exportar dados para análise
- Monitorar performance do sistema

### 3. Funcionalidades Avançadas

#### **Configurações de Eventos**
```typescript
// Controle de inscrições
allowNewRegistrations: boolean
maxParticipants: number | null
requireApproval: boolean

// Operadores por evento
operators: [{
  id, name, email, role: 'operator' | 'coordinator'
}]

// Controle de acesso
restrictedAccess: boolean
allowedDomains: string[]
blockedEmails: string[]

// Notificações
emailNotifications: boolean
smsNotifications: boolean
webhookUrl: string
```

#### **Integração com Clerk**
- Autenticação automática
- Gerenciamento de usuários em tempo real
- Sincronização de dados
- Controle de acesso baseado em roles

#### **Sistema de Operadores**
- Independente do Clerk para maior flexibilidade
- Atribuição específica por evento e turno
- Rastreamento de ações realizadas
- Histórico completo de atividades

## 🔐 Segurança

### Autenticação
- Proteção via Clerk em todas as rotas `/admin`
- Middleware de autenticação configurado
- Redirecionamento automático para login

### Autorização
- Verificação de usuário logado em todas as APIs
- Controle de acesso baseado em contexto
- Validação de permissões por operação

### Auditoria
- Todas as ações administrativas são registradas
- Histórico completo no event-histories
- Rastreamento de quem fez o quê e quando

## 🚀 Próximos Passos

### Melhorias Sugeridas
1. **Roles e Permissões**: Implementar sistema de roles mais granular
2. **Notificações Push**: Adicionar notificações em tempo real
3. **Dashboard Analytics**: Gráficos e métricas mais avançadas
4. **Backup/Restore**: Sistema de backup dos dados
5. **API Rate Limiting**: Controle de taxa de requisições
6. **Logs Avançados**: Sistema de logs mais detalhado

### Customizações
- Temas personalizáveis
- Configurações por organização
- Integração com outros sistemas
- Relatórios personalizados

## 📝 Notas Importantes

- O sistema está totalmente integrado com a estrutura existente
- Utiliza as APIs e hooks já implementados
- Mantém compatibilidade com o sistema de operadores atual
- Event-histories são exibidos em tempo real
- Interface responsiva e otimizada para desktop

**Acesso**: `/admin/dashboard`
**Autenticação**: Obrigatória via Clerk
**Permissões**: Administrador do sistema