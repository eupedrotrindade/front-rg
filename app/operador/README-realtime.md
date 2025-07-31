# Sistema de Tempo Real - Operador RG

## Visão Geral

O sistema de tempo real do operador garante que todas as alterações sejam sincronizadas instantaneamente entre diferentes sessões e dispositivos. O sistema monitora mudanças em várias entidades importantes e atualiza automaticamente a interface do usuário.

## Componentes Principais

### 1. OperatorRealtimeSync (`operator-realtime-sync.tsx`)

Componente responsável por estabelecer conexões em tempo real com o Supabase e monitorar mudanças em:

- **Operadores**: Atualizações de dados do operador logado
- **Eventos**: Novos eventos, alterações em eventos existentes
- **Participantes**: Check-ins, check-outs, novos participantes
- **Pulseiras**: Ativação/desativação de pulseiras
- **Staff**: Adição/remoção de membros do staff
- **Veículos**: Registro de veículos para eventos

### 2. useOperatorStorage (`use-operator-storage.ts`)

Hook personalizado que:

- Monitora mudanças no localStorage do operador
- Escuta eventos customizados de tempo real
- Força revalidação de dados quando necessário

### 3. Eventos Customizados

O sistema utiliza eventos customizados para comunicação entre componentes:

- `eventos-updated`: Quando eventos são modificados
- `participantes-updated`: Quando participantes são alterados
- `pulseiras-updated`: Quando pulseiras são modificadas
- `staff-updated`: Quando staff é alterado
- `veiculos-updated`: Quando veículos são modificados
- `operador-updated`: Quando dados do operador mudam
- `operador-logged-in`: Quando um operador faz login

## Funcionalidades

### Sincronização Automática

1. **Detecção de Mudanças**: O sistema detecta automaticamente mudanças no banco de dados
2. **Atualização Local**: Dados são atualizados no localStorage mantendo ações antigas
3. **Interface Responsiva**: A interface é atualizada em tempo real
4. **Indicadores Visuais**: Mostra quando a sincronização está ativa

### Logs de Debug

O sistema inclui logs detalhados para facilitar o debug:

```
🚀 Iniciando sincronização em tempo real para operador: [ID]
📡 Status do canal operadores: SUBSCRIBED
📡 Mudança detectada em participantes: UPDATE
✅ Operador atualizado no localStorage
🔄 Participantes atualizados via tempo real
```

### Tratamento de Erros

- Conexões perdidas são automaticamente restabelecidas
- Dados corrompidos são tratados graciosamente
- Fallback para dados locais quando necessário

## Configuração

### Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### Permissões do Supabase

O sistema requer as seguintes permissões no Supabase:

- `operadores`: SELECT, UPDATE
- `events`: SELECT, INSERT, UPDATE, DELETE
- `event_participants`: SELECT, INSERT, UPDATE, DELETE
- `event_wristbands`: SELECT, INSERT, UPDATE, DELETE
- `event_staff`: SELECT, INSERT, UPDATE, DELETE
- `event_vehicles`: SELECT, INSERT, UPDATE, DELETE

## Uso

### Páginas que Utilizam o Sistema

1. **Login do Operador** (`/operador/login`)

   - Monitora mudanças no operador durante o login
   - Redireciona automaticamente se dados mudarem

2. **Lista de Eventos** (`/operador/eventos`)

   - Sincroniza lista de eventos em tempo real
   - Botão de atualização manual disponível

3. **Painel do Evento** (`/painel/[id]`)
   - Sincroniza participantes, pulseiras e staff
   - Indicador visual de sincronização ativa

### Eventos Suportados

- **INSERT**: Novos registros são adicionados automaticamente
- **UPDATE**: Alterações são refletidas instantaneamente
- **DELETE**: Remoções são sincronizadas em tempo real

## Monitoramento

### Console Logs

Abra o console do navegador para ver logs detalhados:

```javascript
// Exemplo de logs
🚀 Iniciando sincronização em tempo real para operador: 123
📡 Status do canal operadores: SUBSCRIBED
📡 Mudança detectada em participantes: UPDATE
✅ Operador atualizado no localStorage
🔄 Participantes atualizados via tempo real
```

### Indicadores Visuais

- **Sincronizando...**: Aparece quando dados estão sendo atualizados
- **Ícone de refresh animado**: Indica sincronização ativa
- **Mensagens de status**: Feedback sobre o estado da conexão

## Troubleshooting

### Problemas Comuns

1. **Conexão Perdida**

   - O sistema tenta reconectar automaticamente
   - Verifique logs no console para detalhes

2. **Dados Não Atualizados**

   - Verifique se as permissões do Supabase estão corretas
   - Confirme se as variáveis de ambiente estão configuradas

3. **Performance Lenta**
   - O sistema usa debounce para evitar atualizações excessivas
   - Logs ajudam a identificar gargalos

### Debug

Para debug avançado, adicione logs adicionais:

```javascript
// No console do navegador
localStorage.setItem("debug-realtime", "true");
```

## Segurança

- Todas as conexões são autenticadas via Supabase
- Dados sensíveis são protegidos por permissões
- Logs não incluem informações sensíveis
- Conexões são limpas automaticamente ao sair

## Performance

- Conexões são reutilizadas quando possível
- Debounce evita atualizações excessivas
- Cleanup automático previne memory leaks
- Indicadores visuais não bloqueiam a interface
