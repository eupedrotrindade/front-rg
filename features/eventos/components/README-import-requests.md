# Sistema de Solicitação de Importação

## Visão Geral

O sistema de solicitação de importação permite que empresas solicitem a importação de participantes através de arquivos Excel, que são revisados e aprovados por administradores antes de serem incorporados ao evento.

## Funcionalidades

### Para Empresas

- **Upload de arquivo Excel**: Envio de planilha com dados dos participantes
- **Validação automática**: Verificação de dados obrigatórios e formato
- **Acompanhamento**: Visualização do status das solicitações
- **Modelo de template**: Download de arquivo modelo para preenchimento

### Para Administradores

- **Dashboard de solicitações**: Lista todas as solicitações pendentes
- **Aprovação/Rejeição**: Controle sobre quais importações são aceitas
- **Detalhes completos**: Visualização de erros, duplicatas e itens faltantes
- **Estatísticas**: Resumo de solicitações por status

## Estrutura de Dados

### Modelo de Template Excel

```excel
| nome | cpf | funcao | empresa | credencial |
|------|-----|--------|---------|------------|
| João Silva | 12345678900 | Desenvolvedor | Empresa ABC | CREDENCIAL-001 |
```

### Campos Obrigatórios

- **nome**: Nome completo do participante
- **empresa**: Nome da empresa
- **funcao**: Função/cargo do participante
- **cpf OU rg**: Pelo menos um documento de identificação

### Campos Opcionais

- **credencial**: Tipo de credencial (será criada automaticamente se não existir)
- **email**: Email do participante
- **phone**: Telefone do participante

## Fluxo de Trabalho

1. **Upload do Arquivo**

   - Empresa faz upload do arquivo Excel
   - Sistema valida formato e dados obrigatórios
   - Gera relatório de validação

2. **Criação da Solicitação**

   - Sistema cria solicitação com status "pending"
   - Armazena dados processados e estatísticas
   - Notifica administradores

3. **Revisão Administrativa**

   - Administrador visualiza detalhes da solicitação
   - Analisa erros, duplicatas e itens faltantes
   - Decide aprovar ou rejeitar

4. **Aprovação/Rejeição**
   - Se aprovada: dados são importados automaticamente
   - Se rejeitada: solicitação fica com status "rejected"
   - Notificação é enviada para a empresa

## API Endpoints

### Criar Solicitação

```
POST /import-requests
```

### Listar Solicitações por Evento

```
GET /import-requests/event/:eventId
```

### Listar Todas as Solicitações (Admin)

```
GET /import-requests
```

### Aprovar Solicitação

```
PATCH /import-requests/:id/approve
```

### Rejeitar Solicitação

```
PATCH /import-requests/:id/reject
```

### Marcar como Concluída

```
PATCH /import-requests/:id/complete
```

## Componentes Frontend

### ImportRequestsDashboard

Dashboard administrativo para gerenciar solicitações:

- Lista todas as solicitações
- Estatísticas por status
- Ações de aprovação/rejeição
- Visualização detalhada

### Página de Import/Export

Interface para empresas:

- Upload de arquivos
- Validação em tempo real
- Criação de solicitações
- Acompanhamento de status

## Validações

### Validação de CPF/RG

- Aceita qualquer formato (será normalizado)
- Mínimo 8, máximo 14 dígitos
- Pelo menos um documento é obrigatório

### Validação de Dados

- Nome: mínimo 2 caracteres
- Empresa: mínimo 2 caracteres
- Função: mínimo 2 caracteres

### Verificação de Duplicatas

- Verifica CPF/RG duplicados no sistema
- Verifica duplicatas dentro do arquivo
- Relata todas as duplicatas encontradas

## Status das Solicitações

- **pending**: Aguardando aprovação
- **approved**: Aprovada pelo administrador
- **rejected**: Rejeitada pelo administrador
- **completed**: Importação concluída

## Configurações

### Tamanho de Lote

- Padrão: 25 participantes por lote
- Configurável: 10, 25, 50, 100

### Pausas entre Operações

- Entre lotes: 2 segundos (configurável)
- Entre itens: 100ms (configurável)

### Limites

- Máximo 5000 participantes por importação
- Arquivos Excel (.xlsx, .xls) apenas

## Notificações

### Toast Messages

- Sucesso na criação de solicitação
- Erro durante processamento
- Aprovação/rejeição de solicitação
- Conclusão de importação

### Estados de Loading

- Processamento de arquivo
- Criação de solicitação
- Aprovação/rejeição
- Importação em lote

## Segurança

### Validação de Dados

- Sanitização de entrada
- Validação de tipos
- Verificação de tamanhos

### Controle de Acesso

- Apenas administradores podem aprovar/rejeitar
- Empresas só veem suas próprias solicitações
- Logs de todas as operações

## Monitoramento

### Logs

- Criação de solicitações
- Aprovações/rejeições
- Erros de processamento
- Importações concluídas

### Métricas

- Número de solicitações por status
- Tempo médio de aprovação
- Taxa de rejeição
- Participantes importados por período
