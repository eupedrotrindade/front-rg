export type Retirada = {
    id: string;
    nome: string;
    retirada: string;
    devolucao: string;
    contato: string;
    radios: string[];
    status: boolean;
    historico?: string[];
    codes_devolvidos?: string[];
    codes_trocados?: string[];
} 