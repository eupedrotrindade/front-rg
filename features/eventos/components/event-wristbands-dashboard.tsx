"use client";
import { useState } from 'react';
import { useEventWristbands } from '../api/query/use-event-wristbands';
import { useEventos } from '../api/query/use-eventos';
import { useDeleteEventWristband } from '../api/mutation/use-delete-event-wristband';
import { useCreateEventWristband } from "@/features/eventos/api/mutation/use-create-event-wristband";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { EventWristband } from '../types';
import EventWristbandCreateDialog from './event-wristband-create-dialog';
import EventWristbandEditDialog from './event-wristband-edit-dialog';
import DeleteConfirmationDialog from './delete-confirmation-dialog';
import DetailsDialog from './details-dialog';
import ExcelActions from "@/components/ui/excel-actions";
import {
    Ticket,
    CheckCircle,
    XCircle,
    Activity,
    Palette,
    Hash,
    Eye,
    Trash2,
    Search
} from 'lucide-react';
import { useEventWristbandModels } from '../api/query/use-event-wristband-models';

// Definir tipo para o modelo de pulseira
interface WristbandModel {
    id: string;
    credentialType: string;
    color: string;
    status: 'active' | 'inactive';
    eventId: string;
}

const EventWristbandsDashboard = () => {
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedWristband, setSelectedWristband] = useState<EventWristband | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Buscar dados
    const { data: wristbands, isLoading: wristbandsLoading } = useEventWristbands();
    const { data: eventos, isLoading: eventosLoading } = useEventos();
    const deleteWristbandMutation = useDeleteEventWristband();
    const createWristbandMutation = useCreateEventWristband();
    const { data: wristbandModels, isLoading: wristbandModelsLoading } = useEventWristbandModels();

    // Garantir que todos os dados são arrays
    const wristbandsArray = Array.isArray(wristbands) ? wristbands : [];
    const eventosArray = Array.isArray(eventos) ? eventos : [];
    const wristbandModelsArray: WristbandModel[] = Array.isArray(wristbandModels) ? wristbandModels : [];

    // Função para filtrar por termo de pesquisa
    const filterBySearch = (items: unknown[], searchFields: string[]) => {
        if (!searchTerm) return items;

        return items.filter(item =>
            searchFields.some(field => {
                const value = (item as Record<string, unknown>)[field];
                return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
            })
        );
    };

    // Função para buscar o modelo de pulseira correspondente
    const getWristbandModel = (wristbandModelId: string) =>
        wristbandModelsArray.find((model) => model.id === wristbandModelId);

    // Filtrar credenciais por evento selecionado e pesquisa
    const filteredWristbands = filterBySearch(
        selectedEventId === 'all'
            ? wristbandsArray
            : wristbandsArray.filter(w => {
                const model = getWristbandModel(w.wristbandModelId);
                return model && model.eventId === selectedEventId;
            }),
        ['code'] // Pesquisa só pelo código da pulseira
    ) as EventWristband[];

    // Calcular KPIs e agrupamentos usando os dados do modelo
    const totalWristbands = filteredWristbands.length;
    const activeWristbands = filteredWristbands.filter(w => w.isActive).length;
    const distributedWristbands = filteredWristbands.filter(w => w.isDistributed).length;
    const inactiveWristbands = filteredWristbands.filter(w => !w.isActive).length;
    const notDistributedWristbands = filteredWristbands.filter(w => !w.isDistributed).length;

    const credentialTypes = filteredWristbands.reduce((acc, wristband) => {
        const model = getWristbandModel(wristband.wristbandModelId);
        const type = model?.credentialType || 'Não definido';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const colorGroups = filteredWristbands.reduce((acc, wristband) => {
        const model = getWristbandModel(wristband.wristbandModelId);
        const color = model?.color || 'Não definida';
        acc[color] = (acc[color] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Evento selecionado
    const selectedEvent = eventosArray.find(e => e.id === selectedEventId);

    const isLoading = wristbandsLoading || eventosLoading || wristbandModelsLoading;

    // Preparar dados para exportação
    const exportData = filteredWristbands.map(wristband => {
        const model = getWristbandModel(wristband.wristbandModelId);
        const event = model ? eventosArray.find(e => e.id === model.eventId) : undefined;
        return {
            'Código': wristband.code,
            'Tipo de Credencial': model?.credentialType || '',
            'Cor': model?.color || '',
            'Ativa': wristband.isActive ? 'Sim' : 'Não',
            'Distribuída': wristband.isDistributed ? 'Sim' : 'Não',
            'Evento': event?.name || '',
            'Status do Evento': event?.status === 'active' ? 'Ativo' :
                event?.status === 'closed' ? 'Fechado' :
                    event?.status === 'canceled' ? 'Cancelado' : 'Rascunho',
        };
    });

    // Função para importar credenciais
    const handleImportWristbands = async (importedData: Record<string, unknown>[]) => {
        try {
            for (const row of importedData) {
                // Encontrar o evento pelo nome
                const eventName = String(row['Evento'] || '');
                const event = eventosArray.find(e => e.name === eventName);
                if (!event) {
                    console.warn(`Evento não encontrado: ${eventName}`);
                    continue;
                }
                // Encontrar o modelo pelo tipo e cor
                const credentialType = String(row['Tipo de Credencial'] || '');
                const color = String(row['Cor'] || '');
                const model = wristbandModelsArray.find((m: WristbandModel) => m.credentialType === credentialType && m.color === color && m.eventId === event.id);
                if (!model) {
                    console.warn(`Modelo não encontrado: ${credentialType} / ${color} / ${event.id}`);
                    continue;
                }
                const wristbandData = {
                    code: String(row['Código'] || ''),
                    wristbandModelId: model.id,
                    isActive: row['Ativa'] === 'Sim',
                    isDistributed: row['Distribuída'] === 'Sim',
                };
                await createWristbandMutation.mutateAsync(wristbandData);
            }
        } catch (error) {
            console.error('Erro ao importar credenciais:', error);
        }
    };

    // Handlers
    const handleViewDetails = (wristband: EventWristband) => {
        setSelectedWristband(wristband);
        setDetailsDialogOpen(true);
    };

    const handleDelete = (wristband: EventWristband) => {
        setSelectedWristband(wristband);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedWristband) return;

        try {
            await deleteWristbandMutation.mutateAsync({
                id: selectedWristband.id,
                performedBy: "current-user" // TODO: Pegar do contexto de autenticação
            });
            setDeleteDialogOpen(false);
            setSelectedWristband(null);
        } catch (error) {
            console.error('Erro ao excluir credencial:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Credencial de Eventos</h2>
                    <p className="text-muted-foreground">
                        {selectedEventId === 'all'
                            ? 'Gerenciamento de todas as credenciais'
                            : `Credencial do evento: ${selectedEvent?.name || 'Carregando...'}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ExcelActions
                        data={exportData}
                        filename="credenciais"
                        onImport={handleImportWristbands}
                        disabled={isLoading}
                    />
                    <EventWristbandCreateDialog />
                </div>
            </div>

            {/* Filtro de Evento */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Filtrar por Evento
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                        <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Selecione um evento" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Eventos</SelectItem>
                            {eventosArray.map((evento) => (
                                <SelectItem key={evento.id} value={evento.id}>
                                    {evento.name} ({evento.status})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Pesquisar credenciais..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Credencial</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalWristbands}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeWristbands} ativas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Credencial Ativas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeWristbands}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeWristbands} / {totalWristbands}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Distribuídas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{distributedWristbands}</div>
                        <p className="text-xs text-muted-foreground">
                            {distributedWristbands} / {totalWristbands}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Não Distribuídas</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{notDistributedWristbands}</div>
                        <p className="text-xs text-muted-foreground">
                            {(100 - distributedWristbands) / totalWristbands * 100}% do total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Métricas Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status das Credencial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Status das Credencial
                        </CardTitle>
                        <CardDescription>
                            Distribuição por status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Ativas</span>
                                <span className="text-sm text-muted-foreground">
                                    {activeWristbands} / {totalWristbands}
                                </span>
                            </div>
                            <Progress value={activeWristbands / totalWristbands} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Inativas</span>
                                <span className="text-sm text-muted-foreground">
                                    {inactiveWristbands} / {totalWristbands}
                                </span>
                            </div>
                            <Progress value={inactiveWristbands / totalWristbands} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Distribuídas</span>
                                <span className="text-sm text-muted-foreground">
                                    {distributedWristbands} / {totalWristbands}
                                </span>
                            </div>
                            <Progress value={distributedWristbands / totalWristbands} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Não Distribuídas</span>
                                <span className="text-sm text-muted-foreground">
                                    {notDistributedWristbands} / {totalWristbands}
                                </span>
                            </div>
                            <Progress value={notDistributedWristbands / totalWristbands} className="w-full" />
                        </div>
                    </CardContent>
                </Card>

                {/* Tipos de Credencial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hash className="h-5 w-5" />
                            Tipos de Credencial
                        </CardTitle>
                        <CardDescription>
                            Distribuição por tipo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {Object.entries(credentialTypes).map(([type, count]) => (
                                <div key={type}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{type}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {count} / {totalWristbands}
                                        </span>
                                    </div>
                                    <Progress value={count / totalWristbands} className="w-full" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Cores das Credencial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            Cores das Credencial
                        </CardTitle>
                        <CardDescription>
                            Distribuição por cor
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {Object.entries(colorGroups).map(([color, count]) => (
                                <div key={color}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{color}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {count} / {totalWristbands}
                                        </span>
                                    </div>
                                    <Progress value={count / totalWristbands} className="w-full" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Credencial */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="h-5 w-5" />
                        Credencial
                    </CardTitle>
                    <CardDescription>
                        Lista de todas as credenciais com status e informações
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Cor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Distribuição</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center">Carregando...</TableCell>
                                </TableRow>
                            )}
                            {filteredWristbands.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center">Nenhuma credencial encontrada</TableCell>
                                </TableRow>
                            )}
                            {filteredWristbands.map((wristband: EventWristband) => {
                                const model = getWristbandModel(wristband.wristbandModelId);
                                const event = model ? eventosArray.find(e => e.id === model.eventId) : undefined;
                                return (
                                    <TableRow key={wristband.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Hash className="h-4 w-4 text-muted-foreground" />
                                                {wristband.code}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {model?.credentialType || 'Não definido'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {model?.color ? (
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-4 h-4 rounded-full border"
                                                        style={{ backgroundColor: model.color }}
                                                    />
                                                    {model.color}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={wristband.isActive ? 'default' : 'secondary'}>
                                                {wristband.isActive ? (
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Ativa
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <XCircle className="h-3 w-3" />
                                                        Inativa
                                                    </div>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={wristband.isDistributed ? 'default' : 'outline'}>
                                                {wristband.isDistributed ? (
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Distribuída
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <XCircle className="h-3 w-3" />
                                                        Não Distribuída
                                                    </div>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {event ? (
                                                <div className="flex items-center gap-2">
                                                    <span>{event.name}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {event.status}
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Evento não encontrado</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(wristband)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <EventWristbandEditDialog wristband={wristband} />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(wristband)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Diálogos */}
            <DeleteConfirmationDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setSelectedWristband(null);
                }}
                onConfirm={confirmDelete}
                title="Excluir Credencial"
                description={`Tem certeza que deseja excluir a credencial "${selectedWristband?.code}"? Esta ação não pode ser desfeita.`}
                isLoading={deleteWristbandMutation.isPending}
            />

            <DetailsDialog
                isOpen={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setSelectedWristband(null);
                }}
                data={selectedWristband}
                type="wristband"
            />
        </div>
    );
};

export default EventWristbandsDashboard; 