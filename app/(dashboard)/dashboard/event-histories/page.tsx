"use client";
import { useEventHistories } from '@/features/eventos/api/query/use-event-histories';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EventHistory } from '@/features/eventos/types';
import EventHistoryCreateDialog from '@/features/eventos/components/event-history-create-dialog';

const EventHistoriesPage = () => {
    const { data: histories, isLoading, error } = useEventHistories();

    // Garante que histories é sempre um array
    const historiesArray = Array.isArray(histories) ? histories : [];

    return (
        <div className="space-y-6 history-table">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Histórico de Ações</h2>
                <EventHistoryCreateDialog />
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Entidade</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && (
                        <TableRow>
                            <TableCell colSpan={6}>Carregando...</TableCell>
                        </TableRow>
                    )}
                    {error && (
                        <TableRow>
                            <TableCell colSpan={6}>Erro ao carregar histórico</TableCell>
                        </TableRow>
                    )}
                    {historiesArray.length === 0 && !isLoading && !error && (
                        <TableRow>
                            <TableCell colSpan={6}>Nenhum registro encontrado</TableCell>
                        </TableRow>
                    )}
                    {historiesArray.map((h: EventHistory) => (
                        <TableRow key={h.id}>
                            <TableCell>{h.entityType}</TableCell>
                            <TableCell>{h.action}</TableCell>
                            <TableCell>{h.performedBy}</TableCell>
                            <TableCell>{h.timestamp ? new Date(h.timestamp).toLocaleString('pt-BR') : '-'}</TableCell>
                            <TableCell>{h.description ?? '-'}</TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm">Editar</Button>
                                <Button variant="destructive" size="sm" className="ml-2">Excluir</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default EventHistoriesPage; 