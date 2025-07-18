"use client";
import { useState } from 'react';
import { useEventStaff } from '../api/query/use-event-staff';
import { useEventos } from '../api/query/use-eventos';
import { useDeleteEventStaff } from '../api/mutation/use-delete-event-staff';
import { useCreateEventStaff } from "@/features/eventos/api/mutation/use-create-event-staff";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { EventStaff } from '../types';
import EventStaffCreateDialog from './event-staff-create-dialog';
import EventStaffEditDialog from './event-staff-edit-dialog';
import DeleteConfirmationDialog from './delete-confirmation-dialog';
import DetailsDialog from './details-dialog';
import ExcelActions from "@/components/ui/excel-actions";
import {
    Users,
    UserCheck,
    Shield,
    Activity,
    Mail,
    Phone,
    UserCog,
    Eye,
    Trash2,
    Search
} from 'lucide-react';

const EventStaffDashboard = () => {
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<EventStaff | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Buscar dados
    const { data: staff, isLoading: staffLoading } = useEventStaff();
    const { data: eventos, isLoading: eventosLoading } = useEventos();
    const deleteStaffMutation = useDeleteEventStaff();
    const createStaffMutation = useCreateEventStaff();

    // Garantir que todos os dados são arrays
    const staffArray = Array.isArray(staff) ? staff : [];
    const eventosArray = Array.isArray(eventos) ? eventos : [];

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

    // Filtrar staff por evento selecionado e pesquisa
    const filteredStaff = filterBySearch(
        selectedEventId === 'all' ? staffArray : staffArray.filter(s => s.eventId === selectedEventId),
        ['name', 'email', 'cpf', 'permissions', 'supervisorName']
    ) as EventStaff[];

    // Calcular KPIs
    const totalStaff = filteredStaff.length;
    const adminStaff = filteredStaff.filter(s => s.permissions === 'admin').length;
    const managerStaff = filteredStaff.filter(s => s.permissions === 'manager').length;
    const editorStaff = filteredStaff.filter(s => s.permissions === 'editor').length;
    const viewerStaff = filteredStaff.filter(s => s.permissions === 'viewer').length;
    const staffWithEmail = filteredStaff.filter(s => s.email).length;
    const staffWithPhone = filteredStaff.filter(s => s.phone).length;
    const staffWithSupervisor = filteredStaff.filter(s => s.supervisorName).length;

    // Calcular percentuais
    const adminPercentage = totalStaff > 0 ? (adminStaff / totalStaff) * 100 : 0;
    const emailCompletionRate = totalStaff > 0 ? (staffWithEmail / totalStaff) * 100 : 0;
    const phoneCompletionRate = totalStaff > 0 ? (staffWithPhone / totalStaff) * 100 : 0;
    const supervisorRate = totalStaff > 0 ? (staffWithSupervisor / totalStaff) * 100 : 0;

    // Evento selecionado
    const selectedEvent = eventosArray.find(e => e.id === selectedEventId);

    const isLoading = staffLoading || eventosLoading;

    // Preparar dados para exportação
    const exportData = filteredStaff.map(staffMember => {
        const event = eventosArray.find(e => e.id === staffMember.eventId);
        return {
            'Nome': staffMember.name,
            'Email': staffMember.email || '',
            'CPF': staffMember.cpf || '',
            'Telefone': staffMember.phone || '',
            'Permissões': staffMember.permissions === 'admin' ? 'Administrador' :
                staffMember.permissions === 'manager' ? 'Gerente' :
                    staffMember.permissions === 'editor' ? 'Editor' : 'Visualizador',
            'Supervisor': staffMember.supervisorName || '',
            'CPF do Supervisor': staffMember.supervisorCpf || '',
            'Evento': event?.name || '',
            'Status do Evento': event?.status === 'active' ? 'Ativo' :
                event?.status === 'closed' ? 'Fechado' :
                    event?.status === 'canceled' ? 'Cancelado' : 'Rascunho',
        };
    });

    // Função para importar staff
    const handleImportStaff = async (importedData: Record<string, unknown>[]) => {
        try {
            for (const row of importedData) {
                const permissionsValue = row['Permissões'];
                let permissions: "admin" | "manager" | "editor" | "viewer" = "viewer";

                if (permissionsValue === 'Administrador') permissions = "admin";
                else if (permissionsValue === 'Gerente') permissions = "manager";
                else if (permissionsValue === 'Editor') permissions = "editor";

                // Encontrar o evento pelo nome
                const eventName = String(row['Evento'] || '');
                const event = eventosArray.find(e => e.name === eventName);

                if (!event) {
                    console.warn(`Evento não encontrado: ${eventName}`);
                    continue;
                }

                const staffData = {
                    eventId: event.id,
                    name: String(row['Nome'] || ''),
                    email: String(row['Email'] || ''),
                    cpf: String(row['CPF'] || ''),
                    phone: String(row['Telefone'] || ''),
                    permissions,
                    supervisorName: String(row['Supervisor'] || ''),
                    supervisorCpf: String(row['CPF do Supervisor'] || ''),
                    password: 'senha123', // Senha padrão para importação
                };

                await createStaffMutation.mutateAsync(staffData);
            }
        } catch (error) {
            console.error('Erro ao importar staff:', error);
        }
    };

    // Handlers
    const handleViewDetails = (staffMember: EventStaff) => {
        setSelectedStaff(staffMember);
        setDetailsDialogOpen(true);
    };

    const handleDelete = (staffMember: EventStaff) => {
        setSelectedStaff(staffMember);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedStaff) return;

        try {
            await deleteStaffMutation.mutateAsync({
                id: selectedStaff.id,
                performedBy: "current-user" // TODO: Pegar do contexto de autenticação
            });
            setDeleteDialogOpen(false);
            setSelectedStaff(null);
        } catch (error) {
            console.error('Erro ao excluir staff:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Operador de Eventos</h2>
                    <p className="text-muted-foreground">
                        {selectedEventId === 'all'
                            ? 'Gerenciamento de toda a equipe'
                            : `Staff do evento: ${selectedEvent?.name || 'Carregando...'}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ExcelActions
                        data={exportData}
                        filename="operadores"
                        onImport={handleImportStaff}
                        disabled={isLoading}
                    />
                    <EventStaffCreateDialog />
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
                            placeholder="Pesquisar staff..."
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
                        <CardTitle className="text-sm font-medium">Total de Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStaff}</div>
                        <p className="text-xs text-muted-foreground">
                            {adminStaff} administradores
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Com Supervisor</CardTitle>
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{staffWithSupervisor}</div>
                        <p className="text-xs text-muted-foreground">
                            {supervisorRate.toFixed(1)}% supervisionados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Com Email</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{staffWithEmail}</div>
                        <p className="text-xs text-muted-foreground">
                            {emailCompletionRate.toFixed(1)}% de completude
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Com Telefone</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{staffWithPhone}</div>
                        <p className="text-xs text-muted-foreground">
                            {phoneCompletionRate.toFixed(1)}% de completude
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Métricas Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Distribuição de Permissões */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Distribuição de Permissões
                        </CardTitle>
                        <CardDescription>
                            Níveis de acesso da equipe
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Administradores</span>
                                <span className="text-sm text-muted-foreground">
                                    {adminStaff} / {totalStaff}
                                </span>
                            </div>
                            <Progress value={adminPercentage} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Gerentes</span>
                                <span className="text-sm text-muted-foreground">
                                    {managerStaff} / {totalStaff}
                                </span>
                            </div>
                            <Progress value={totalStaff > 0 ? (managerStaff / totalStaff) * 100 : 0} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Editores</span>
                                <span className="text-sm text-muted-foreground">
                                    {editorStaff} / {totalStaff}
                                </span>
                            </div>
                            <Progress value={totalStaff > 0 ? (editorStaff / totalStaff) * 100 : 0} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Visualizadores</span>
                                <span className="text-sm text-muted-foreground">
                                    {viewerStaff} / {totalStaff}
                                </span>
                            </div>
                            <Progress value={totalStaff > 0 ? (viewerStaff / totalStaff) * 100 : 0} className="w-full" />
                        </div>
                    </CardContent>
                </Card>

                {/* Completude de Dados */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5" />
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

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Com Supervisor</span>
                                <span className="text-sm text-muted-foreground">
                                    {supervisorRate.toFixed(1)}%
                                </span>
                            </div>
                            <Progress value={supervisorRate} className="w-full" />
                        </div>
                    </CardContent>
                </Card>

                {/* Resumo de Atividades */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Resumo de Atividades
                        </CardTitle>
                        <CardDescription>
                            Estatísticas gerais
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Total de Staff</span>
                                <span className="font-medium">{totalStaff}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Administradores</span>
                                <span className="font-medium">{adminStaff}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Gerentes</span>
                                <span className="font-medium">{managerStaff}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Editores</span>
                                <span className="font-medium">{editorStaff}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Visualizadores</span>
                                <span className="font-medium">{viewerStaff}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Com Supervisor</span>
                                <span className="font-medium">{staffWithSupervisor}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Staff */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Staff
                    </CardTitle>
                    <CardDescription>
                        Lista de toda a equipe com permissões e informações
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Permissão</TableHead>
                                <TableHead>Supervisor</TableHead>
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
                            {filteredStaff.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center">Nenhum staff encontrado</TableCell>
                                </TableRow>
                            )}
                            {filteredStaff.map((staffMember: EventStaff) => {
                                const event = eventosArray.find(e => e.id === staffMember.eventId);

                                return (
                                    <TableRow key={staffMember.id}>
                                        <TableCell className="font-medium">{staffMember.name}</TableCell>
                                        <TableCell>
                                            {staffMember.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    {staffMember.email}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{staffMember.cpf || '-'}</TableCell>
                                        <TableCell>
                                            {staffMember.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    {staffMember.phone}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                staffMember.permissions === 'admin' ? 'default' :
                                                    staffMember.permissions === 'manager' ? 'secondary' :
                                                        staffMember.permissions === 'editor' ? 'outline' :
                                                            'outline'
                                            }>
                                                {staffMember.permissions === 'admin' ? 'Administrador' :
                                                    staffMember.permissions === 'manager' ? 'Gerente' :
                                                        staffMember.permissions === 'editor' ? 'Editor' :
                                                            staffMember.permissions === 'viewer' ? 'Visualizador' :
                                                                'Não definido'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {staffMember.supervisorName ? (
                                                <div className="flex items-center gap-2">
                                                    <UserCog className="h-4 w-4 text-muted-foreground" />
                                                    {staffMember.supervisorName}
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
                                                    onClick={() => handleViewDetails(staffMember)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <EventStaffEditDialog staff={staffMember} />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(staffMember)}
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
                    setSelectedStaff(null);
                }}
                onConfirm={confirmDelete}
                title="Excluir Staff"
                description={`Tem certeza que deseja excluir o staff "${selectedStaff?.name}"? Esta ação não pode ser desfeita.`}
                isLoading={deleteStaffMutation.isPending}
            />

            <DetailsDialog
                isOpen={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setSelectedStaff(null);
                }}
                data={selectedStaff}
                type="staff"
            />
        </div>
    );
};

export default EventStaffDashboard; 