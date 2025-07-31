"use client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Mail,
    Phone,
    User,
    Building,
    Calendar,
    Hash,
    Shield,
    UserCog,
} from "lucide-react";
import { EventManager, EventStaff, EventWristband, EventParticipant, Event } from "../types";
import { getEventTypeLabel } from "@/lib/utils";

interface DetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    data: EventManager | EventStaff | EventWristband | EventParticipant | Event | null;
    type: "manager" | "staff" | "wristband" | "participant" | "event";
    eventData?: Event | null;
}

const DetailsDialog = ({ isOpen, onClose, data, type, eventData }: DetailsDialogProps) => {
    // Função para categorizar dias de trabalho por fase do evento
    const categorizeDaysWork = (participant: EventParticipant, event: Event | null) => {
        if (!participant.daysWork || participant.daysWork.length === 0 || !event) {
            return { setup: [], preparation: [], finalization: [] };
        }

        const categorized = {
            setup: [] as string[],
            preparation: [] as string[],
            finalization: [] as string[]
        };

        participant.daysWork.forEach(day => {
            // Normalizar a data do dia para o início do dia
            const dayDate = new Date(day.split('/').reverse().join('-'));
            dayDate.setHours(0, 0, 0, 0);

            // Verificar se o dia está no período de montagem
            if (event.setupStartDate && event.setupEndDate) {
                const startDate = new Date(event.setupStartDate);
                const endDate = new Date(event.setupEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.setup.push(day);
                    return;
                }
            }

            // Verificar se o dia está no período de Evento/evento
            if (event.preparationStartDate && event.preparationEndDate) {
                const startDate = new Date(event.preparationStartDate);
                const endDate = new Date(event.preparationEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.preparation.push(day);
                    return;
                }
            }

            // Verificar se o dia está no período de finalização
            if (event.finalizationStartDate && event.finalizationEndDate) {
                const startDate = new Date(event.finalizationStartDate);
                const endDate = new Date(event.finalizationEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.finalization.push(day);
                    return;
                }
            }
        });

        return categorized;
    };

    const renderManagerDetails = () => {
        if (!data || type !== "manager") return null;
        const manager = data as EventManager;

        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Informações Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Nome:</span>
                            <span>{manager.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">CPF:</span>
                            <span>{manager.cpf || "Não informado"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Email:</span>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{manager.email || "Não informado"}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Telefone:</span>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{manager.phone || "Não informado"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Permissões
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline" className="text-sm">
                            {manager.permissions === "admin" ? "Administrador" :
                                manager.permissions === "manager" ? "Gerente" :
                                    manager.permissions === "editor" ? "Editor" :
                                        manager.permissions === "viewer" ? "Visualizador" :
                                            "Não definido"}
                        </Badge>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderStaffDetails = () => {
        if (!data || type !== "staff") return null;
        const staff = data as EventStaff;

        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Informações Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Nome:</span>
                            <span>{staff.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">CPF:</span>
                            <span>{staff.cpf || "Não informado"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Email:</span>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{staff.email || "Não informado"}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Telefone:</span>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{staff.phone || "Não informado"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Permissões
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Nível:</span>
                            <Badge variant="outline">
                                {staff.permissions === "admin" ? "Administrador" :
                                    staff.permissions === "manager" ? "Gerente" :
                                        staff.permissions === "editor" ? "Editor" :
                                            staff.permissions === "viewer" ? "Visualizador" :
                                                "Não definido"}
                            </Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Supervisor:</span>
                            <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-muted-foreground" />
                                <span>{staff.supervisorName || "Não informado"}</span>
                            </div>
                        </div>
                        {staff.supervisorCpf && (
                            <div className="flex items-center justify-between">
                                <span className="font-medium">CPF Supervisor:</span>
                                <span>{staff.supervisorCpf}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderWristbandDetails = () => {
        if (!data || type !== "wristband") return null;
        const wristband = data as EventWristband;

        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Hash className="h-5 w-5" />
                            Informações da Credencial
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Código:</span>
                            <span className="font-mono">{wristband.code}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Label:</span>
                            <span>{"Não informado"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Tipo:</span>
                            <Badge variant="outline">{"Não definido"}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Cor:</span>
                            <div className="flex items-center gap-2">
                                <span>{"Não informada"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Ativa:</span>
                            <Badge variant={"default"}>
                                {"Sim"}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Distribuída:</span>
                            <Badge variant={"default"}>
                                {"Sim"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderParticipantDetails = () => {
        if (!data || type !== "participant") return null;
        const participant = data as EventParticipant;

        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Informações Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Nome:</span>
                            <span>{participant.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">CPF:</span>
                            <span>{participant.cpf}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Email:</span>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{participant.email || "Não informado"}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Telefone:</span>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{participant.phone || "Não informado"}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Empresa:</span>
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span>{participant.company}</span>
                            </div>
                        </div>
                        {participant.role && (
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Cargo:</span>
                                <span>{participant.role}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Participação
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Presença Confirmada:</span>
                            <Badge variant={participant.checkIn ? "default" : "outline"}>
                                {participant.checkIn ? "Sim" : "Não"}
                            </Badge>
                        </div>

                        {participant.checkIn && (
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Check-in:</span>
                                <span>{new Date(participant.checkIn).toLocaleString('pt-BR')}</span>
                            </div>
                        )}
                        {participant.checkOut && (
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Check-out:</span>
                                <span>{new Date(participant.checkOut).toLocaleString('pt-BR')}</span>
                            </div>
                        )}
                        {participant.daysWork && participant.daysWork.length > 0 && (
                            <div className="flex items-start justify-between">
                                <span className="font-medium">Dias de Trabalho:</span>
                                <div className="text-right space-y-1">
                                    {(() => {
                                        const categorized = categorizeDaysWork(participant, eventData || null);
                                        return (
                                            <>
                                                {categorized.setup.length > 0 && (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                        <span className="text-sm font-medium text-gray-700">Montagem:</span>
                                                        <span className="text-sm text-gray-600">{categorized.setup.join(', ')}</span>
                                                    </div>
                                                )}
                                                {categorized.preparation.length > 0 && (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <span className="text-sm font-medium text-gray-700">Preparo:</span>
                                                        <span className="text-sm text-gray-600">{categorized.preparation.join(', ')}</span>
                                                    </div>
                                                )}
                                                {categorized.finalization.length > 0 && (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                        <span className="text-sm font-medium text-gray-700">Finalização:</span>
                                                        <span className="text-sm text-gray-600">{categorized.finalization.join(', ')}</span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {participant.notes && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Observações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{participant.notes}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const renderEventDetails = () => {
        if (!data || type !== "event") return null;
        const event = data as Event;

        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Informações do Evento
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Nome:</span>
                            <span>{event.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Tipo:</span>
                            <span>{event.type ? getEventTypeLabel(event.type) : 'Não definido'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Slug:</span>
                            <span className="font-mono">{event.slug}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Status:</span>
                            <Badge variant={
                                event.status === 'active' ? 'default' :
                                    event.status === 'closed' ? 'secondary' :
                                        event.status === 'canceled' ? 'destructive' :
                                            'outline'
                            }>
                                {event.status === 'active' ? 'Ativo' :
                                    event.status === 'closed' ? 'Fechado' :
                                        event.status === 'canceled' ? 'Cancelado' :
                                            'Rascunho'}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Visibilidade:</span>
                            <Badge variant="outline">
                                {event.visibility === 'public' ? 'Público' :
                                    event.visibility === 'private' ? 'Privado' :
                                        'Restrito'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Datas e Local
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Início:</span>
                            <span>{new Date(event.startDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Fim:</span>
                            <span>{new Date(event.endDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Local:</span>
                            <span>{event.venue}</span>
                        </div>
                        {event.address && (
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Endereço:</span>
                                <span>{event.address}</span>
                            </div>
                        )}
                        {event.capacity && (
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Capacidade:</span>
                                <span>{event.capacity} pessoas</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {event.description && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Descrição</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const getTitle = () => {
        if (!data) return "Detalhes";

        switch (type) {
            case "manager":
                return `Detalhes do Gerente - ${(data as EventManager).name || 'Sem nome'}`;
            case "staff":
                return `Detalhes do Staff - ${(data as EventStaff).name || 'Sem nome'}`;
            case "wristband":
                return `Detalhes da Credencial - ${(data as EventWristband).code || 'Sem código'}`;
            case "participant":
                return `Detalhes do Participante - ${(data as EventParticipant).name || 'Sem nome'}`;
            case "event":
                return `Detalhes do Evento - ${(data as Event).name || 'Sem nome'}`;
            default:
                return "Detalhes";
        }
    };

    const renderContent = () => {
        switch (type) {
            case "manager":
                return renderManagerDetails();
            case "staff":
                return renderStaffDetails();
            case "wristband":
                return renderWristbandDetails();
            case "participant":
                return renderParticipantDetails();
            case "event":
                return renderEventDetails();
            default:
                return <div>Detalhes não disponíveis</div>;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                    <DialogDescription>
                        Visualize todas as informações detalhadas
                    </DialogDescription>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};

export default DetailsDialog; 