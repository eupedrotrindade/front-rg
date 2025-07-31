"use client";
import { useState } from 'react';
import { useEventos } from '../api/query/use-eventos';
import { useEventManagers } from '../api/query/use-event-managers';
import { useEventStaff } from '../api/query/use-event-staff';
import { useEventWristbands } from '../api/query/use-event-wristbands';
import { useEventParticipants } from '../api/query/use-event-participants';
import { useDeleteEvento } from '../api/mutation/use-delete-evento';
import { useCreateEvento } from "@/features/eventos/api/mutation/use-create-evento";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Event } from '../types';
import EventoCreateDialog from './evento-create-dialog';
import EventoEditDialog from './evento-edit-dialog';
import DeleteConfirmationDialog from './delete-confirmation-dialog';
import DetailsDialog from './details-dialog';
import EventStats from '@/components/dashboard/event-stats';
import {
    Users,
    UserCheck,
    Calendar,
    Activity,
    Award,
    Ticket,
    Eye,
    Trash2,
    Search
} from 'lucide-react';
import { toast } from 'sonner';
import { getEventTypeLabel } from "@/lib/utils";
import ExcelActions from "@/components/ui/excel-actions";

type WristbandWithEventId = {
    eventId: string;
    [key: string]: unknown;
};

const EventosDashboard = () => {
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Buscar todos os dados
    const { data: eventos, isLoading: eventosLoading } = useEventos();
    const { data: managers, isLoading: managersLoading } = useEventManagers();
    const { data: staff, isLoading: staffLoading } = useEventStaff();
    const { data: wristbands, isLoading: wristbandsLoading } = useEventWristbands();
    const { data: participants, isLoading: participantsLoading } = useEventParticipants();

    // Mutation para deletar evento
    const deleteEventoMutation = useDeleteEvento();
    const createEventoMutation = useCreateEvento();

    // Garantir que todos os dados são arrays
    const eventosArray = Array.isArray(eventos) ? eventos : [];
    const managersArray = Array.isArray(managers) ? managers : [];
    const staffArray = Array.isArray(staff) ? staff : [];
    const wristbandsArray = Array.isArray(wristbands) ? wristbands : [];
    const participantsArray = Array.isArray(participants) ? participants : [];

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

    // Filtrar eventos por pesquisa
    const filteredEventos = filterBySearch(
        eventosArray,
        ['name', 'description', 'venue', 'address', 'type']
    ) as Event[];

    const filteredManagers = filterBySearch(
        selectedEventId === 'all' ? managersArray : managersArray.filter(m => m.eventId === selectedEventId),
        ['name', 'email', 'cpf', 'permissions']
    );

    const filteredStaff = filterBySearch(
        selectedEventId === 'all' ? staffArray : staffArray.filter(s => s.eventId === selectedEventId),
        ['name', 'email', 'cpf', 'permissions', 'supervisorName']
    );

    const filteredWristbands = filterBySearch(
        selectedEventId === 'all' ? wristbandsArray : (wristbandsArray as unknown as WristbandWithEventId[]).filter(w => w.eventId === selectedEventId),
        ['code', 'label', 'credentialType', 'color']
    );

    const filteredParticipants = filterBySearch(
        selectedEventId === 'all' ? participantsArray : participantsArray.filter(p => p.eventId === selectedEventId),
        ['name', 'email', 'cpf', 'company', 'role']
    );

    // Calcular KPIs
    const totalEvents = filteredEventos.length;
    const activeEvents = filteredEventos.filter(e => e.status === 'active').length;
    const totalManagers = filteredManagers.length;
    const totalStaff = filteredStaff.length;
    const totalWristbands = filteredWristbands.length;
    const distributedWristbands = filteredWristbands.filter((w: unknown) => (w as Record<string, unknown>).isDistributed).length;
    const totalParticipants = filteredParticipants.length;
    const confirmedParticipants = filteredParticipants.filter((p: unknown) => (p as Record<string, unknown>).presenceConfirmed).length;
    const certificateIssued = filteredParticipants.filter((p: unknown) => (p as Record<string, unknown>).certificateIssued).length;

    // Calcular percentuais
    const certificateIssuanceRate = totalParticipants > 0 ? (certificateIssued / totalParticipants) * 100 : 0;

    // Calcular estatísticas por tipo de evento
    const eventTypeStats = eventosArray.reduce((acc, evento) => {
        const type = evento.type || 'sem-tipo';
        const label = evento.type ? getEventTypeLabel(evento.type) : 'Sem tipo definido';

        if (!acc[type]) {
            acc[type] = { label, count: 0 };
        }
        acc[type].count++;
        return acc;
    }, {} as Record<string, { label: string; count: number }>);

    const eventTypeData = Object.entries(eventTypeStats)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.count - a.count);

    // Evento selecionado
    const selectedEventData = eventosArray.find(e => e.id === selectedEventId);

    const isLoading = eventosLoading || managersLoading || staffLoading || wristbandsLoading || participantsLoading;

    // Preparar dados para exportação
    const exportData = filteredEventos.map(evento => ({
        'Nome': evento.name,
        'Tipo': evento.type ? getEventTypeLabel(evento.type) : 'Não definido',
        'Status': evento.status === 'active' ? 'Ativo' :
            evento.status === 'closed' ? 'Fechado' :
                evento.status === 'canceled' ? 'Cancelado' : 'Rascunho',
        'Data de Início': evento.startDate ? new Date(evento.startDate).toLocaleDateString('pt-BR') : '',
        'Data de Fim': evento.endDate ? new Date(evento.endDate).toLocaleDateString('pt-BR') : '',
        'Início Montagem': evento.setupStartDate ? new Date(evento.setupStartDate).toLocaleDateString('pt-BR') : '',
        'Fim Montagem': evento.setupEndDate ? new Date(evento.setupEndDate).toLocaleDateString('pt-BR') : '',
        'Início Evento': evento.preparationStartDate ? new Date(evento.preparationStartDate).toLocaleDateString('pt-BR') : '',
        'Fim Evento': evento.preparationEndDate ? new Date(evento.preparationEndDate).toLocaleDateString('pt-BR') : '',
        'Início Finalização': evento.finalizationStartDate ? new Date(evento.finalizationStartDate).toLocaleDateString('pt-BR') : '',
        'Fim Finalização': evento.finalizationEndDate ? new Date(evento.finalizationEndDate).toLocaleDateString('pt-BR') : '',
        'Local': evento.venue || '',
        'Endereço': evento.address || '',
        'Descrição': evento.description || '',
        'Capacidade': evento.capacity || '',
        'Visibilidade': evento.visibility === 'public' ? 'Público' :
            evento.visibility === 'private' ? 'Privado' : 'Restrito',
        'Slug': evento.slug || '',
        'Link de Inscrição': evento.registrationLink || '',
        'Categorias': Array.isArray(evento.categories) ? evento.categories.join(', ') : '',
        'Template QR Code': evento.qrCodeTemplate || '',
        'Ativo': evento.isActive ? 'Sim' : 'Não',
    }));

    // Função para importar eventos
    const handleImportEventos = async (importedData: Record<string, unknown>[]) => {
        try {
            for (const row of importedData) {
                const statusValue = row['Status'];
                let status: "active" | "closed" | "canceled" | "draft" = "draft";

                if (statusValue === 'Ativo') status = "active";
                else if (statusValue === 'Fechado') status = "closed";
                else if (statusValue === 'Cancelado') status = "canceled";

                const visibilityValue = row['Visibilidade'];
                let visibility: "public" | "private" | "restricted" = "public";

                if (visibilityValue === 'Privado') visibility = "private";
                else if (visibilityValue === 'Restrito') visibility = "restricted";

                const qrCodeTemplateValue = row['Template QR Code'];
                let qrCodeTemplate: "default" | "custom" | undefined = undefined;

                if (qrCodeTemplateValue === 'Padrão') qrCodeTemplate = "default";
                else if (qrCodeTemplateValue === 'Personalizado') qrCodeTemplate = "custom";

                const eventData = {
                    name: String(row['Nome'] || ''),
                    type: String(row['Tipo'] || ''),
                    status,
                    startDate: String(row['Data de Início'] || ''),
                    endDate: String(row['Data de Fim'] || ''),
                    venue: String(row['Local'] || ''),
                    address: String(row['Endereço'] || ''),
                    description: String(row['Descrição'] || ''),
                    capacity: row['Capacidade'] ? Number(row['Capacidade']) : undefined,
                    visibility,
                    slug: String(row['Slug'] || ''),
                    registrationLink: String(row['Link de Inscrição'] || ''),
                    categories: String(row['Categorias'] || '').split(',').map(cat => cat.trim()).filter(Boolean),
                    qrCodeTemplate,
                    isActive: row['Ativo'] === 'Sim',
                };

                await createEventoMutation.mutateAsync(eventData);
            }
        } catch (error) {
            console.error('Erro ao importar eventos:', error);
        }
    };

    // Handlers para ações
    const handleViewDetails = (evento: Event) => {
        setSelectedEvent(evento);
        setDetailsDialogOpen(true);
    };

    const handleDelete = (evento: Event) => {
        setSelectedEvent(evento);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedEvent) return;

        deleteEventoMutation.mutate(
            {
                id: selectedEvent.id,
                performedBy: "current-user" // TODO: Pegar do contexto de autenticação
            },
            {
                onSuccess: () => {
                    toast.success("Evento excluído com sucesso!");
                    setDeleteDialogOpen(false);
                    setSelectedEvent(null);
                },
                onError: (error) => {
                    console.error("Erro ao excluir evento:", error);
                    toast.error("Erro ao excluir evento. Tente novamente.");
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Dashboard de Eventos</h2>
                    <p className="text-muted-foreground">
                        {selectedEventId === 'all'
                            ? 'Visão geral de todos os eventos'
                            : `Evento: ${selectedEventData?.name || 'Carregando...'}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ExcelActions
                        data={exportData}
                        filename="eventos"
                        onImport={handleImportEventos}
                        disabled={isLoading}
                    />
                    <EventoCreateDialog />
                </div>
            </div>

            {/* Filtro de Evento */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
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
                            placeholder="Pesquisar em todas as tabelas..."
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
                        <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEvents}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeEvents} ativos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Equipe Total</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalManagers + totalStaff}</div>
                        <p className="text-xs text-muted-foreground">
                            {totalManagers} gerentes, {totalStaff} staff
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Participantes</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalParticipants}</div>
                        <p className="text-xs text-muted-foreground">
                            {confirmedParticipants} confirmados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Credencial</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalWristbands}</div>
                        <p className="text-xs text-muted-foreground">
                            {distributedWristbands} distribuídas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Estatísticas Detalhadas */}
            <EventStats
                totalWristbands={totalWristbands}
                distributedWristbands={distributedWristbands}
                totalParticipants={totalParticipants}
                confirmedParticipants={confirmedParticipants}
            />

            {/* Métricas Adicionais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Certificados Emitidos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Certificados Emitidos
                        </CardTitle>
                        <CardDescription>
                            Taxa de emissão de certificados
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Emitidos</span>
                            <span className="text-sm text-muted-foreground">
                                {certificateIssued} / {totalParticipants}
                            </span>
                        </div>
                        <Progress value={certificateIssuanceRate} className="w-full" />
                        <div className="text-2xl font-bold text-center">
                            {certificateIssuanceRate.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>

                {/* Status dos Eventos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Status dos Eventos
                        </CardTitle>
                        <CardDescription>
                            Distribuição por status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Ativos</span>
                            <span className="text-sm text-muted-foreground">
                                {activeEvents} / {totalEvents}
                            </span>
                        </div>
                        <Progress value={totalEvents > 0 ? (activeEvents / totalEvents) * 100 : 0} className="w-full" />
                        <div className="text-2xl font-bold text-center">
                            {totalEvents > 0 ? ((activeEvents / totalEvents) * 100).toFixed(1) : 0}%
                        </div>
                    </CardContent>
                </Card>

                {/* Resumo de Atividades */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5" />
                            Resumo de Atividades
                        </CardTitle>
                        <CardDescription>
                            Atividades recentes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Novos Participantes</span>
                                <span className="font-medium">{totalParticipants}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Credencial Distribuídas</span>
                                <span className="font-medium">{distributedWristbands}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Presenças Confirmadas</span>
                                <span className="font-medium">{confirmedParticipants}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tipos de Eventos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Tipos de Eventos
                        </CardTitle>
                        <CardDescription>
                            Distribuição por tipo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {eventTypeData.slice(0, 5).map(({ type, label, count }) => (
                                <div key={type}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{label}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {count} / {totalEvents}
                                        </span>
                                    </div>
                                    <Progress value={totalEvents > 0 ? (count / totalEvents) * 100 : 0} className="w-full" />
                                </div>
                            ))}
                            {eventTypeData.length > 5 && (
                                <div className="text-sm text-muted-foreground text-center">
                                    +{eventTypeData.length - 5} outros tipos
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Eventos */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Eventos
                    </CardTitle>
                    <CardDescription>
                        Lista de todos os eventos com status e informações
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Fim</TableHead>
                                <TableHead>Montagem</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Finalização</TableHead>
                                <TableHead>Participantes</TableHead>
                                <TableHead>Credencial</TableHead>
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center">Carregando...</TableCell>
                                </TableRow>
                            )}
                            {filteredEventos.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center">
                                        {searchTerm ? "Nenhum evento encontrado para a pesquisa" : "Nenhum evento encontrado"}
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredEventos.map((evento: Event) => {
                                const eventParticipants = participantsArray.filter(p => p.eventId === evento.id);
                                const eventWristbands = (wristbandsArray as unknown as WristbandWithEventId[]).filter(w => w.eventId === evento.id);
                                return (
                                    <TableRow key={evento.id}>
                                        <TableCell className="font-medium">{evento.name}</TableCell>
                                        <TableCell>
                                            {evento.type ? getEventTypeLabel(evento.type) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                evento.status === 'active' ? 'default' :
                                                    evento.status === 'closed' ? 'secondary' :
                                                        evento.status === 'canceled' ? 'destructive' :
                                                            'outline'
                                            }>
                                                {evento.status === 'active' ? 'Ativo' :
                                                    evento.status === 'closed' ? 'Fechado' :
                                                        evento.status === 'canceled' ? 'Cancelado' :
                                                            'Rascunho'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {evento.startDate ? new Date(evento.startDate).toLocaleDateString('pt-BR') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {evento.endDate ? new Date(evento.endDate).toLocaleDateString('pt-BR') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {evento.setupStartDate || evento.setupEndDate ? (
                                                <span>{evento.setupStartDate ? new Date(evento.setupStartDate).toLocaleDateString('pt-BR') : '-'}<br />{evento.setupEndDate ? new Date(evento.setupEndDate).toLocaleDateString('pt-BR') : '-'}</span>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {evento.preparationStartDate || evento.preparationEndDate ? (
                                                <span>{evento.preparationStartDate ? new Date(evento.preparationStartDate).toLocaleDateString('pt-BR') : '-'}<br />{evento.preparationEndDate ? new Date(evento.preparationEndDate).toLocaleDateString('pt-BR') : '-'}</span>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {evento.finalizationStartDate || evento.finalizationEndDate ? (
                                                <span>{evento.finalizationStartDate ? new Date(evento.finalizationStartDate).toLocaleDateString('pt-BR') : '-'}<br />{evento.finalizationEndDate ? new Date(evento.finalizationEndDate).toLocaleDateString('pt-BR') : '-'}</span>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{eventParticipants.length}</span>
                                                {eventParticipants.filter(p => !!p.checkIn).length > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {eventParticipants.filter(p => !!p.checkIn).length} confirmados
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{eventWristbands.length}</span>
                                                {eventWristbands.filter(w => w.isDistributed).length > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {eventWristbands.filter(w => w.isDistributed).length} distribuídas
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(evento)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <EventoEditDialog evento={evento} />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(evento)}
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
                    setSelectedEvent(null);
                }}
                onConfirm={confirmDelete}
                title="Excluir Evento"
                description={`Tem certeza que deseja excluir o evento "${selectedEvent?.name}"? Esta ação não pode ser desfeita.`}
                isLoading={deleteEventoMutation.isPending}
            />

            <DetailsDialog
                isOpen={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setSelectedEvent(null);
                }}
                data={selectedEvent}
                type="event"
            />
        </div>
    );
};

export default EventosDashboard; 