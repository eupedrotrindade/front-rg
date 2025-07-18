"use client";
import { useState } from 'react';
import { useEventParticipants } from '../api/query/use-event-participants';
import { useEventos } from '../api/query/use-eventos';
import { useDeleteEventParticipant } from '../api/mutation/use-delete-event-participant';
import { useEventWristbands } from '../api/query/use-event-wristbands';
import { useEventStaff } from '../api/query/use-event-staff';
import { useCreateEventParticipant } from "@/features/eventos/api/mutation/use-create-event-participant";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { EventParticipant } from '../types';
import EventParticipantCreateDialog from './event-participant-create-dialog';
import EventParticipantEditDialog from './event-participant-edit-dialog';
import DeleteConfirmationDialog from './delete-confirmation-dialog';
import DetailsDialog from './details-dialog';
import ExcelActions from "@/components/ui/excel-actions";
import {
    Users,
    UserCheck,
    Award,
    Activity,
    Mail,
    Phone,
    Building,
    Calendar,
    Eye,
    Trash2,
    Search
} from 'lucide-react';

const EventParticipantsDashboard = () => {
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Buscar dados
    const { data: participants, isLoading: participantsLoading } = useEventParticipants();
    const { data: eventos, isLoading: eventosLoading } = useEventos();
    const { data: wristbands, isLoading: wristbandsLoading } = useEventWristbands();
    const { data: staff, isLoading: staffLoading } = useEventStaff();
    const deleteParticipantMutation = useDeleteEventParticipant();
    const createParticipantMutation = useCreateEventParticipant();

    // Garantir que todos os dados são arrays
    const participantsArray = Array.isArray(participants) ? participants : [];
    const eventosArray = Array.isArray(eventos) ? eventos : [];
    const wristbandsArray = Array.isArray(wristbands) ? wristbands : [];
    const staffArray = Array.isArray(staff) ? staff : [];

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

    // Filtrar participantes por evento selecionado e pesquisa
    const filteredParticipants = filterBySearch(
        selectedEventId === 'all' ? participantsArray : participantsArray.filter(p => p.eventId === selectedEventId),
        ['name', 'email', 'cpf', 'company', 'role']
    ) as EventParticipant[];

    // Calcular KPIs
    const totalParticipants = filteredParticipants.length;
    const confirmedParticipants = filteredParticipants.filter(p => p.presenceConfirmed).length;
    const certificateIssued = filteredParticipants.filter(p => p.certificateIssued).length;
    const participantsWithEmail = filteredParticipants.filter(p => p.email).length;
    const participantsWithPhone = filteredParticipants.filter(p => p.phone).length;
    const participantsWithCheckIn = filteredParticipants.filter(p => p.checkIn).length;
    const participantsWithCheckOut = filteredParticipants.filter(p => p.checkOut).length;

    // Calcular percentuais
    const confirmationRate = totalParticipants > 0 ? (confirmedParticipants / totalParticipants) * 100 : 0;
    const certificateRate = totalParticipants > 0 ? (certificateIssued / totalParticipants) * 100 : 0;
    const emailCompletionRate = totalParticipants > 0 ? (participantsWithEmail / totalParticipants) * 100 : 0;
    const phoneCompletionRate = totalParticipants > 0 ? (participantsWithPhone / totalParticipants) * 100 : 0;
    const checkInRate = totalParticipants > 0 ? (participantsWithCheckIn / totalParticipants) * 100 : 0;
    const checkOutRate = totalParticipants > 0 ? (participantsWithCheckOut / totalParticipants) * 100 : 0;

    // Agrupar por empresa
    const companyGroups = filteredParticipants.reduce((acc, participant) => {
        const company = participant.company || 'Não informada';
        acc[company] = (acc[company] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Evento selecionado
    const selectedEvent = eventosArray.find(e => e.id === selectedEventId);

    // Preparar dados para exportação
    const exportData = filteredParticipants.map(participant => {
        const event = eventosArray.find(e => e.id === participant.eventId);
        const wristband = wristbandsArray.find(w => w.id === participant.wristbandId);
        const staffMember = staffArray.find(s => s.id === participant.staffId);

        return {
            'Nome': participant.name,
            'CPF': participant.cpf,
            'Email': participant.email || '',
            'Telefone': participant.phone || '',
            'Empresa': participant.company,
            'Cargo': participant.role || '',
            'Credencial': wristband?.code || '',
            'Tipo de Credencial': 'Não definido',
            'Staff Responsável': staffMember?.name || '',
            'Check-in': participant.checkIn ? new Date(participant.checkIn).toLocaleString('pt-BR') : '',
            'Check-out': participant.checkOut ? new Date(participant.checkOut).toLocaleString('pt-BR') : '',
            'Presença Confirmada': participant.presenceConfirmed ? 'Sim' : 'Não',
            'Certificado Emitido': participant.certificateIssued ? 'Sim' : 'Não',
            'Tamanho da Camiseta': participant.shirtSize || '',
            'Observações': participant.notes || '',
            'Evento': event?.name || '',
            'Status do Evento': event?.status === 'active' ? 'Ativo' :
                event?.status === 'closed' ? 'Fechado' :
                    event?.status === 'canceled' ? 'Cancelado' : 'Rascunho',
        };
    });

    // Função para importar participantes
    const handleImportParticipants = async (importedData: Record<string, unknown>[]) => {
        try {
            for (const row of importedData) {
                // Encontrar o evento pelo nome
                const eventName = String(row['Evento'] || '');
                const event = eventosArray.find(e => e.name === eventName);

                if (!event) {
                    console.warn(`Evento não encontrado: ${eventName}`);
                    continue;
                }

                // Encontrar a credencial pelo código
                const wristbandCode = String(row['Credencial'] || '');
                const wristband = wristbandsArray.find(w => w.code === wristbandCode);

                if (!wristband) {
                    console.warn(`Credencial não encontrada: ${wristbandCode}`);
                    continue;
                }

                // Encontrar o staff pelo nome
                const staffName = String(row['Staff Responsável'] || '');
                const staffMember = staffArray.find(s => s.name === staffName && s.eventId === event.id);

                const participantData = {
                    eventId: event.id,
                    wristbandId: wristband.id,
                    staffId: staffMember?.id,
                    name: String(row['Nome'] || ''),
                    cpf: String(row['CPF'] || ''),
                    email: String(row['Email'] || ''),
                    phone: String(row['Telefone'] || ''),
                    role: String(row['Cargo'] || ''),
                    company: String(row['Empresa'] || ''),
                    checkIn: row['Check-in'] ? new Date(String(row['Check-in'])).toISOString() : undefined,
                    checkOut: row['Check-out'] ? new Date(String(row['Check-out'])).toISOString() : undefined,
                    presenceConfirmed: row['Presença Confirmada'] === 'Sim',
                    certificateIssued: row['Certificado Emitido'] === 'Sim',
                    shirtSize: String(row['Tamanho da Camiseta'] || '') as "PP" | "P" | "M" | "G" | "GG" | "XG" | "XXG" | "EXG" | undefined,
                    notes: String(row['Observações'] || ''),
                };

                await createParticipantMutation.mutateAsync(participantData);
            }
        } catch (error) {
            console.error('Erro ao importar participantes:', error);
        }
    };

    const isLoading = participantsLoading || eventosLoading || wristbandsLoading || staffLoading;

    // Handlers
    const handleViewDetails = (participant: EventParticipant) => {
        setSelectedParticipant(participant);
        setDetailsDialogOpen(true);
    };

    const handleDelete = (participant: EventParticipant) => {
        setSelectedParticipant(participant);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedParticipant) return;

        try {
            await deleteParticipantMutation.mutateAsync({
                id: selectedParticipant.id,
                performedBy: "current-user" // TODO: Pegar do contexto de autenticação
            });
            setDeleteDialogOpen(false);
            setSelectedParticipant(null);
        } catch (error) {
            console.error('Erro ao excluir participante:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Participantes de Eventos</h2>
                    <p className="text-muted-foreground">
                        {selectedEventId === 'all'
                            ? 'Gerenciamento de todos os participantes'
                            : `Participantes do evento: ${selectedEvent?.name || 'Carregando...'}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ExcelActions
                        data={exportData}
                        filename="participantes"
                        onImport={handleImportParticipants}
                        disabled={isLoading}
                    />
                    <EventParticipantCreateDialog />
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
                            placeholder="Pesquisar participantes..."
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
                        <CardTitle className="text-sm font-medium">Total de Participantes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
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
                        <CardTitle className="text-sm font-medium">Presença Confirmada</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{confirmedParticipants}</div>
                        <p className="text-xs text-muted-foreground">
                            {confirmationRate.toFixed(1)}% do total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Certificados Emitidos</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{certificateIssued}</div>
                        <p className="text-xs text-muted-foreground">
                            {certificateRate.toFixed(1)}% do total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Check-ins Realizados</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{participantsWithCheckIn}</div>
                        <p className="text-xs text-muted-foreground">
                            {checkInRate.toFixed(1)}% do total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Métricas Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status de Participação */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5" />
                            Status de Participação
                        </CardTitle>
                        <CardDescription>
                            Distribuição por status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Presença Confirmada</span>
                                <span className="text-sm text-muted-foreground">
                                    {confirmedParticipants} / {totalParticipants}
                                </span>
                            </div>
                            <Progress value={confirmationRate} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Certificados Emitidos</span>
                                <span className="text-sm text-muted-foreground">
                                    {certificateIssued} / {totalParticipants}
                                </span>
                            </div>
                            <Progress value={certificateRate} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Check-ins</span>
                                <span className="text-sm text-muted-foreground">
                                    {participantsWithCheckIn} / {totalParticipants}
                                </span>
                            </div>
                            <Progress value={checkInRate} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Check-outs</span>
                                <span className="text-sm text-muted-foreground">
                                    {participantsWithCheckOut} / {totalParticipants}
                                </span>
                            </div>
                            <Progress value={checkOutRate} className="w-full" />
                        </div>
                    </CardContent>
                </Card>

                {/* Completude de Dados */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Completude de Dados
                        </CardTitle>
                        <CardDescription>
                            Qualidade das informações
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Emails Cadastrados</span>
                                <span className="text-sm text-muted-foreground">
                                    {emailCompletionRate.toFixed(1)}%
                                </span>
                            </div>
                            <Progress value={emailCompletionRate} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Telefones Cadastrados</span>
                                <span className="text-sm text-muted-foreground">
                                    {phoneCompletionRate.toFixed(1)}%
                                </span>
                            </div>
                            <Progress value={phoneCompletionRate} className="w-full" />
                        </div>
                    </CardContent>
                </Card>

                {/* Principais Empresas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Principais Empresas
                        </CardTitle>
                        <CardDescription>
                            Participantes por empresa
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {Object.entries(companyGroups)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 5)
                                .map(([company, count]) => (
                                    <div key={company}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{company}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {count} / {totalParticipants}
                                            </span>
                                        </div>
                                        <Progress value={totalParticipants > 0 ? (count / totalParticipants) * 100 : 0} className="w-full" />
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Participantes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Participantes
                    </CardTitle>
                    <CardDescription>
                        Lista de todos os participantes com informações detalhadas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Presença</TableHead>
                                <TableHead>Certificado</TableHead>
                                <TableHead>Check-in</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center">Carregando...</TableCell>
                                </TableRow>
                            )}
                            {filteredParticipants.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center">Nenhum participante encontrado</TableCell>
                                </TableRow>
                            )}
                            {filteredParticipants.map((participant: EventParticipant) => {
                                const event = eventosArray.find(e => e.id === participant.eventId);

                                return (
                                    <TableRow key={participant.id}>
                                        <TableCell className="font-medium">{participant.name}</TableCell>
                                        <TableCell>{participant.cpf}</TableCell>
                                        <TableCell>
                                            {participant.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    {participant.email}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {participant.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    {participant.phone}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-muted-foreground" />
                                                {participant.company}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={participant.presenceConfirmed ? 'default' : 'outline'}>
                                                {participant.presenceConfirmed ? (
                                                    <div className="flex items-center gap-1">
                                                        <UserCheck className="h-3 w-3" />
                                                        Confirmada
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Pendente
                                                    </div>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={participant.certificateIssued ? 'default' : 'outline'}>
                                                {participant.certificateIssued ? (
                                                    <div className="flex items-center gap-1">
                                                        <Award className="h-3 w-3" />
                                                        Emitido
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Award className="h-3 w-3" />
                                                        Pendente
                                                    </div>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {participant.checkIn ? (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-green-600" />
                                                    {new Date(participant.checkIn).toLocaleDateString('pt-BR')}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
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
                                                    onClick={() => handleViewDetails(participant)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <EventParticipantEditDialog participant={participant} />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(participant)}
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
                    setSelectedParticipant(null);
                }}
                onConfirm={confirmDelete}
                title="Excluir Participante"
                description={`Tem certeza que deseja excluir o participante "${selectedParticipant?.name}"? Esta ação não pode ser desfeita.`}
                isLoading={deleteParticipantMutation.isPending}
            />

            <DetailsDialog
                isOpen={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setSelectedParticipant(null);
                }}
                data={selectedParticipant}
                type="participant"
            />
        </div>
    );
};

export default EventParticipantsDashboard; 