/* eslint-disable @typescript-eslint/no-unused-vars */
// import { useOperators } from "@/features/operadores/api/query/use-operators";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import DeleteConfirmationDialog from "@/features/eventos/components/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Operator } from "../types";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useClerk } from "@clerk/nextjs";
import axios from "axios";

type EventoApi = {
    id_evento: string;
    nome_evento: string;
    // adicione outros campos se necessário
};

const OperatorList = () => {
    // const { data: operators = [], isLoading, error } = useOperators();
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [localOperators, setLocalOperators] = useState<Operator[]>([]);
    const [editNome, setEditNome] = useState("");
    const [editCpf, setEditCpf] = useState("");
    const [editSenha, setEditSenha] = useState("");
    const [editEventos, setEditEventos] = useState<string[]>([]);
    const [editLoading, setEditLoading] = useState(false);
    const { user } = useClerk();
    const [eventosDisponiveis, setEventosDisponiveis] = useState<EventoApi[]>([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Remover o useEffect que atualiza baseado no hook useOperators
    // React.useEffect(() => {
    //     setLocalOperators(operators);
    // }, [operators]);

    useEffect(() => {
        const carregarEventos = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;
                if (!apiUrl || !apiToken) return;
                const response = await axios.get(apiUrl, {
                    headers: { "xc-token": apiToken },
                });
                setEventosDisponiveis(response.data.list || []);
            } catch {
                setEventosDisponiveis([]);
            }
        };
        carregarEventos();
    }, []);

    useEffect(() => {
        const fetchOperators = async () => {
            setIsLoading(true);
            try {
                const { data } = await apiClient.get("/operadores", { params: { page, limit } });
                setLocalOperators(Array.isArray(data.data) ? data.data : []);
                setTotalPages(data.pagination?.totalPages || 1);
            } catch {
                toast.error("Erro ao carregar operadores.");
            }
            setIsLoading(false);
        };
        fetchOperators();
    }, [page, limit]);

    const handleViewDetails = (operator: Operator) => {
        setSelectedOperator(operator);
        setDetailsDialogOpen(true);
    };

    const handleEdit = (operator: Operator) => {
        setSelectedOperator(operator);
        setEditNome(operator.nome || "");
        setEditCpf(operator.cpf || "");
        setEditSenha("");
        setEditEventos(operator.id_events ? operator.id_events.split(",").filter(Boolean) : []);
        setEditDialogOpen(true);
    };

    const handleDelete = (operator: Operator) => {
        setSelectedOperator(operator);
        setDeleteDialogOpen(true);
    };

    const handleEditSave = async () => {
        if (!selectedOperator) return;
        setEditLoading(true);
        try {
            const performedBy = user?.primaryEmailAddress?.emailAddress || "system";
            const clerk_id_responsable = user ? `${user.id}|${user.primaryEmailAddress?.emailAddress}` : "system";
            const id_events = editEventos.length > 0 ? editEventos.join(",") + "," : "";
            const payload: {
                nome: string;
                cpf: string;
                id_events: string;
                performedBy: string;
                clerk_id_responsable: string;
                senha?: string;
            } = {
                nome: editNome,
                cpf: editCpf,
                id_events,
                performedBy,
                clerk_id_responsable,
            };
            if (editSenha) payload.senha = editSenha;
            const response = await apiClient.put(`/operadores/${selectedOperator.id}`, payload);
            setLocalOperators(prev => prev.map(op => op.id === selectedOperator.id ? { ...op, ...response.data } : op));
            toast.success("Operador atualizado com sucesso!");
            setEditDialogOpen(false);
            setSelectedOperator(null);
        } catch (error: unknown) {
            let message = "Erro ao editar operador.";
            if (error && typeof error === "object" && "response" in error && error.response && typeof error.response === "object" && "data" in error.response && error.response.data && typeof error.response.data === "object" && "error" in error.response.data) {
                message = String(error.response.data.error);
            }
            toast.error(message);
        }
        setEditLoading(false);
    };

    const confirmDelete = async () => {
        if (!selectedOperator) return;
        try {
            await apiClient.delete("/operadores", {
                data: {
                    id: selectedOperator.id,
                    performedBy: selectedOperator.nome, // ajuste se necessário
                },
            });
            setLocalOperators(prev => prev.filter(op => op.id !== selectedOperator.id));
            toast.success("Operador deletado com sucesso!");
        } catch (error: unknown) {
            let message = "Erro ao deletar operador.";
            if (error && typeof error === "object" && "response" in error && error.response && typeof error.response === "object" && "data" in error.response && error.response.data && typeof error.response.data === "object" && "error" in error.response.data) {
                message = String(error.response.data.error);
            }
            toast.error(message);
        }
        setDeleteDialogOpen(false);
        setSelectedOperator(null);
    };

    if (isLoading) return <div>Carregando operadores...</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2">Operadores cadastrados</h2>
            <table className="min-w-full bg-zinc-950 rounded shadow">
                <thead>
                    <tr>
                        <th className="px-4 py-2 text-left">Nome</th>
                        <th className="px-4 py-2 text-left">CPF</th>
                        <th className="px-4 py-2 text-left">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {localOperators.map((op) => (
                        <tr key={op.id} className="border-t border-zinc-800">
                            <td className="px-4 py-2">{op.nome}</td>
                            <td className="px-4 py-2">{op.cpf}</td>
                            <td className="px-4 py-2 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleViewDetails(op)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEdit(op)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(op)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded bg-zinc-800 text-white disabled:opacity-50">Anterior</button>
                <span>Página {page} de {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded bg-zinc-800 text-white disabled:opacity-50">Próxima</button>
            </div>

            {/* Dialog de detalhes */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes do Operador</DialogTitle>
                    </DialogHeader>
                    {selectedOperator && (
                        <div className="space-y-2">
                            <div><b>Nome:</b> {selectedOperator.nome}</div>
                            <div><b>CPF:</b> {selectedOperator.cpf}</div>
                            <div><b>ID:</b> {selectedOperator.id}</div>
                            {/* Adicione mais campos conforme necessário */}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog de edição */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Operador</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            placeholder="Nome"
                            value={editNome}
                            onChange={e => setEditNome(e.target.value)}
                            disabled={editLoading}
                        />
                        <Input
                            placeholder="CPF"
                            value={editCpf}
                            onChange={e => setEditCpf(e.target.value)}
                            disabled={editLoading}
                        />
                        <Input
                            placeholder="Nova senha (opcional)"
                            type="password"
                            value={editSenha}
                            onChange={e => setEditSenha(e.target.value)}
                            disabled={editLoading}
                        />
                        <div>
                            <div className="font-semibold mb-1 text-sm">Eventos vinculados</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2 bg-zinc-950">
                                {eventosDisponiveis.length === 0 && <span className="text-gray-400">Nenhum evento disponível</span>}
                                {eventosDisponiveis.map(ev => (
                                    <label key={ev.id_evento} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editEventos.includes(ev.id_evento)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setEditEventos(prev => [...prev, ev.id_evento]);
                                                } else {
                                                    setEditEventos(prev => prev.filter(id => id !== ev.id_evento));
                                                }
                                            }}
                                            disabled={editLoading}
                                        />
                                        <span>{ev.nome_evento}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <Button
                            type="button"
                            className="w-full"
                            onClick={handleEditSave}
                            disabled={editLoading}
                        >
                            {editLoading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de confirmação de exclusão */}
            <DeleteConfirmationDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Operador"
                description={`Tem certeza que deseja excluir o operador "${selectedOperator?.nome}"? Esta ação não pode ser desfeita.`}
                isLoading={false}
            />
        </div>
    );
};

export default OperatorList; 