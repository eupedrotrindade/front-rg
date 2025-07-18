"use client";
import { useState } from 'react';
import { useEventManagers } from '../api/query/use-event-managers';
import { useEventos } from '../api/query/use-eventos';
import { useDeleteEventManager } from '../api/mutation/use-delete-event-manager';
import { useCreateEventManager } from "@/features/eventos/api/mutation/use-create-event-manager";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { EventManager } from '../types';
import EventManagerCreateDialog from './event-manager-create-dialog';
import EventManagerEditDialog from './event-manager-edit-dialog';
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
    Eye,
    Trash2,
    Search
} from 'lucide-react';

const EventManagersDashboard = () => {
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedManager, setSelectedManager] = useState<EventManager | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Buscar dados
    const { data: managers, isLoading: managersLoading } = useEventManagers();
    const { data: eventos, isLoading: eventosLoading } = useEventos();
    const deleteManagerMutation = useDeleteEventManager();
    const createManagerMutation = useCreateEventManager();

    // Garantir que todos os dados são arrays
    const managersArray = Array.isArray(managers) ? managers : [];
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

    // Filtrar gerentes por evento selecionado e pesquisa
    const filteredManagers = filterBySearch(
        selectedEventId === 'all' ? managersArray : managersArray.filter(m => m.eventId === selectedEventId),
        ['name', 'email', 'cpf', 'permissions']
    ) as EventManager[];

    // Calcular KPIs
    const totalManagers = filteredManagers.length;
    const adminManagers = filteredManagers.filter(m => m.permissions === 'admin').length;
    const managerManagers = filteredManagers.filter(m => m.permissions === 'manager').length;
    const editorManagers = filteredManagers.filter(m => m.permissions === 'editor').length;
    const viewerManagers = filteredManagers.filter(m => m.permissions === 'viewer').length;
    const managersWithEmail = filteredManagers.filter(m => m.email).length;
    const managersWithPhone = filteredManagers.filter(m => m.phone).length;

    // Calcular percentuais
    const adminPercentage = totalManagers > 0 ? (adminManagers / totalManagers) * 100 : 0;
    const emailCompletionRate = totalManagers > 0 ? (managersWithEmail / totalManagers) * 100 : 0;
    const phoneCompletionRate = totalManagers > 0 ? (managersWithPhone / totalManagers) * 100 : 0;

    // Evento selecionado
    const selectedEvent = eventosArray.find(e => e.id === selectedEventId);

    const isLoading = managersLoading || eventosLoading;

    // Preparar dados para exportação
    const exportData = filteredManagers.map(manager => {
        const event = eventosArray.find(e => e.id === manager.eventId);
        return {
            'Nome': manager.name,
            'Email': manager.email || '',
            'CPF': manager.cpf || '',
            'Telefone': manager.phone || '',
            'Permissões': manager.permissions === 'admin' ? 'Administrador' :
                manager.permissions === 'manager' ? 'Gerente' :
                    manager.permissions === 'editor' ? 'Editor' : 'Visualizador',
            'Evento': event?.name || '',
            'Status do Evento': event?.status === 'active' ? 'Ativo' :
                event?.status === 'closed' ? 'Fechado' :
                    event?.status === 'canceled' ? 'Cancelado' : 'Rascunho',
        };
    });

    // Função para importar gerentes
    const handleImportManagers = async (importedData: Record<string, unknown>[]) => {
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

                const managerData = {
                    eventId: event.id,
                    name: String(row['Nome'] || ''),
                    email: String(row['Email'] || ''),
                    cpf: String(row['CPF'] || ''),
                    phone: String(row['Telefone'] || ''),
                    permissions,
                    password: 'senha123', // Senha padrão para importação
                };

                await createManagerMutation.mutateAsync(managerData);
            }
        } catch (error) {
            console.error('Erro ao importar gerentes:', error);
        }
    };

    // Handlers
    const handleViewDetails = (manager: EventManager) => {
        setSelectedManager(manager);
        setDetailsDialogOpen(true);
    };

    const handleDelete = (manager: EventManager) => {
        setSelectedManager(manager);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedManager) return;

        try {
            await deleteManagerMutation.mutateAsync({
                id: selectedManager.id,
                performedBy: "current-user" // TODO: Pegar do contexto de autenticação
            });
            setDeleteDialogOpen(false);
            setSelectedManager(null);
        } catch (error) {
            console.error('Erro ao excluir gerente:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Gerentes de Eventos</h2>
                    <p className="text-muted-foreground">
                        {selectedEventId === 'all'
                            ? 'Gerenciamento de todos os gerentes'
                            : `Gerentes do evento: ${selectedEvent?.name || 'Carregando...'}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ExcelActions
                        data={exportData}
                        filename="gerentes"
                        onImport={handleImportManagers}
                        disabled={isLoading}
                    />
                    <EventManagerCreateDialog />
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
                            placeholder="Pesquisar gerentes..."
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
                        <CardTitle className="text-sm font-medium">Total de Gerentes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalManagers}</div>
                        <p className="text-xs text-muted-foreground">
                            {adminManagers} administradores
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{adminManagers}</div>
                        <p className="text-xs text-muted-foreground">
                            {adminPercentage.toFixed(1)}% do total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Com Email</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{managersWithEmail}</div>
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
                        <div className="text-2xl font-bold">{managersWithPhone}</div>
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
                            Níveis de acesso dos gerentes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Administradores</span>
                                <span className="text-sm text-muted-foreground">
                                    {adminManagers} / {totalManagers}
                                </span>
                            </div>
                            <Progress value={adminPercentage} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Gerentes</span>
                                <span className="text-sm text-muted-foreground">
                                    {managerManagers} / {totalManagers}
                                </span>
                            </div>
                            <Progress value={totalManagers > 0 ? (managerManagers / totalManagers) * 100 : 0} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Editores</span>
                                <span className="text-sm text-muted-foreground">
                                    {editorManagers} / {totalManagers}
                                </span>
                            </div>
                            <Progress value={totalManagers > 0 ? (editorManagers / totalManagers) * 100 : 0} className="w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Visualizadores</span>
                                <span className="text-sm text-muted-foreground">
                                    {viewerManagers} / {totalManagers}
                                </span>
                            </div>
                            <Progress value={totalManagers > 0 ? (viewerManagers / totalManagers) * 100 : 0} className="w-full" />
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
                                <span>Total de Gerentes</span>
                                <span className="font-medium">{totalManagers}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Administradores</span>
                                <span className="font-medium">{adminManagers}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Gerentes</span>
                                <span className="font-medium">{managerManagers}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Editores</span>
                                <span className="font-medium">{editorManagers}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Visualizadores</span>
                                <span className="font-medium">{viewerManagers}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Gerentes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Gerentes
                    </CardTitle>
                    <CardDescription>
                        Lista de todos os gerentes com permissões e informações
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
                                <TableHead>Evento</TableHead>
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center">Carregando...</TableCell>
                                </TableRow>
                            )}
                            {filteredManagers.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center">Nenhum gerente encontrado</TableCell>
                                </TableRow>
                            )}
                            {filteredManagers.map((manager: EventManager) => {
                                const event = eventosArray.find(e => e.id === manager.eventId);

                                return (
                                    <TableRow key={manager.id}>
                                        <TableCell className="font-medium">{manager.name}</TableCell>
                                        <TableCell>
                                            {manager.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    {manager.email}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{manager.cpf || '-'}</TableCell>
                                        <TableCell>
                                            {manager.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    {manager.phone}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                manager.permissions === 'admin' ? 'default' :
                                                    manager.permissions === 'manager' ? 'secondary' :
                                                        manager.permissions === 'editor' ? 'outline' :
                                                            'outline'
                                            }>
                                                {manager.permissions === 'admin' ? 'Administrador' :
                                                    manager.permissions === 'manager' ? 'Gerente' :
                                                        manager.permissions === 'editor' ? 'Editor' :
                                                            manager.permissions === 'viewer' ? 'Visualizador' :
                                                                'Não definido'}
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
                                                    onClick={() => handleViewDetails(manager)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <EventManagerEditDialog manager={manager} />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(manager)}
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
                    setSelectedManager(null);
                }}
                onConfirm={confirmDelete}
                title="Excluir Gerente"
                description={`Tem certeza que deseja excluir o gerente "${selectedManager?.name}"? Esta ação não pode ser desfeita.`}
                isLoading={deleteManagerMutation.isPending}
            />

            <DetailsDialog
                isOpen={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setSelectedManager(null);
                }}
                data={selectedManager}
                type="manager"
            />
        </div>
    );
};

export default EventManagersDashboard; 