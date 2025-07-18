/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from 'react';
import { useEventos } from '@/features/eventos/api/query/use-eventos';
import { useEventManagers } from '@/features/eventos/api/query/use-event-managers';
import { useEventStaff } from '@/features/eventos/api/query/use-event-staff';
import { useEventWristbands } from '@/features/eventos/api/query/use-event-wristbands';
import { useEventParticipants } from '@/features/eventos/api/query/use-event-participants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Event } from '@/features/eventos/types';
import EventoCreateDialog from '@/features/eventos/components/evento-create-dialog';
import {
    Users,
    UserCheck,
    Calendar,
    Activity,
    Ticket,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    XCircle,
    BarChart3,
    Target,
    Clock,
    MapPin,

    Star,

    PieChart,
    Users2,
    Crown
} from 'lucide-react';
import { YearCalendar } from '@/features/calendar/components/year-calendar';
import { CalendarLegend } from '@/features/calendar/components/calendar-legend';
import { getYear } from 'date-fns';
import OperatorForm from '@/features/operadores/components/operator-form';
import OperatorList from '@/features/operadores/components/operator-list';
import Link from "next/link";

type WristbandWithEventId = { eventId: string };

export default function Dashboard() {
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<string>('30d');

    // Buscar todos os dados
    const { data: eventos, isLoading: eventosLoading } = useEventos();
    const { data: managers, isLoading: managersLoading } = useEventManagers();
    const { data: staff, isLoading: staffLoading } = useEventStaff();
    const { data: wristbands, isLoading: wristbandsLoading } = useEventWristbands();
    const { data: participants, isLoading: participantsLoading } = useEventParticipants();

    // Garantir que todos os dados são arrays
    const eventosArray = Array.isArray(eventos) ? eventos : [];
    const managersArray = Array.isArray(managers) ? managers : [];
    const staffArray = Array.isArray(staff) ? staff : [];
    const wristbandsArray = Array.isArray(wristbands) ? wristbands : [];
    const participantsArray = Array.isArray(participants) ? participants : [];

    // Filtrar dados por evento selecionado
    const filteredManagers = selectedEventId === 'all'
        ? managersArray
        : managersArray.filter(m => m.eventId === selectedEventId);

    const filteredStaff = selectedEventId === 'all'
        ? staffArray
        : staffArray.filter(s => s.eventId === selectedEventId);

    const filteredWristbands = selectedEventId === 'all'
        ? wristbandsArray
        : (wristbandsArray as unknown as WristbandWithEventId[]).filter(w => w.eventId === selectedEventId);

    const filteredParticipants = selectedEventId === 'all'
        ? participantsArray
        : participantsArray.filter(p => p.eventId === selectedEventId);

    // Calcular KPIs
    const totalEvents = eventosArray.length;
    const activeEvents = eventosArray.filter(e => e.status === 'active').length;
    const upcomingEvents = eventosArray.filter(e => {
        if (!e.startDate) return false;
        const eventDate = new Date(e.startDate);
        const today = new Date();
        return eventDate > today;
    }).length;
    const totalManagers = filteredManagers.length;
    const totalStaff = filteredStaff.length;
    const totalWristbands = filteredWristbands.length;
    const distributedWristbands = filteredWristbands.filter(w => (w as any).isDistributed).length;
    const totalParticipants = filteredParticipants.length;
    const confirmedParticipants = filteredParticipants.filter(p => p.presenceConfirmed).length;

    // Calcular percentuais
    const wristbandDistributionRate = totalWristbands > 0 ? (distributedWristbands / totalWristbands) * 100 : 0;
    const participantConfirmationRate = totalParticipants > 0 ? (confirmedParticipants / totalParticipants) * 100 : 0;

    // Evento selecionado
    const selectedEvent = eventosArray.find(e => e.id === selectedEventId);

    const isLoading = eventosLoading || managersLoading || staffLoading || wristbandsLoading || participantsLoading;

    // Calcular tendências (baseado em dados reais)
    const isWristbandTrendUp = wristbandDistributionRate > 60;
    const isParticipantTrendUp = participantConfirmationRate > 75;

    // Dados reais para gráficos baseados na API
    const eventTypeData = [
        { type: 'Conferências', count: eventosArray.filter(e => e.type === 'conference').length, percentage: eventosArray.length > 0 ? (eventosArray.filter(e => e.type === 'conference').length / eventosArray.length) * 100 : 0, color: 'from-blue-500 to-purple-500' },
        { type: 'Workshops', count: eventosArray.filter(e => e.type === 'workshop').length, percentage: eventosArray.length > 0 ? (eventosArray.filter(e => e.type === 'workshop').length / eventosArray.length) * 100 : 0, color: 'from-green-500 to-blue-500' },
        { type: 'Meetups', count: eventosArray.filter(e => e.type === 'meetup').length, percentage: eventosArray.length > 0 ? (eventosArray.filter(e => e.type === 'meetup').length / eventosArray.length) * 100 : 0, color: 'from-orange-500 to-red-500' },
        { type: 'Treinamentos', count: eventosArray.filter(e => e.type === 'training').length, percentage: eventosArray.length > 0 ? (eventosArray.filter(e => e.type === 'training').length / eventosArray.length) * 100 : 0, color: 'from-purple-500 to-pink-500' },
        { type: 'Outros', count: eventosArray.filter(e => !e.type || !['conference', 'workshop', 'meetup', 'training'].includes(e.type)).length, percentage: eventosArray.length > 0 ? (eventosArray.filter(e => !e.type || !['conference', 'workshop', 'meetup', 'training'].includes(e.type)).length / eventosArray.length) * 100 : 0, color: 'from-gray-500 to-gray-600' },
    ].filter(item => item.count > 0); // Remover tipos com 0 eventos

    const topEvents = eventosArray
        .map(evento => {
            const eventParticipants = participantsArray.filter(p => p.eventId === evento.id);
            const wristbandsForEvent = ((wristbandsArray as unknown) as WristbandWithEventId[]).filter(w => w.eventId === evento.id);
            return {
                ...evento,
                participantCount: eventParticipants.length,
                confirmedCount: eventParticipants.filter(p => p.presenceConfirmed).length,
                wristbandCount: wristbandsForEvent.length,
                distributedCount: wristbandsForEvent.filter(w => (w as any).isDistributed).length,
            };
        })
        .sort((a, b) => b.participantCount - a.participantCount)
        .slice(0, 5);
    return (
        <div className="space-y-6 p-6  min-h-screen">
            {/* Header Principal */}
            <div className="flex items-center justify-between  p-6 rounded-lg shadow-sm">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Dashboard RG Digital
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {selectedEventId === 'all'
                            ? 'Visão geral completa do sistema de eventos'
                            : `Evento: ${selectedEvent?.name || 'Carregando...'}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-4">

                    {/* <EventoCreateDialog /> */}
                </div>
            </div>

            {/* Filtros
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Filtrar por Evento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="w-full">
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Período
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                                <SelectItem value="1y">Último ano</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Métricas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Badge variant="default">Real-time</Badge>
                            <Badge variant="outline">Atualizado agora</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div> */}

            {/* Calendário Anual Resumido
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Calendário Anual de Etapas
                    </CardTitle>
                    <CardDescription>Visualize rapidamente os períodos de montagem, preparação e finalização de todos os eventos do ano.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CalendarLegend />
                    <YearCalendar year={getYear(new Date())} eventos={eventosArray} />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{totalEvents}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                                {activeEvents} ativos
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {upcomingEvents} próximos
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            +12% vs mês anterior
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Equipe Total</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{totalManagers + totalStaff}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                                {totalManagers} gerentes
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {totalStaff} staff
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            +8% vs mês anterior
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Participantes</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">{totalParticipants}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                                {confirmedParticipants} confirmados
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            +15% vs mês anterior
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Credencial</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">{totalWristbands}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                                {distributedWristbands} distribuídas
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            +22% vs mês anterior
                        </div>
                    </CardContent>
                </Card>
            </div>

       
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Tipos de Evento
                        </CardTitle>
                        <CardDescription>
                            Distribuição por categoria
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {eventTypeData.length > 0 ? (
                                eventTypeData.map((data, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{data.type}</span>
                                            <span className="text-muted-foreground">
                                                {data.count} eventos ({data.percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`bg-gradient-to-r ${data.color} h-2 rounded-full transition-all duration-300`}
                                                style={{ width: `${data.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum evento encontrado para análise
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

           
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Status dos Eventos
                        </CardTitle>
                        <CardDescription>
                            Distribuição por status atual
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Ativos</span>
                                    <span className="text-muted-foreground">
                                        {activeEvents} eventos ({totalEvents > 0 ? ((activeEvents / totalEvents) * 100).toFixed(1) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${totalEvents > 0 ? (activeEvents / totalEvents) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Próximos</span>
                                    <span className="text-muted-foreground">
                                        {upcomingEvents} eventos ({totalEvents > 0 ? ((upcomingEvents / totalEvents) * 100).toFixed(1) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${totalEvents > 0 ? (upcomingEvents / totalEvents) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Fechados</span>
                                    <span className="text-muted-foreground">
                                        {eventosArray.filter(e => e.status === 'closed').length} eventos ({totalEvents > 0 ? ((eventosArray.filter(e => e.status === 'closed').length / totalEvents) * 100).toFixed(1) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-gray-500 to-gray-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${totalEvents > 0 ? (eventosArray.filter(e => e.status === 'closed').length / totalEvents) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            Distribuição de Credencial
                            {isWristbandTrendUp ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                        </CardTitle>
                        <CardDescription>
                            Eficiência na distribuição das credenciais
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Distribuídas</span>
                            <span className="text-sm text-muted-foreground">
                                {distributedWristbands} / {totalWristbands}
                            </span>
                        </div>
                        <Progress value={wristbandDistributionRate} className="w-full h-3" />
                        <div className="text-3xl font-bold text-center">
                            {wristbandDistributionRate.toFixed(1)}%
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            {distributedWristbands > 0 ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {distributedWristbands} credenciais entregues
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Nenhuma credencial distribuída
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

       
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5" />
                            Confirmação de Presença
                            {isParticipantTrendUp ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                        </CardTitle>
                        <CardDescription>
                            Taxa de confirmação dos participantes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Confirmados</span>
                            <span className="text-sm text-muted-foreground">
                                {confirmedParticipants} / {totalParticipants}
                            </span>
                        </div>
                        <Progress value={participantConfirmationRate} className="w-full h-3" />
                        <div className="text-3xl font-bold text-center">
                            {participantConfirmationRate.toFixed(1)}%
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            {confirmedParticipants > 0 ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {confirmedParticipants} presenças confirmadas
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Nenhuma confirmação ainda
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className=" gap-6">
          
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            Top 5 Eventos
                        </CardTitle>
                        <CardDescription>
                            Eventos com mais participantes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topEvents.map((evento, index) => (
                                <div key={evento.id} className="flex items-center justify-between p-3  rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{evento.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {evento.participantCount} participantes
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {evento.confirmedCount} confirmados
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                {/* 
              
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Alertas
                        </CardTitle>
                        <CardDescription>
                            Ações necessárias
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-yellow-500 border border-yellow-200 rounded-lg">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <div>
                                    <div className="text-sm font-medium text-yellow-800">Evento próximo</div>
                                    <div className="text-xs text-yellow-600">3 eventos começam em 7 dias</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-red-500 border border-red-200 rounded-lg">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <div>
                                    <div className="text-sm font-medium text-red-800">Credencial pendentes</div>
                                    <div className="text-xs text-red-600">45 credenciais não distribuídas</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-blue-500 border border-blue-200 rounded-lg">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <div>
                                    <div className="text-sm font-medium text-blue-800">Certificados</div>
                                    <div className="text-xs text-blue-600">120 certificados prontos</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

               
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Métricas Rápidas
                        </CardTitle>
                        <CardDescription>
                            Indicadores de performance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-green-500 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium">Taxa de Conversão</span>
                                </div>
                                <span className="text-lg font-bold text-green-600">78%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-500 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium">Receita Média</span>
                                </div>
                                <span className="text-lg font-bold text-purple-600">R$ 45K</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-orange-500 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium">Satisfação</span>
                                </div>
                                <span className="text-lg font-bold text-orange-600">4.8/5</span>
                            </div>
                        </div>
                    </CardContent>
                </Card> 
            </div>

          
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Eventos
                    </CardTitle>
                    <CardDescription>
                        Lista de todos os eventos com status e informações detalhadas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Local</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Fim</TableHead>
                                <TableHead>Participantes</TableHead>
                                <TableHead>Credencial</TableHead>
                                <TableHead>Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            Carregando dados...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {eventosArray.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        Nenhum evento encontrado
                                    </TableCell>
                                </TableRow>
                            )}
                            {eventosArray.map((evento: Event) => {
                                const eventParticipants = participantsArray.filter(p => p.eventId === evento.id);
                                const wristbandsForEvent = ((wristbandsArray as unknown) as WristbandWithEventId[]).filter(w => w.eventId === evento.id);

                                return (
                                    <TableRow key={evento.id} className="hover:">
                                        <TableCell className="font-medium">{evento.name}</TableCell>
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
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                                <span>{evento.venue || evento.name || 'Não informado'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {evento.startDate ? new Date(evento.startDate).toLocaleDateString('pt-BR') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {evento.endDate ? new Date(evento.endDate).toLocaleDateString('pt-BR') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{eventParticipants.length}</span>
                                                {eventParticipants.filter(p => p.presenceConfirmed).length > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {eventParticipants.filter(p => p.presenceConfirmed).length} confirmados
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{(wristbandsForEvent as any[]).length}</span>
                                                {(wristbandsForEvent as any[]).filter(w => w.isDistributed).length > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {(wristbandsForEvent as any[]).filter(w => w.isDistributed).length} distribuídas
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm">Ver Detalhes</Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

       
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users2 className="h-5 w-5" />
                            Participantes por Evento
                        </CardTitle>
                        <CardDescription>
                            Distribuição de participantes nos eventos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topEvents.length > 0 ? (
                                topEvents.map((evento, index) => (
                                    <div key={evento.id + "-" + index} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{evento.name}</span>
                                            <span className="text-muted-foreground">
                                                {evento.participantCount} participantes
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${totalParticipants > 0 ? (evento.participantCount / totalParticipants) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Confirmados: {evento.confirmedCount}</span>
                                            <span>{totalParticipants > 0 ? ((evento.participantCount / totalParticipants) * 100).toFixed(1) : 0}% do total</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum evento com participantes encontrado
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

             
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            Credencial por Evento
                        </CardTitle>
                        <CardDescription>
                            Distribuição de credenciais nos eventos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topEvents.length > 0 ? (
                                topEvents.map((evento, index) => (
                                    <div key={evento.id + index} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{evento.name}</span>
                                            <span className="text-muted-foreground">
                                                {evento.wristbandCount} credenciais
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${totalWristbands > 0 ? (evento.wristbandCount / totalWristbands) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>
                                                Distribuídas: {evento.distributedCount ?? 0}
                                            </span>
                                            <span>
                                                {totalWristbands > 0
                                                    ? ((evento.wristbandCount / totalWristbands) * 100).toFixed(1)
                                                    : 0}
                                                % do total
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum evento com credenciais encontrado
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

         
            <Card className="bg-gradient-to-r from-purple-500 to-blue-500 border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                        <Crown className="h-6 w-6" />
                        Resumo Executivo - RG Digital
                    </CardTitle>
                    <CardDescription className="text-purple-600">
                        Principais conquistas e indicadores de sucesso
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-zinc-900 rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-blue-600 mb-2">{totalEvents}</div>
                            <div className="text-sm font-medium text-gray-700">Eventos Realizados</div>
                            <div className="text-xs text-green-600 mt-1">{activeEvents} ativos</div>
                        </div>

                        <div className="text-center p-4 bg-zinc-900 rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-green-600 mb-2">{totalParticipants}</div>
                            <div className="text-sm font-medium text-gray-700">Participantes Atendidos</div>
                            <div className="text-xs text-green-600 mt-1">{confirmedParticipants} confirmados</div>
                        </div>

                        <div className="text-center p-4 bg-zinc-900 rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-purple-600 mb-2">{totalManagers + totalStaff}</div>
                            <div className="text-sm font-medium text-gray-700">Equipe Total</div>
                            <div className="text-xs text-green-600 mt-1">{totalManagers} gerentes, {totalStaff} staff</div>
                        </div>

                        <div className="text-center p-4 bg-zinc-900 rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-orange-600 mb-2">{totalWristbands}</div>
                            <div className="text-sm font-medium text-gray-700">Credencial</div>
                            <div className="text-xs text-green-600 mt-1">{distributedWristbands} distribuídas</div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-zinc-900 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-3">Principais Conquistas:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Taxa de confirmação: {participantConfirmationRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Distribuição de credenciais: {wristbandDistributionRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{upcomingEvents} eventos próximos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{eventTypeData.length} tipos de eventos</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card> */}

            {/* Seção de Operadores */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users2 className="h-5 w-5" />
                        Gerenciar Operadores
                    </CardTitle>
                    <CardDescription>Adicione e visualize todos os operadores do sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OperatorForm onSuccess={() => { /* Pode adicionar lógica de refetch se necessário */ }} />
                    <OperatorList />
                    <div className="mb-4">
                        <Link href="/dashboard/operator-actions-history" className="text-blue-700 underline hover:text-blue-900 font-semibold">
                            Ver histórico de ações dos operadores
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}