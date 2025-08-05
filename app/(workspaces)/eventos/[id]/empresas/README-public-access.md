# Acesso Público às Empresas

## Funcionalidade

Esta funcionalidade permite criar links públicos para que empresas possam acessar informações sobre seus colaboradores no evento, sem necessidade de login no sistema.

## Como Funciona

### 1. Geração do Token

- O token é gerado automaticamente quando o usuário clica em "Copiar URL Pública"
- O token contém: `empresaId:eventId:timestamp`
- O token é codificado em base64 para segurança

### 2. Validação do Token

- A página pública decodifica o token
- Verifica se o token não expirou (7 dias)
- Busca os dados da empresa e evento correspondentes

### 3. Página Pública

- URL: `/public/empresa/[token]`
- Exibe informações da empresa
- Lista todos os colaboradores da empresa no evento
- Permite filtrar por dia de trabalho
- Mostra estatísticas de check-in

## Segurança

- **Token com expiração**: 7 dias
- **Sem autenticação**: Apenas quem tem o link pode acessar
- **Dados limitados**: Apenas dados da empresa específica
- **Validação**: Token é validado antes de exibir dados

## Estrutura do Token

```
btoa(empresaId:eventId:timestamp)
```

Exemplo:

```
empresa123:evento456:1703123456789
```

## APIs Utilizadas

- `GET /empresas/:id` - Buscar empresa por ID
- `GET /events/:id` - Buscar evento por ID
- `GET /event-participants/event/:eventId` - Buscar participantes do evento

## Filtros Aplicados

- Participantes são filtrados por `company` igual ao nome da empresa
- Participantes são filtrados por `daysWork` para mostrar apenas os do dia selecionado

## Interface

A página pública inclui:

- Header com nome da empresa e evento
- Informações completas da empresa (CNPJ, contatos, endereço)
- Todos os campos são sempre exibidos, mesmo quando vazios
- Campos vazios mostram "Não informado" como placeholder
- Lista de dias de trabalho com períodos
- Lista de colaboradores com status de check-in
- Estatísticas do dia selecionado

## Funcionalidade de Edição (Usuários Clerk)

Quando um usuário autenticado via Clerk acessa a página pública, ele pode:

### Campos Editáveis

- **Email**: Clique em campos vazios para adicionar email
- **Telefone**: Clique em campos vazios para adicionar telefone
- **CPF**: Campo somente leitura (por segurança)

### Como Funcionar

1. **Detecção Automática**: O sistema detecta automaticamente se o usuário está logado via Clerk
2. **Indicadores Visuais**:
   - Badge "Modo Edição Ativo" no header
   - Badge "Edição Ativa" na seção de colaboradores
   - Texto "(editar)" em todos os campos editáveis
3. **Edição Inline**:
   - Clique em qualquer campo da empresa para editar
   - Clique em campos vazios dos colaboradores para adicionar
4. **Salvamento**: Botões ✓ para salvar e ✕ para cancelar
5. **Feedback**: Toast notifications para sucesso/erro

### Segurança

- Apenas usuários Clerk podem editar
- Campos vazios são destacados visualmente
- Validação antes do salvamento
- Logs de alterações mantidos
