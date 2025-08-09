/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventAttendanceByEventAndDate } from '@/features/eventos/api/query/use-event-attendance'
import { useCredentials } from '@/features/eventos/api/query'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, BarChart3, Building, Calendar, TrendingUp, Users, Clock, Activity, MapPin, CalendarDays, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import EventLayout from '@/components/dashboard/dashboard-layout'

export default function EventDashboardPage() {
    const params = useParams()
    const router = useRouter()
    const { data: eventos } = useEventos()
    const {
        data: participantsData = [],
        isLoading: participantsLoading,
    } = useEventParticipantsByEvent({ eventId: String(params.id) });

    const { data: credentials } = useCredentials({ eventId: String(params.id) })
    const { data: empresas = [], isLoading: empresasLoading } = useEmpresasByEvent(String(params.id))

    const [selectedDay, setSelectedDay] = useState<string>('')

    const evento = Array.isArray(eventos)
        ? eventos.find((e) => String(e.id) === String(params.id))
        : undefined

    const participantsArray = Array.isArray(participantsData) ? participantsData : []
    const credentialsArray = Array.isArray(credentials) ? credentials : []
    const empresasArray = Array.isArray(empresas) ? empresas : []

    // Função para converter data para formato da API (dd-mm-yyyy)
    const formatDateForAPI = useCallback((dateStr: string): string => {
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${day}-${month}-${year}`;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        }

        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear().toString();
                return `${day}-${month}-${year}`;
            }
        } catch (error) {
            console.error('Erro ao converter data para API:', dateStr, error);
        }

        return dateStr;
    }, []);

    // Hook para buscar dados de attendance do dia selecionado
    const { data: attendanceData = [], isLoading: attendanceLoading } = useEventAttendanceByEventAndDate(
        String(params.id),
        formatDateForAPI(selectedDay)
    )

    // Função para normalizar formato de data
    const normalizeDate = useCallback((dateStr: string): string => {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }

        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('pt-BR');
            }
        } catch (error) {
            console.error('Erro ao converter data:', dateStr, error);
        }

        return dateStr;
    }, []);

    // Função para gerar tabs dos dias do evento
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string }> => {
        if (!evento) return [];

        const days: Array<{ id: string; label: string; date: string; type: string }> = [];

        // Adicionar dias de montagem
        if (evento.setupStartDate && evento.setupEndDate) {
            const startDate = new Date(evento.setupStartDate);
            const endDate = new Date(evento.setupEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (MONTAGEM)`,
                    date: dateStr,
                    type: 'setup'
                });
            }
        }

        // Adicionar dias de evento
        if (evento.preparationStartDate && evento.preparationEndDate) {
            const startDate = new Date(evento.preparationStartDate);
            const endDate = new Date(evento.preparationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (EVENTO)`,
                    date: dateStr,
                    type: 'preparation'
                });
            }
        }

        // Adicionar dias de finalização
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            const startDate = new Date(evento.finalizationStartDate);
            const endDate = new Date(evento.finalizationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toLocaleDateString('pt-BR');
                days.push({
                    id: dateStr,
                    label: `${dateStr} (DESMONTAGEM)`,
                    date: dateStr,
                    type: 'finalization'
                });
            }
        }

        return days;
    }, [evento]);

    // Função para filtrar participantes por dia selecionado
    const getParticipantesPorDia = useCallback((dia: string) => {
        if (!dia) return participantsArray;

        return participantsArray.filter((participant: any) => {
            if (!participant.daysWork || participant.daysWork.length === 0) {
                return false;
            }

            const normalizedDia = normalizeDate(dia);
            const hasDay = participant.daysWork.some((workDay: string) => {
                const normalizedWorkDay = normalizeDate(workDay);
                return normalizedWorkDay === normalizedDia;
            });

            return hasDay;
        });
    }, [participantsArray, normalizeDate]);

    // Função para verificar se o participante já fez check-in no dia selecionado
    const hasCheckIn = useCallback((participantId: string, date: string): boolean => {
        if (!attendanceData || attendanceData.length === 0) return false;

        const normalizedDate = normalizeDate(date);
        return attendanceData.some((attendance: any) => {
            const normalizedAttendanceDate = normalizeDate(attendance.date);
            return attendance.participantId === participantId &&
                attendance.checkIn !== null &&
                normalizedAttendanceDate === normalizedDate;
        });
    }, [attendanceData, normalizeDate]);

    // KPIs baseados no dia selecionado
    const participantesDoDia = getParticipantesPorDia(selectedDay)

    // Calcular estatísticas por credencial
    const getCredentialStats = useCallback(() => {
        const stats: Record<string, { total: number; checkedIn: number; credentialName: string; color: string }> = {}

        credentialsArray.forEach((credential: any) => {
            const participantsWithCredential = participantesDoDia.filter((p: any) => p.credentialId === credential.id)
            const checkedInWithCredential = participantsWithCredential.filter((p: any) => hasCheckIn(p.id, selectedDay))

            stats[credential.id] = {
                total: participantsWithCredential.length,
                checkedIn: checkedInWithCredential.length,
                credentialName: credential.nome,
                color: credential.cor
            }
        })

        // Adicionar participantes sem credencial
        const participantsWithoutCredential = participantesDoDia.filter((p: any) => !p.credentialId)
        const checkedInWithoutCredential = participantsWithoutCredential.filter((p: any) => hasCheckIn(p.id, selectedDay))

        if (participantsWithoutCredential.length > 0) {
            stats['no-credential'] = {
                total: participantsWithoutCredential.length,
                checkedIn: checkedInWithoutCredential.length,
                credentialName: 'SEM CREDENCIAL',
                color: '#6B7280'
            }
        }

        return stats
    }, [participantesDoDia, credentialsArray, hasCheckIn, selectedDay])

    // Simplificar as estatísticas para o dashboard
    const totalCheckedInToday = useMemo(() => {
        return participantesDoDia.filter(p => hasCheckIn(p.id, selectedDay)).length;
    }, [participantesDoDia, hasCheckIn, selectedDay]);

    // Calcular estatísticas resumidas por empresa
    const getCompanySummary = useCallback(() => {
        const stats: Record<string, { total: number; checkedIn: number; companyName: string }> = {}

        // Agrupar participantes por empresa
        const participantsByCompany = participantesDoDia.reduce((acc: any, participant: any) => {
            const companyName = participant.company || 'SEM EMPRESA';
            if (!acc[companyName]) {
                acc[companyName] = [];
            }
            acc[companyName].push(participant);
            return acc;
        }, {});

        // Calcular estatísticas para cada empresa
        Object.entries(participantsByCompany).forEach(([companyName, participants]: [string, any]) => {
            const checkedInParticipants = participants.filter((p: any) => hasCheckIn(p.id, selectedDay));

            stats[companyName] = {
                total: participants.length,
                checkedIn: checkedInParticipants.length,
                companyName
            }
        });

        return stats;
    }, [participantesDoDia, hasCheckIn, selectedDay]);

    // Definir primeiro dia como padrão se não houver seleção
    const eventDays = getEventDays();
    if (!selectedDay && eventDays.length > 0) {
        setSelectedDay(eventDays[0].id);
    }

    const credentialStats = getCredentialStats();
    const companySummary = getCompanySummary();

    const isLoading = participantsLoading || empresasLoading || attendanceLoading;

    if (!evento) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
                    <Button onClick={() => router.back()}>Voltar</Button>
                </div>
            </div>
        )
    }

    return (
        <EventLayout eventId={String(params.id)} eventName={evento.name}>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/eventos/${params.id}`)}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar para Participantes
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <Activity className="w-8 h-8 text-blue-600" />
                                Dashboard do Evento
                            </h1>
                            <p className="text-gray-600">
                                Visão geral e acompanhamento em tempo real do evento
                            </p>
                        </div>
                    </div>

                    {/* Seletor de Dia */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Selecione o dia para análise:
                        </label>
                        <Select value={selectedDay} onValueChange={setSelectedDay}>
                            <SelectTrigger className="w-80 bg-white">
                                <SelectValue placeholder="Selecione um dia" />
                            </SelectTrigger>
                            <SelectContent>
                                {eventDays.map((day) => (
                                    <SelectItem key={day.id} value={day.id}>
                                        {day.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Activity className="w-8 h-8 text-gray-400 animate-pulse" />
                            </div>
                            <p className="text-lg font-semibold text-gray-700 mb-2">Carregando informações do evento...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Informações do Evento */}
                        <div className="mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Total de Participantes */}
                                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-blue-600 text-sm font-medium">Total Participantes</p>
                                                <p className="text-3xl font-bold text-blue-900">{participantsArray.length}</p>
                                            </div>
                                            <Users className="w-8 h-8 text-blue-600" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Check-ins do Dia */}
                                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-green-600 text-sm font-medium">Check-ins Hoje</p>
                                                <p className="text-3xl font-bold text-green-900">
                                                    {totalCheckedInToday}
                                                </p>
                                                <p className="text-xs text-green-600">
                                                    de {participantesDoDia.length} esperados
                                                </p>
                                            </div>
                                            <UserCheck className="w-8 h-8 text-green-600" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Credenciais Ativas */}
                                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-purple-600 text-sm font-medium">Credenciais Ativas</p>
                                                <p className="text-3xl font-bold text-purple-900">{credentialsArray.length}</p>
                                            </div>
                                            <MapPin className="w-8 h-8 text-purple-600" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Empresas Participantes */}
                                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-orange-600 text-sm font-medium">Empresas</p>
                                                <p className="text-3xl font-bold text-orange-900">{empresasArray.length}</p>
                                            </div>
                                            <Building className="w-8 h-8 text-orange-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Resumo de Credenciais */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Resumo por Credenciais - {selectedDay}
                                </h2>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/eventos/${params.id}/analytics`)}
                                    className="flex items-center gap-2"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Ver Análises Detalhadas
                                </Button>
                            </div>

                            {Object.keys(credentialStats).length === 0 ? (
                                <Card className="bg-gray-50 border-dashed">
                                    <CardContent className="p-6 text-center">
                                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600 text-sm">
                                            Nenhum participante para o dia selecionado
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(credentialStats).slice(0, 6).map(([credentialId, stats]) => (
                                        <Card key={credentialId} className="border-l-4" style={{ borderLeftColor: stats.color }}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: stats.color }}
                                                        />
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {stats.credentialName}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {stats.checkedIn}/{stats.total}
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-600">
                                                        {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="h-2 rounded-full transition-all duration-300"
                                                            style={{
                                                                backgroundColor: stats.color,
                                                                width: stats.total > 0 ? `${(stats.checkedIn / stats.total) * 100}%` : '0%'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Resumo de Empresas */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Building className="w-5 h-5 text-green-600" />
                                    Resumo por Empresas - {selectedDay}
                                </h2>
                            </div>

                            {Object.keys(companySummary).length === 0 ? (
                                <Card className="bg-gray-50 border-dashed">
                                    <CardContent className="p-6 text-center">
                                        <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600 text-sm">
                                            Nenhuma empresa para o dia selecionado
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(companySummary)
                                        .sort(([, a], [, b]) => b.total - a.total)
                                        .slice(0, 6)
                                        .map(([companyName, stats]) => {
                                            // Gerar cor baseada no nome da empresa
                                            const getCompanyColor = (name: string) => {
                                                const colors = [
                                                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                                                    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
                                                    '#EC4899', '#6366F1', '#14B8A6', '#F87171'
                                                ];
                                                let hash = 0;
                                                for (let i = 0; i < name.length; i++) {
                                                    hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                                }
                                                return colors[Math.abs(hash) % colors.length];
                                            };

                                            const companyColor = getCompanyColor(companyName);
                                            const percentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

                                            return (
                                                <Card key={companyName} className="border-l-4" style={{ borderLeftColor: companyColor }}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: companyColor }}
                                                                />
                                                                <span className="text-sm font-medium text-gray-900 truncate">
                                                                    {stats.companyName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {stats.checkedIn}/{stats.total}
                                                            </div>
                                                            <div className="text-sm font-medium text-gray-600">
                                                                {percentage}%
                                                            </div>
                                                        </div>
                                                        <div className="mt-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="h-2 rounded-full transition-all duration-300"
                                                                    style={{
                                                                        backgroundColor: companyColor,
                                                                        width: `${percentage}%`
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500 text-center">
                                                            {stats.checkedIn} presentes
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        {/* Ações Rápidas */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-blue-600" />
                                Ações Rápidas
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Button
                                    variant="outline"
                                    className="p-4 h-auto flex flex-col gap-2"
                                    onClick={() => router.push(`/eventos/${params.id}`)}
                                >
                                    <Users className="w-6 h-6 text-blue-600" />
                                    <span className="font-medium">Gerenciar Participantes</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="p-4 h-auto flex flex-col gap-2"
                                    onClick={() => router.push(`/eventos/${params.id}/dashboard`)}
                                >
                                    <BarChart3 className="w-6 h-6 text-green-600" />
                                    <span className="font-medium">Análises Detalhadas</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="p-4 h-auto flex flex-col gap-2"
                                    onClick={() => router.push(`/eventos/${params.id}/credenciais`)}
                                >
                                    <MapPin className="w-6 h-6 text-purple-600" />
                                    <span className="font-medium">Credenciais</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="p-4 h-auto flex flex-col gap-2"
                                    onClick={() => router.push(`/eventos/${params.id}/empresas`)}
                                >
                                    <Building className="w-6 h-6 text-orange-600" />
                                    <span className="font-medium">Empresas</span>
                                </Button>
                            </div>
                        </div>

                        {/* Informações do Evento */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <CalendarDays className="w-5 h-5 text-blue-600" />
                                Períodos do Evento
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Montagem */}
                                {evento.setupStartDate && evento.setupEndDate && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="text-center">
                                                <div className="text-sm font-medium text-green-600 mb-1">MONTAGEM</div>
                                                <div className="text-sm text-gray-600">
                                                    {new Date(evento.setupStartDate).toLocaleDateString('pt-BR')} - {new Date(evento.setupEndDate).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Evento */}
                                {evento.preparationStartDate && evento.preparationEndDate && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="text-center">
                                                <div className="text-sm font-medium text-blue-600 mb-1">EVENTO</div>
                                                <div className="text-sm text-gray-600">
                                                    {new Date(evento.preparationStartDate).toLocaleDateString('pt-BR')} - {new Date(evento.preparationEndDate).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Finalização */}
                                {evento.finalizationStartDate && evento.finalizationEndDate && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="text-center">
                                                <div className="text-sm font-medium text-purple-600 mb-1">FINALIZAÇÃO</div>
                                                <div className="text-sm text-gray-600">
                                                    {new Date(evento.finalizationStartDate).toLocaleDateString('pt-BR')} - {new Date(evento.finalizationEndDate).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </EventLayout>
    )
}