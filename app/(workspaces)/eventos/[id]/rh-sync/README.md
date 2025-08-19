# Sincronização RH - Sistema de Eventos

## Visão Geral

A funcionalidade de Sincronização RH permite enviar dados completos de eventos (participantes, check-ins, check-outs, tempo de trabalho, etc.) para sistemas de Recursos Humanos externos.

## Funcionalidades

### Dados Sincronizados

A sincronização inclui os seguintes dados:

1. **Dados do Evento**
   - ID, nome, descrição
   - Datas de início e fim
   - Local e endereço
   - Status do evento

2. **Participantes (Staff Geral)**
   - Informações pessoais (nome, CPF, email, telefone)
   - Cargo e empresa
   - Registros de check-in/check-out
   - Confirmação de presença
   - Dias de trabalho

3. **Registros de Ponto**
   - Check-ins e check-outs detalhados
   - Data e horário dos registros
   - Etapa de trabalho (montagem, evento, desmontagem)
   - Período de trabalho (diurno, noturno)

4. **Operadores**
   - Staff operacional
   - Permissões e supervisores
   - Dados de contato

5. **Veículos**
   - Placas, modelos, motoristas
   - Horários de entrada e saída

6. **Tempo de Trabalho Calculado**
   - Horas trabalhadas por participante
   - Totalização por dia e período
   - Resumo geral de horas

## Como Usar

1. **Acesse a página de sincronização**
   - Navegue até: `/eventos/[id]/rh-sync`
   - Exemplo: `/eventos/123/rh-sync`

2. **Revise os dados**
   - Verifique as estatísticas exibidas
   - Confirme os totais de participantes, registros, etc.

3. **Execute a sincronização**
   - Clique no botão "Sincronizar com RH"
   - Aguarde a confirmação de sucesso

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env.local`:

```env
# URL do webhook/API do sistema RH
RH_SYSTEM_WEBHOOK_URL=https://seu-sistema-rh.com/api/webhook

# Chave de autenticação do sistema RH
RH_SYSTEM_API_KEY=sua_chave_api_aqui

# Email para notificações (opcional)
RH_NOTIFICATION_EMAIL=rh@suaempresa.com
```

### Métodos de Integração

O endpoint `/api/rh-sync` suporta diferentes métodos de integração:

#### 1. Webhook/API REST
```typescript
// Configuração automática via variáveis de ambiente
const response = await fetch(process.env.RH_SYSTEM_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.RH_SYSTEM_API_KEY}`
  },
  body: JSON.stringify(rhPayload)
})
```

#### 2. Banco de Dados
```typescript
// Salvar dados para processamento posterior
await saveToDatabase(rhPayload)
```

#### 3. Email/Arquivo
```typescript
// Enviar dados por email ou salvar em arquivo
await sendEmailWithData(rhPayload)
await saveToFile(rhPayload)
```

## Formato dos Dados

### Estrutura do Payload

```json
{
  "evento": {
    "id_evento": "string",
    "nome_evento": "string",
    "descricao": "string",
    "data_inicio": "ISO DateTime",
    "data_fim": "ISO DateTime",
    "local": "string",
    "endereco": "string",
    "status": "string",
    "data_sync": "ISO DateTime"
  },
  "funcionarios": [
    {
      "id_funcionario": "string",
      "nome": "string",
      "cpf": "string",
      "email": "string",
      "telefone": "string",
      "cargo": "string",
      "empresa": "string",
      "check_in_evento": "ISO DateTime",
      "check_out_evento": "ISO DateTime",
      "presenca_confirmada": "boolean",
      "dias_trabalho": ["string"]
    }
  ],
  "registros_ponto": [
    {
      "id_registro": "string",
      "funcionario_id": "string",
      "evento_id": "string",
      "data": "string",
      "entrada": "ISO DateTime",
      "saida": "ISO DateTime",
      "etapa_trabalho": "string",
      "periodo_trabalho": "string"
    }
  ],
  "resumo_horas": {
    "total_funcionarios": "number",
    "total_registros": "number",
    "total_horas_trabalhadas": "number",
    "detalhes_horas": [
      {
        "funcionario_id": "string",
        "funcionario_nome": "string",
        "data": "string",
        "entrada": "ISO DateTime",
        "saida": "ISO DateTime",
        "horas_trabalhadas": "number"
      }
    ]
  }
}
```

## Personalização

### Modificando o Endpoint

Edite o arquivo `/app/api/rh-sync/route.ts` para:

1. **Alterar formato dos dados**
   - Modificar o mapeamento em `rhPayload`
   - Adicionar/remover campos conforme necessário

2. **Implementar nova integração**
   - Adicionar lógica de envio personalizada
   - Implementar retry/fallback

3. **Adicionar validações**
   - Validar dados antes do envio
   - Implementar filtros por tipo de evento

### Modificando a Interface

Edite o arquivo `/app/(workspaces)/eventos/[id]/rh-sync/page.tsx` para:

1. **Alterar estatísticas exibidas**
2. **Adicionar filtros/opções**
3. **Customizar layout**

## Segurança

- ✅ Autenticação via API Key
- ✅ Validação de dados de entrada
- ✅ Logs de auditoria
- ✅ Rate limiting (configurável)
- ✅ Dados sensíveis via variáveis de ambiente

## Troubleshooting

### Problemas Comuns

1. **Erro 400 - Dados do evento obrigatórios**
   - Verifique se o evento existe e tem ID válido

2. **Erro 500 - Erro interno**
   - Verifique logs do servidor
   - Confirme configuração das variáveis de ambiente

3. **Timeout na sincronização**
   - Verifique conectividade com sistema RH
   - Considere implementar retry automático

### Logs

Os logs da sincronização são salvos no console do servidor:

```bash
# Visualizar logs em desenvolvimento
npm run dev

# Logs mostram resumo da sincronização:
# - ID e nome do evento
# - Total de funcionários sincronizados
# - Total de registros de ponto
# - Total de horas trabalhadas
```

## Extensões Futuras

- [ ] Sincronização automática por agendamento
- [ ] Filtros por período/tipo de evento  
- [ ] Export para múltiplos formatos (Excel, CSV, PDF)
- [ ] Dashboard de histórico de sincronizações
- [ ] API para sistemas externos consultarem dados
- [ ] Webhooks bidirecionais para atualizações em tempo real