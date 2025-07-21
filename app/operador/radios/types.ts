export type Retirada = {
    nome: string;
    retirada: string;
    devolucao: string;
    contato: string;
    radios: string[];
    status: boolean;
    devolvidos?: string[];
    trocas?: { antigo: string; novo: string }[];
} 