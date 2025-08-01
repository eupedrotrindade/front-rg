# Componentes de Criação de Credenciais

Este documento descreve os componentes e hooks disponíveis para criar credenciais de eventos.

## Componentes Disponíveis

### 1. CreateCredentialDialog

Um componente de dialog para criar credenciais com interface visual completa, incluindo seleção de cores personalizadas.

#### Props

```typescript
interface CreateCredentialDialogProps {
    eventId: string                    // ID do evento
    credentialName: string            // Nome inicial da credencial
    onSuccess?: (credentialId: string) => void  // Callback de sucesso
    trigger?: React.ReactNode         // Trigger customizado (opcional)
}
```

#### Funcionalidades

- ✅ **Cores Personalizadas**: Paleta de 20 cores predefinidas + cor personalizada
- ✅ **Input de Cor**: Seletor de cor visual + input de texto para código hexadecimal
- ✅ **Validação**: Verifica se o nome da credencial foi preenchido
- ✅ **Feedback Visual**: Mostra a cor selecionada com preview
- ✅ **Responsivo**: Interface adaptada para diferentes tamanhos de tela

#### Cores Disponíveis

O componente inclui uma paleta de cores predefinidas:

- **Azuis**: `#3B82F6`, `#1E40AF`
- **Verdes**: `#10B981`, `#059669`
- **Vermelhos**: `#EF4444`, `#DC2626`
- **Amarelos**: `#F59E0B`
- **Laranjas**: `#F97316`
- **Roxos**: `#8B5CF6`, `#7C3AED`
- **Rosas**: `#EC4899`, `#DB2777`
- **Cinzas**: `#6B7280`, `#374151`
- **Outras**: `#14B8A6`, `#6366F1`, `#F472B6`, `#A78BFA`, `#06B6D4`

#### Exemplo de Uso

```tsx
import CreateCredentialDialog from "@/features/eventos/components/create-credential-dialog"

// Uso básico
<CreateCredentialDialog 
    eventId="123"
    credentialName="VIP"
    onSuccess={(credentialId) => console.log("Criado:", credentialId)}
/>

// Com trigger customizado
<CreateCredentialDialog 
    eventId="123"
    credentialName="STAFF"
    trigger={<Button>Criar Credencial</Button>}
/>
```

### 2. useCreateCredentialSimple

Hook para criar credenciais programaticamente com cores personalizadas.

#### Parâmetros

```typescript
interface UseCreateCredentialSimpleProps {
    eventId: string
    onSuccess?: (credentialId: string) => void
}

const createCredentialSimple = async (
    credentialName: string,
    color: string = "#3B82F6",        // Cor personalizada
    daysWorks: string[] = []          // Dias de trabalho
) => Promise<string | null>
```

#### Exemplo de Uso

```tsx
import { useCreateCredentialSimple } from "@/features/eventos/hooks/use-create-credential-simple"

const MyComponent = () => {
    const { createCredentialSimple, isCreating } = useCreateCredentialSimple({
        eventId: "123",
        onSuccess: (credentialId) => console.log("Criado:", credentialId)
    })

    const handleCreate = async () => {
        // Criar com cor personalizada
        const credentialId = await createCredentialSimple("VIP", "#EF4444")
        
        // Criar com cor padrão
        const credentialId2 = await createCredentialSimple("STAFF")
    }

    return (
        <Button onClick={handleCreate} disabled={isCreating}>
            Criar Credencial
        </Button>
    )
}
```

## Funcionalidades de Cores

### Paleta de Cores Predefinidas

O sistema inclui 20 cores predefinidas organizadas por categoria:

```typescript
const predefinedColors = [
    // Azuis
    { name: "Azul", value: "#3B82F6" },
    { name: "Azul Escuro", value: "#1E40AF" },
    
    // Verdes
    { name: "Verde", value: "#10B981" },
    { name: "Verde Escuro", value: "#059669" },
    
    // Vermelhos
    { name: "Vermelho", value: "#EF4444" },
    { name: "Vermelho Escuro", value: "#DC2626" },
    
    // Outras cores...
]
```

### Cor Personalizada

Além das cores predefinidas, o usuário pode:

1. **Seletor Visual**: Usar o input `type="color"` para seleção visual
2. **Input de Texto**: Digitar o código hexadecimal diretamente
3. **Validação**: O sistema aceita códigos hexadecimais válidos (#RRGGBB)

### Interface do Dialog

O dialog de criação inclui:

- **Preview da Cor**: Mostra a cor selecionada em tempo real
- **Paleta Visual**: Grid de cores clicáveis
- **Cor Personalizada**: Checkbox para ativar input de cor personalizada
- **Feedback**: Indicação visual da cor selecionada

## Exemplos de Uso

### 1. Dialog com Cores Personalizadas

```tsx
<CreateCredentialDialog 
    eventId="123"
    credentialName="CREDENCIAL-EXEMPLO"
    onSuccess={(credentialId) => {
        toast.success(`Credencial criada: ${credentialId}`)
    }}
/>
```

### 2. Hook com Cor Específica

```tsx
const { createCredentialSimple } = useCreateCredentialSimple({ eventId: "123" })

// Criar credencial vermelha
await createCredentialSimple("VIP", "#EF4444")

// Criar credencial verde
await createCredentialSimple("STAFF", "#10B981")
```

### 3. Criação em Lote com Cores

```tsx
const colors = ["#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6"]
const names = ["VIP", "STAFF", "PRESS", "SPONSOR", "GUEST"]

for (let i = 0; i < names.length; i++) {
    await createCredentialSimple(names[i], colors[i])
}
```

## Validações

- ✅ Nome da credencial é obrigatório
- ✅ Cor deve ser um código hexadecimal válido
- ✅ Dias de trabalho têm fallback para data atual
- ✅ Feedback de erro para validações falhadas

## Estados de Loading

- ✅ Dialog mostra spinner durante criação
- ✅ Hook retorna `isCreating` para controle de estado
- ✅ Botões são desabilitados durante operações
- ✅ Feedback visual para todas as ações

## Integração com Import/Export

Os componentes são integrados ao sistema de import/export para:

- ✅ Criar credenciais faltantes durante importação
- ✅ Associar credenciais aos participantes
- ✅ Validar credenciais existentes
- ✅ Normalizar nomes de credenciais (uppercase)
