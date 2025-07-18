import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { useClerk } from "@clerk/nextjs";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Operator } from "@/features/operadores/types";

interface OperatorFormProps {
    onSuccess?: () => void;
}

type EventApi = {
    Id: number;
    CreatedAt: string;
    UpdatedAt: string;
    id_evento: string;
    nome_evento: string;
    senha_acesso: string;
    status: string;
    id_tabela: string;
    capa: string;
    data: string;
    id_tabela_radio: string;
};

const OperatorForm = ({ onSuccess }: OperatorFormProps) => {
    const [nome, setNome] = useState("");
    const [cpf, setCpf] = useState("");
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [eventos, setEventos] = useState<EventApi[]>([]);
    const [eventosSelecionados, setEventosSelecionados] = useState<string[]>([]);
    const { user } = useClerk();
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [massLoading, setMassLoading] = useState(false);
    const [importedOperators, setImportedOperators] = useState<{ nome: string; senha: string; cpf?: string }[]>([]);
    const [massEvents, setMassEvents] = useState<string[]>([]);

    useEffect(() => {
        const carregarEventos = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;
                if (!apiUrl || !apiToken) return;
                const response = await axios.get(apiUrl, {
                    headers: { "xc-token": apiToken },
                });
                setEventos(response.data.list || []);
            } catch {
                setEventos([]);
            }
        };
        carregarEventos();
    }, []);

    const formatCpf = (value: string) => {
        // Remove tudo que não for número
        const digits = value.replace(/\D/g, "");
        // Aplica a máscara 000.000.000-00
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_m, p1, p2, p3, p4) => {
            let out = `${p1}.${p2}.${p3}`;
            if (p4) out += `-${p4}`;
            return out;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const eventosString = eventosSelecionados.length > 0 ? eventosSelecionados.join(",") + "," : "";
            const clerkId = user?.id || "";
            const clerkEmail = user?.primaryEmailAddress?.emailAddress || "";
            await apiClient.post("/operadores", {
                nome,
                cpf: formatCpf(cpf),
                senha,
                id_events: eventosString,
                clerk_id_responsable: `${clerkId}|${clerkEmail}`,
            });
            setNome("");
            setCpf("");
            setSenha("");
            setEventosSelecionados([]);
            if (onSuccess) onSuccess();
        } catch {
            setError("Erro ao adicionar operador. Verifique os dados e tente novamente.");
        }
        setLoading(false);
    };

    // Exportar modelo Excel
    const exportTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { nome: "", cpf: "", senha: "" },
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "OperadoresModelo");
        XLSX.writeFile(wb, "modelo-operadores.xlsx");
    };

    // Exportar operadores atuais (todos do backend, incluindo eventos vinculados)
    const exportOperators = async () => {
        try {
            const { data } = await apiClient.get("/operadores");
            const operadores: Operator[] = Array.isArray(data.data) ? data.data : [];
            const ws = XLSX.utils.json_to_sheet(
                operadores.map((op) => ({
                    nome: op.nome,
                    cpf: op.cpf,
                    senha: op.senha,
                }))
            );
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Operadores");
            XLSX.writeFile(wb, "operadores.xlsx");
        } catch {
            toast.error("Erro ao exportar operadores.");
        }
    };

    // Importar operadores em massa (apenas armazena para revisão)
    const handleImport = (data: Record<string, unknown>[]) => {
        const ops = data
            .filter(row => row.nome && row.senha)
            .map(row => ({
                nome: String(row.nome),
                senha: String(row.senha),
                cpf: row.cpf ? String(row.cpf) : undefined,
            }));
        setImportedOperators(ops);
    };

    const handleOpenImportDialog = () => setImportDialogOpen(true);
    const handleCloseImportDialog = () => {
        setImportDialogOpen(false);
        setImportedOperators([]);
        setMassEvents([]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                if (!bstr) return;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                handleImport(data as Record<string, unknown>[]);
            };
            reader.readAsBinaryString(file);
        }
    };

    const handleMassAdd = async () => {
        if (!user || massLoading || importedOperators.length === 0 || massEvents.length === 0) return;
        setMassLoading(true);
        const clerkId = user?.id || "";
        const clerkEmail = user?.primaryEmailAddress?.emailAddress || "";
        const eventosString = massEvents.length > 0 ? massEvents.join(",") + "," : "";
        try {
            for (const op of importedOperators) {
                await apiClient.post("/operadores", {
                    nome: op.nome,
                    cpf: op.cpf || "",
                    senha: op.senha,
                    id_events: eventosString,
                    clerk_id_responsable: `${clerkId}|${clerkEmail}`,
                });
            }
            setImportedOperators([]);
            setMassEvents([]);
            toast.success("Operadores adicionados em massa com sucesso!");
            handleCloseImportDialog();
            if (onSuccess) onSuccess();
        } catch {
            toast.error("Erro ao adicionar operadores em massa.");
        }
        setMassLoading(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4 bg-zinc p-4 rounded shadow mb-6">
                <h2 className="text-lg font-bold mb-2">Adicionar novo operador</h2>
                <Input
                    placeholder="Nome"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                    disabled={loading}
                />
                <Input
                    placeholder="CPF"
                    value={cpf}
                    onChange={e => setCpf(formatCpf(e.target.value))}
                    required
                    disabled={loading}
                    maxLength={14}
                />
                <Input
                    placeholder="Senha"
                    type="password"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    required
                    disabled={loading}
                />
                <div>
                    <label className="block text-sm font-medium mb-1">Eventos vinculados</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2 bg-zinc-950">
                        {eventos.length === 0 && <span className="text-gray-400">Nenhum evento disponível</span>}
                        {eventos.map(ev => (
                            <label key={ev.id_evento} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={eventosSelecionados.includes(ev.id_evento)}
                                    onCheckedChange={checked => {
                                        setEventosSelecionados(prev =>
                                            checked
                                                ? [...prev, ev.id_evento]
                                                : prev.filter(id => id !== ev.id_evento)
                                        );
                                    }}
                                    disabled={loading}
                                />
                                <span>{ev.nome_evento}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Salvando..." : "Adicionar Operador"}
                </Button>
                {/* Importação/Exportação em massa */}
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <button type="button" className="bg-zinc-800 text-white px-3 py-2 rounded text-xs" onClick={handleOpenImportDialog}>
                        Importar Excel
                    </button>
                    <button type="button" className="bg-zinc-800 text-white px-3 py-2 rounded text-xs" onClick={exportTemplate}>
                        Baixar Modelo
                    </button>
                    <button type="button" className="bg-zinc-800 text-white px-3 py-2 rounded text-xs" onClick={exportOperators}>
                        Exportar Operadores
                    </button>
                </div>
            </form>

            {/* Dialog de importação em massa */}
            <Dialog open={importDialogOpen} onOpenChange={open => { if (!open) handleCloseImportDialog(); }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Importação em Massa de Operadores</DialogTitle>
                        <DialogDescription>
                            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                                <li>O arquivo deve ser Excel (.xlsx ou .xls).</li>
                                <li>Colunas obrigatórias: <b>nome</b>, <b>email</b>, <b>senha</b>.</li>
                                <li>Coluna opcional: <b>cpf</b> (formato 000.000.000-00).</li>
                                <li>Após importar, selecione os eventos que serão vinculados a todos os operadores.</li>
                                <li>O campo <b>clerk_id_responsable</b> será preenchido automaticamente com seu usuário.</li>
                            </ul>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                        />
                    </div>
                    {importedOperators.length > 0 && (
                        <div className="mb-4">
                            <div className="font-semibold mb-2 text-sm">Operadores importados:</div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {importedOperators.map((op, idx) => (
                                    <div key={idx} className="bg-zinc-900 text-white rounded px-3 py-2 flex flex-col md:flex-row md:items-center md:gap-4 text-xs">
                                        <span><b>Nome:</b> {op.nome}</span>
                                        <span><b>Senha:</b> {op.senha}</span>
                                        {op.cpf && <span><b>CPF:</b> {op.cpf}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {importedOperators.length > 0 && (
                        <div className="mb-4">
                            <div className="font-semibold mb-2 text-sm">Selecionar eventos para todos os operadores:</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2 bg-zinc-950">
                                {eventos.length === 0 && <span className="text-gray-400">Nenhum evento disponível</span>}
                                {eventos.map(ev => (
                                    <label key={ev.id_evento} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={massEvents.includes(ev.id_evento)}
                                            onCheckedChange={checked => {
                                                setMassEvents(prev =>
                                                    checked
                                                        ? [...prev, ev.id_evento]
                                                        : prev.filter(id => id !== ev.id_evento)
                                                );
                                            }}
                                            disabled={massLoading}
                                        />
                                        <span>{ev.nome_evento}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end mt-4">
                        <Button
                            type="button"
                            className="w-full"
                            onClick={handleMassAdd}
                            disabled={massLoading || importedOperators.length === 0 || massEvents.length === 0}
                        >
                            {massLoading ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Adicionando...
                                </span>
                            ) : (
                                "Adicionar em Massa"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default OperatorForm; 