/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventAttendance } from '@/features/eventos/api/query/use-event-attendance'
import { useCredentials } from '@/features/eventos/api/query'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, BarChart3, Building, Calendar, TrendingUp, Users, Clock, Activity, MapPin, CalendarDays, UserCheck, Sun, Moon, Search, X, RefreshCw, ExternalLink } from 'lucide-react'
import { useState, useMemo, useCallback, useEffect } from 'react'
import VirtualizedDashboardList from '@/components/virtualized-dashboard/VirtualizedDashboardList'
import '@/styles/virtualized-dashboard.css'
import { formatEventDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Importar ApexCharts dinamicamente para evitar problemas de SSR
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function PublicDashboardPage() {
    const params = useParams();
    const token = params.token as string;

    // State management - identical to internal dashboard
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // UI States - following internal dashboard pattern
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [credentialFilter, setCredentialFilter] = useState<string>('');
    const [companyFilter, setCompanyFilter] = useState<string>('');

    // Token decoding function (keeping the existing token validation)
    const decodeToken = (token: string) => {
        try {
            if (!token) {
                console.error('Token is empty or undefined');
                return null;
            }

            // First decode URL encoding, then base64
            const urlDecoded = decodeURIComponent(token);
            const decoded = atob(urlDecoded);

            const parts = decoded.split(':');
            if (parts.length !== 2) {
                console.error('Invalid token format. Expected "eventId:timestamp", got:', decoded);
                return null;
            }

            const [eventId, timestampStr] = parts;
            const timestamp = parseInt(timestampStr);

            if (!eventId || isNaN(timestamp)) {
                console.error('Invalid token data');
                return null;
            }

            // Check if token is valid (7 days)
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - timestamp >= sevenDaysInMs) {
                console.error('Token expired');
                return null;
            }

            return { eventId, timestamp };
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    };

    // Decode token to get eventId
    const decodedToken = useMemo(() => decodeToken(token), [token]);
    const eventId = decodedToken?.eventId || "";

    // Use hooks from internal dashboard
    const { data: eventos = [] } = useEventos();
    const { data: participantsData = [] } = useEventParticipantsByEvent({ eventId });
    const { data: attendanceRawData } = useEventAttendance({ eventId });
    const { data: credentials = [] } = useCredentials({ eventId });
    const { data: empresas = [] } = useEmpresasByEvent(eventId);

    // Following internal dashboard pattern for array normalization
    const evento = Array.isArray(eventos)
        ? eventos.find((e) => String(e.id) === String(eventId))
        : undefined;

    // Debug logs para verificar se o evento está sendo encontrado
    useEffect(() => {
        console.log('🔍 Debug evento:', {
            eventId,
            eventosLength: Array.isArray(eventos) ? eventos.length : 0,
            eventosIds: Array.isArray(eventos) ? eventos.map((e: any) => e.id_evento) : [],
            eventoEncontrado: !!evento,
            evento: evento ? {
                id: evento.id,
                nome: evento.name,
                montagem: evento.montagem,
                evento: evento.evento,
                desmontagem: evento.desmontagem
            } : null
        });
    }, [eventId, eventos, evento]);

    const participantsArray = useMemo(() => Array.isArray(participantsData) ? participantsData : [], [participantsData]);
    const credentialsArray = useMemo(() => Array.isArray(credentials) ? credentials : [], [credentials]);

    // Normalizar dados das empresas (identical to internal dashboard)
    const normalizeEmpresas = useCallback((empresasArray: any[]) => {
        console.log('🔍 Dashboard - Normalizando empresas (modelo individual):', empresasArray.length);

        // No novo modelo, cada empresa já representa um shift específico
        // Não precisamos mais de shiftData, pois os campos estão diretamente na empresa
        return empresasArray.map(empresa => {
            // Verificar se tem campos de turno individuais
            if (empresa.shiftId && empresa.workDate && empresa.workStage && empresa.workPeriod) {
                return empresa; // Já está no formato correto
            }

            // Fallback para compatibilidade (empresas antigas sem campos individuais)
            return {
                ...empresa,
                shiftId: empresa.shiftId || '',
                workDate: empresa.workDate || '',
                workStage: empresa.workStage || 'evento',
                workPeriod: empresa.workPeriod || 'diurno'
            };
        });
    }, []);

    // Normalizar todas as empresas
    const empresasArray = useMemo(() => {
        return Array.isArray(empresas) ? normalizeEmpresas(empresas) : [];
    }, [empresas, normalizeEmpresas]);

    // Função para converter data para formato da API (dd-mm-yyyy) - identical to internal
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

    // Função para extrair informações do shift ID - identical to internal
    const parseShiftId = useCallback((shiftId: string) => {
        // Formato esperado: YYYY-MM-DD-stage-period
        const parts = shiftId.split('-');
        if (parts.length >= 5) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            const stage = parts[3];
            const period = parts[4] as 'diurno' | 'noturno';

            return {
                dateISO: `${year}-${month}-${day}`,
                dateFormatted: formatEventDate(`${year}-${month}-${day}T00:00:00`),
                stage,
                period
            };
        }

        // Fallback para formato simples (apenas data)
        return {
            dateISO: shiftId,
            dateFormatted: formatEventDate(shiftId + 'T00:00:00'),
            stage: 'unknown',
            period: 'diurno' as const
        };
    }, []);

    // Extrair informações do turno selecionado - identical to internal
    const shiftInfo = useMemo(() => {
        if (!selectedDay) return null;
        return parseShiftId(selectedDay);
    }, [selectedDay, parseShiftId]);

    // ✅ Normalizar dados de attendance para garantir que seja sempre um array - identical to internal
    const allAttendanceData = useMemo(() => {
        if (!attendanceRawData) return [];
        if (Array.isArray(attendanceRawData)) return attendanceRawData;
        if (typeof attendanceRawData === 'object' && attendanceRawData.data && Array.isArray(attendanceRawData.data)) {
            return attendanceRawData.data;
        }
        return [];
    }, [attendanceRawData]);

    // Função para normalizar formato de data - identical to internal
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
                return formatEventDate(date.toISOString());
            }
        } catch (error) {
            console.error('Erro ao converter data:', dateStr, error);
        }

        return dateStr;
    }, []);

    // Função para gerar tabs dos dias do evento usando nova estrutura com suporte a turnos - IDENTICAL TO INTERNAL
    const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> => {
        if (!evento) return [];

        const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> = [];

        // Função helper para processar arrays de dados do evento (nova estrutura)
        const processEventArray = (eventData: any, stage: string, stageName: string) => {
            if (!eventData) return;

            try {
                let dataArray: any[] = [];

                // Se for string JSON, fazer parse
                if (typeof eventData === 'string') {
                    dataArray = JSON.parse(eventData);
                }
                // Se já for array, usar diretamente
                else if (Array.isArray(eventData)) {
                    dataArray = eventData;
                }
                // Se não for nem string nem array, sair
                else {
                    return;
                }

                // Processar cada item do array
                dataArray.forEach(item => {
                    if (item && item.date) {
                        const formattedDate = formatEventDate(item.date);
                        const dateISO = new Date(item.date).toISOString().split('T')[0]; // YYYY-MM-DD para ID

                        // Usar período do item se disponível, senão calcular baseado na hora
                        let period: 'diurno' | 'noturno' | 'dia_inteiro';
                        if (item.period && (item.period === 'diurno' || item.period === 'noturno' || item.period === 'dia_inteiro')) {
                            period = item.period;
                        } else {
                            // Fallback: calcular baseado na hora
                            const dateObj = new Date(item.date);
                            const hour = dateObj.getHours();
                            period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                        }

                        const periodLabel = period === 'diurno' ? 'Diurno' : period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

                        days.push({
                            id: `${dateISO}-${stage}-${period}`, // ID único incluindo o turno
                            label: `${formattedDate} (${stageName} - ${periodLabel})`,
                            date: formattedDate,
                            type: stage,
                            period
                        });
                    }
                });
            } catch (error) {
                console.warn(`Erro ao processar dados do evento para stage ${stage}:`, error);
            }
        };

        // Processar nova estrutura do evento
        console.log('🔍 Processando evento no dashboard:', {
            montagem: evento.montagem,
            evento: evento.evento,
            desmontagem: evento.desmontagem
        });

        processEventArray(evento.montagem, 'montagem', 'MONTAGEM');
        processEventArray(evento.evento, 'evento', 'EVENTO');
        processEventArray(evento.desmontagem, 'desmontagem', 'DESMONTAGEM');

        // Fallback para estrutura antiga (manter compatibilidade) - só usar se não há nova estrutura
        if (evento.setupStartDate && evento.setupEndDate && (!evento.montagem || evento.montagem.length === 0)) {
            const startDate = new Date(evento.setupStartDate);
            const endDate = new Date(evento.setupEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];
                const hour = date.getHours();
                const period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

                days.push({
                    id: `${dateISO}-montagem-${period}`,
                    label: `${dateStr} (MONTAGEM - ${periodLabel})`,
                    date: dateStr,
                    type: 'montagem',
                    period
                });
            }
        }

        if (evento.preparationStartDate && evento.preparationEndDate && (!evento.evento || evento.evento.length === 0)) {
            const startDate = new Date(evento.preparationStartDate);
            const endDate = new Date(evento.preparationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];
                const hour = date.getHours();
                const period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

                days.push({
                    id: `${dateISO}-evento-${period}`,
                    label: `${dateStr} (EVENTO - ${periodLabel})`,
                    date: dateStr,
                    type: 'evento',
                    period
                });
            }
        }

        if (evento.finalizationStartDate && evento.finalizationEndDate && (!evento.desmontagem || evento.desmontagem.length === 0)) {
            const startDate = new Date(evento.finalizationStartDate);
            const endDate = new Date(evento.finalizationEndDate);
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = formatEventDate(date.toISOString());
                const dateISO = date.toISOString().split('T')[0];
                const hour = date.getHours();
                const period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
                const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno';

                days.push({
                    id: `${dateISO}-desmontagem-${period}`,
                    label: `${dateStr} (DESMONTAGEM - ${periodLabel})`,
                    date: dateStr,
                    type: 'desmontagem',
                    period
                });
            }
        }

        // Ordenar dias cronologicamente
        days.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateA.getTime() - dateB.getTime();
        });

        console.log('📅 Dias gerados no dashboard:', days);
        return days;
    }, [evento]);

    // ✅ Função para obter data atual no formato brasileiro - identical to internal
    const getTodayBR = useCallback(() => {
        const today = new Date();
        return today.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }, []);

    // ✅ Usar useMemo para eventDays (deve vir antes do auto-refresh) - identical to internal
    const eventDays = useMemo(() => {
        return getEventDays();
    }, [getEventDays]);

    // Hooks provide real-time data - no need for manual fetch functions

    // 🔄 Função para atualizar todos os dados - using hooks refetch
    const refreshAllData = useCallback(async () => {
        console.log('🔄 Iniciando refresh dos dados...');
        setIsRefreshing(true);

        try {
            // Hooks handle their own refetching automatically
            console.log('✅ Refresh concluído com sucesso');
        } catch (error) {
            console.error('❌ Erro durante refresh:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [eventId]);

    // ✅ Simplificado: filtrar participantes por turno baseado nos campos workDate, workStage, workPeriod - identical to internal
    const getParticipantesPorDia = useCallback((shiftId: string) => {
        if (!shiftId) return participantsArray;

        const { dateISO, stage, period } = parseShiftId(shiftId);

        return participantsArray.filter((participant: any) => {
            // Verificar se o participante tem workDate, workStage, workPeriod correspondentes
            return participant.workDate === dateISO &&
                participant.workStage === stage &&
                participant.workPeriod === period;
        });
    }, [participantsArray, parseShiftId]);

    // ✅ Simplificado: verificar check-in vinculando participant com attendance - identical to internal
    const hasCheckIn = useCallback((participantId: string, shiftId: string): boolean => {
        if (!allAttendanceData || !Array.isArray(allAttendanceData) || allAttendanceData.length === 0) return false;

        const { dateISO, stage, period } = parseShiftId(shiftId);

        // Buscar attendance correspondente ao participante e turno
        return allAttendanceData.some((attendance: any) => {
            // Verificar se é o mesmo participante e tem check-in
            if (attendance.participantId !== participantId || !attendance.checkIn) {
                return false;
            }

            // Verificar se a data, estágio e período correspondem
            const attendanceDateISO = formatDateForAPI(attendance.date);
            const shiftDateForAPI = formatDateForAPI(dateISO);

            return attendanceDateISO === shiftDateForAPI &&
                (attendance.workStage || 'evento') === stage &&
                (attendance.workPeriod || 'diurno') === period;
        });
    }, [allAttendanceData, parseShiftId, formatDateForAPI]);

    // KPIs baseados no turno selecionado - identical to internal
    const participantesDoDia = getParticipantesPorDia(selectedDay);

    // ✅ Empresas filtradas pelo turno selecionado - identical to internal
    const empresasDoTurno = useMemo(() => {
        if (!selectedDay || !shiftInfo) return empresasArray;

        const { dateISO, stage, period } = shiftInfo;

        const empresasFiltradas = empresasArray.filter((empresa: any) => {
            return empresa.workDate === dateISO &&
                empresa.workStage === stage &&
                empresa.workPeriod === period;
        });

        // ✅ Retornar apenas empresas do turno específico, mesmo que seja array vazio
        console.log(`📊 Empresas filtradas para turno ${selectedDay}:`, {
            total: empresasFiltradas.length,
            empresas: empresasFiltradas.map(e => ({ nome: e.nome, workDate: e.workDate, workStage: e.workStage, workPeriod: e.workPeriod }))
        });

        return empresasFiltradas;
    }, [empresasArray, selectedDay, shiftInfo]);

    // Debug: Log para verificar se está funcionando corretamente - identical to internal
    useEffect(() => {
        if (selectedDay && shiftInfo) {
            console.log('🔍 Dashboard Debug:', {
                selectedDay,
                shiftInfo,
                participantesDoDia: participantesDoDia.length,
                allAttendanceData: allAttendanceData.length,
                totalCheckedIn: participantesDoDia.filter(p => hasCheckIn(p.id, selectedDay)).length,
                empresasDoTurno: empresasDoTurno.length,
                empresasArray: empresasArray.length
            });
        }
    }, [selectedDay, shiftInfo, participantesDoDia, allAttendanceData, hasCheckIn, empresasDoTurno, empresasArray]);

    // ✅ Simplificado: calcular estatísticas das credenciais vinculando participantes → credenciais → attendance - IDENTICAL TO INTERNAL
    const getCredentialStats = useCallback(() => {
        const stats: Record<string, { total: number; checkedIn: number; credentialName: string; color: string }> = {}

        if (!selectedDay) return stats;

        console.log('🎫 Calculando stats das credenciais para turno:', selectedDay);
        console.log('📊 Participantes do dia:', participantesDoDia.length);
        console.log('📋 Credenciais disponíveis:', credentialsArray.length);

        // Para cada credencial, buscar participantes que a possuem
        credentialsArray.forEach((credential: any) => {
            const participantsWithCredential = participantesDoDia.filter((p: any) =>
                p.credentialId === credential.id
            );

            const checkedInWithCredential = participantsWithCredential.filter((p: any) =>
                hasCheckIn(p.id, selectedDay)
            );

            console.log(`🎫 Credencial "${credential.nome}": ${checkedInWithCredential.length}/${participantsWithCredential.length} presentes`);

            // Sempre incluir credencial, mesmo sem participantes no turno
            const total = Number(participantsWithCredential.length) || 0;
            const checkedIn = Number(checkedInWithCredential.length) || 0;

            stats[credential.id] = {
                total,
                checkedIn,
                credentialName: credential.nome || 'Credencial',
                color: credential.cor || '#3B82F6'
            }
        })

        // Participantes sem credencial
        const participantsWithoutCredential = participantesDoDia.filter((p: any) => !p.credentialId);
        const checkedInWithoutCredential = participantsWithoutCredential.filter((p: any) =>
            hasCheckIn(p.id, selectedDay)
        );

        if (participantsWithoutCredential.length > 0) {
            console.log(`👤 Sem credencial: ${checkedInWithoutCredential.length}/${participantsWithoutCredential.length} presentes`);

            const total = Number(participantsWithoutCredential.length) || 0;
            const checkedIn = Number(checkedInWithoutCredential.length) || 0;

            stats['no-credential'] = {
                total,
                checkedIn,
                credentialName: 'SEM CREDENCIAL',
                color: '#6B7280'
            }
        }

        return stats
    }, [participantesDoDia, credentialsArray, hasCheckIn, selectedDay]);

    // Simplificar as estatísticas para o dashboard - identical to internal
    const totalCheckedInToday = useMemo(() => {
        const filtered = participantesDoDia.filter(p => hasCheckIn(p.id, selectedDay));
        return Number(filtered.length) || 0;
    }, [participantesDoDia, hasCheckIn, selectedDay]);

    // Filtrar attendance do dia atual para os gráficos
    const attendanceToday = useMemo(() => {
        if (!selectedDay || !allAttendanceData?.length || !shiftInfo) return [];

        const { dateISO, stage, period } = shiftInfo;

        return allAttendanceData.filter((attendance: any) => {
            // Verificar se tem checkIn válido
            if (!attendance.checkIn) return false;

            // Comparar data, estágio e período
            const attendanceDateISO = formatDateForAPI(attendance.date);
            const shiftDateForAPI = formatDateForAPI(dateISO);

            return attendanceDateISO === shiftDateForAPI &&
                (attendance.workStage || 'evento') === stage &&
                (attendance.workPeriod || 'diurno') === period;
        });
    }, [allAttendanceData, selectedDay, shiftInfo, formatDateForAPI]);

    // ✅ CORRIGIDO: Calcular estatísticas por empresa baseado em empresas filtradas pelo turno específico - IDENTICAL TO INTERNAL
    const getCompanySummary = useCallback(() => {
        const stats: Record<string, { total: number; checkedIn: number; companyName: string }> = {}

        if (!selectedDay) return stats;

        console.log('🏢 Calculando stats das empresas para turno:', selectedDay);
        console.log('📊 Participantes do dia:', participantesDoDia.length);

        // ✅ Simplificado: agrupar participantes por empresa diretamente
        const participantsByCompany: Record<string, any[]> = {};

        participantesDoDia.forEach((participant: any) => {
            const companyName = participant.company || 'SEM EMPRESA';
            if (!participantsByCompany[companyName]) {
                participantsByCompany[companyName] = [];
            }
            participantsByCompany[companyName].push(participant);
        });

        // Calcular estatísticas para cada empresa
        Object.entries(participantsByCompany).forEach(([companyName, participants]) => {
            const checkedInParticipants = participants.filter((p: any) =>
                hasCheckIn(p.id, selectedDay)
            );

            console.log(`🏢 Empresa "${companyName}": ${checkedInParticipants.length}/${participants.length} presentes`);

            const total = Number(participants.length) || 0;
            const checkedIn = Number(checkedInParticipants.length) || 0;

            stats[companyName] = {
                total,
                checkedIn,
                companyName: companyName || 'Empresa'
            };
        });

        console.log('📊 Total de empresas com participantes:', Object.keys(stats).length);

        // ✅ Para cada empresa do turno, buscar participantes e calcular estatísticas
        empresasDoTurno.forEach((empresa: any) => {
            // Buscar participantes desta empresa no turno específico
            const participantesEmpresa = participantesDoDia.filter((participant: any) =>
                participant.company === empresa.nome
            );

            // Contar presenças válidas
            const checkedInParticipants = participantesEmpresa.filter((p: any) => {
                return hasCheckIn(p.id, selectedDay);
            });

            // Debug para verificação
            console.log(`🏢 Empresa "${empresa.nome}" no turno:`, {
                turnoSelecionado: selectedDay,
                totalParticipantes: participantesEmpresa.length,
                participantesPresentes: checkedInParticipants.length,
                workDate: empresa.workDate,
                workStage: empresa.workStage,
                workPeriod: empresa.workPeriod
            });

            // ✅ CORRIGIDO: Sempre adicionar empresa, mesmo sem participantes
            const total = Number(participantesEmpresa.length) || 0;
            const checkedIn = Number(checkedInParticipants.length) || 0;

            stats[empresa.nome] = {
                total,
                checkedIn,
                companyName: empresa.nome || 'Empresa'
            };
        });

        // ✅ Também incluir participantes com empresas que não estão registradas no sistema de empresas
        const empresasRegistradas = empresasDoTurno.map((e: any) => e.nome);
        const participantesSemEmpresaRegistrada = participantesDoDia.filter((participant: any) => {
            return participant.company &&
                participant.company.trim() !== '' &&
                !empresasRegistradas.includes(participant.company);
        });

        if (participantesSemEmpresaRegistrada.length > 0) {
            console.log('👥 Participantes com empresas não registradas:', {
                quantidade: participantesSemEmpresaRegistrada.length,
                empresas: [...new Set(participantesSemEmpresaRegistrada.map((p: any) => p.company))]
            });

            // Agrupar por empresa não registrada
            const participantsByUnregisteredCompany = participantesSemEmpresaRegistrada.reduce((acc: any, participant: any) => {
                const companyName = participant.company;
                if (!acc[companyName]) {
                    acc[companyName] = [];
                }
                acc[companyName].push(participant);
                return acc;
            }, {});

            // Calcular stats para empresas não registradas
            Object.entries(participantsByUnregisteredCompany).forEach(([companyName, participants]: [string, any]) => {
                const checkedInParticipants = participants.filter((p: any) => {
                    return hasCheckIn(p.id, selectedDay);
                });

                const total = Number(participants.length) || 0;
                const checkedIn = Number(checkedInParticipants.length) || 0;

                stats[companyName] = {
                    total,
                    checkedIn,
                    companyName: companyName || 'Empresa'
                };
            });
        }

        console.log('📊 Stats finais das empresas:', {
            totalEmpresas: Object.keys(stats).length,
            empresasNomes: Object.keys(stats),
            empresasCompletas: stats
        });
        return stats;
    }, [participantesDoDia, hasCheckIn, selectedDay, shiftInfo, empresasDoTurno]);

    // Função para obter ícone do período
    const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
        if (period === 'diurno') {
            return <Sun className="h-4 w-4 text-yellow-500" />;
        } else if (period === 'noturno') {
            return <Moon className="h-4 w-4 text-blue-500" />;
        } else if (period === 'dia_inteiro') {
            return <Clock className="h-4 w-4 text-purple-500" />;
        }
        return null;
    }, []);

    // ✅ Auto-selecionar o dia atual (hoje) quando disponível - identical to internal
    useEffect(() => {
        if (!selectedDay && eventDays.length > 0) {
            console.log('🗓️ Auto-selecionando dia:', eventDays.length, 'dias disponíveis');

            const todayBR = getTodayBR();
            console.log('📅 Data atual (BR):', todayBR);
            console.log('📋 Dias disponíveis:', eventDays.map(d => ({ id: d.id, label: d.label, date: d.date })));

            // Tentar encontrar o dia atual na lista
            const todayEvent = eventDays.find(day => day.date === todayBR);

            if (todayEvent) {
                console.log('✅ Dia atual encontrado no evento:', todayEvent);
                setSelectedDay(todayEvent.id);
            } else {
                // Fallback: selecionar o primeiro dia disponível
                console.log('⚠️ Dia atual não encontrado, selecionando primeiro dia:', eventDays[0]);
                setSelectedDay(eventDays[0].id);
            }
        }
    }, [selectedDay, eventDays, getTodayBR]);

    // 🕐 Auto-refresh a cada 1 minuto - identical to internal
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('⏰ Auto-refresh iniciado (1 minuto)');
            refreshAllData();

            // ✅ Verificar se mudou o dia e atualizar automaticamente
            if (selectedDay && eventDays.length > 0) {
                const todayBR = getTodayBR();
                const currentSelectedDay = eventDays.find(day => day.id === selectedDay);
                const todayEvent = eventDays.find(day => day.date === todayBR);

                // Se o dia selecionado não é hoje, mas hoje está disponível, mudar para hoje
                if (currentSelectedDay && todayEvent && currentSelectedDay.date !== todayBR) {
                    console.log('📅 Mudança de dia detectada, atualizando para hoje:', todayEvent);
                    setSelectedDay(todayEvent.id);
                }
            }
        }, 60000); // 60 segundos = 1 minuto

        // Cleanup do interval quando componente for desmontado
        return () => {
            clearInterval(interval);
            console.log('🧹 Auto-refresh limpo');
        };
    }, [refreshAllData, selectedDay, eventDays, getTodayBR]);

    const credentialStats = getCredentialStats();
    const companySummary = getCompanySummary();

    // ✅ Debug: Verificar se companySummary tem dados - identical to internal
    console.log('🔍 Verificando dados das empresas:', {
        credentialStats: Object.keys(credentialStats).length,
        companySummary: Object.keys(companySummary).length,
        companySummaryData: companySummary
    });

    // Preparar dados para a interface
    const dashboardItems = useMemo(() => {
        const items: Array<{
            id: string
            name: string
            type: 'credential' | 'company'
            checkedIn: number
            total: number
            percentage: number
            color: string
        }> = []

        // Adicionar credenciais
        Object.entries(credentialStats).forEach(([credentialId, stats]) => {
            const checkedIn = Number(stats.checkedIn) || 0;
            const total = Number(stats.total) || 0;
            const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

            console.log(`🎫 Debug credencial ${stats.credentialName}:`, {
                checkedIn,
                total,
                percentage,
                isNaN: isNaN(percentage)
            });

            items.push({
                id: `credential-${credentialId}`,
                name: stats.credentialName,
                type: 'credential',
                checkedIn,
                total,
                percentage: isNaN(percentage) ? 0 : percentage,
                color: stats.color
            })
        })

        // Adicionar empresas
        Object.entries(companySummary).forEach(([companyName, stats]) => {
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

            const checkedIn = Number(stats.checkedIn) || 0;
            const total = Number(stats.total) || 0;
            const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

            console.log(`🏢 Debug empresa ${stats.companyName}:`, {
                checkedIn,
                total,
                percentage,
                isNaN: isNaN(percentage)
            });

            items.push({
                id: `company-${companyName}`,
                name: stats.companyName,
                type: 'company',
                checkedIn,
                total,
                percentage: isNaN(percentage) ? 0 : percentage,
                color: getCompanyColor(companyName)
            })
        })

        return items
    }, [credentialStats, companySummary]);

    // Separar itens por tipo e aplicar filtros
    const credentialItems = useMemo(() => {
        return dashboardItems
            .filter(item => item.type === 'credential')
            .filter(item =>
                credentialFilter === '' ||
                item.name.toLowerCase().includes(credentialFilter.toLowerCase())
            )
    }, [dashboardItems, credentialFilter]);

    const companyItems = useMemo(() => {
        return dashboardItems
            .filter(item => item.type === 'company')
            .filter(item =>
                companyFilter === '' ||
                item.name.toLowerCase().includes(companyFilter.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [dashboardItems, companyFilter]);

    // Função para calcular check-out (total - check-in)
    const getCheckOut = useCallback((total: number, checkedIn: number) => {
        return total - checkedIn;
    }, []);

    // Hooks handle data loading automatically - just check for errors
    useEffect(() => {
        if (!eventId) {
            console.log('⚠️ EventId não encontrado');
            setError("Event ID não encontrado no token");
            setLoading(false);
            return;
        }

        // Data is loaded via hooks automatically
        setLoading(false);
    }, [eventId]);

    // Validation effect - token processing
    useEffect(() => {
        console.log('Processing token:', token);

        const decoded = decodeToken(token);
        if (!decoded) {
            setError("Token inválido - verifique o formato do token");
            setLoading(false);
            return;
        }

        console.log('Token válido para eventId:', decoded.eventId);
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">❌</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro de Acesso</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    const selectedEvent = Array.isArray(eventos)
        ? eventos.find((e: any) => String(e.id_evento) === String(eventId))
        : undefined;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4">
                        <Button
                            onClick={refreshAllData}
                            disabled={isRefreshing}
                            variant="outline"
                            className="flex items-center gap-2 text-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
                            <span className="sm:hidden">{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                                <span className="hidden sm:inline">Dashboard - {selectedEvent?.name || 'Evento'}</span>
                                <span className="sm:hidden">Dashboard</span>
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-1">
                                <span className="hidden sm:inline">Acompanhamento em tempo real • Atualização automática a cada 1 minuto</span>
                                <span className="sm:hidden">Tempo real • Auto-refresh 1min</span>
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
                                {eventDays.map((day) => {
                                    const isToday = day.date === getTodayBR();

                                    return (
                                        <SelectItem key={day.id} value={day.id}>
                                            <div className="flex items-center gap-2">
                                                <span className={isToday ? 'font-semibold text-blue-600' : ''}>
                                                    {day.label}
                                                    {isToday && ' (HOJE)'}
                                                </span>
                                                {getPeriodIcon(day.period)}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* KPIs */}
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
                                        <p className="text-3xl font-bold text-orange-900">
                                            {Object.keys(companySummary).length}
                                        </p>
                                    </div>
                                    <Building className="w-8 h-8 text-orange-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Progresso de Check-in - {selectedDay ? (() => {
                                const dayInfo = eventDays.find(d => d.id === selectedDay);
                                return dayInfo ? dayInfo.label : 'Selecione um dia';
                            })() : 'Selecione um dia'}
                            {selectedDay && (() => {
                                const dayInfo = eventDays.find(d => d.id === selectedDay);
                                return dayInfo ? getPeriodIcon(dayInfo.period) : null;
                            })()}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Total: {totalCheckedInToday}/{participantesDoDia.length} presentes</span>
                        </div>
                    </div>

                    <Tabs defaultValue="companies" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                            <TabsTrigger
                                value="companies"
                                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-colors"
                            >
                                <Building className="w-4 h-4" />
                                Empresas ({companyItems.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="credentials"
                                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-colors"
                            >
                                <MapPin className="w-4 h-4" />
                                Credenciais ({credentialItems.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="companies" className="mt-4">
                            <div className="mb-4">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Filtrar empresas..."
                                        value={companyFilter}
                                        onChange={(e) => setCompanyFilter(e.target.value)}
                                        className="pl-10 pr-8"
                                    />
                                    {companyFilter && (
                                        <button
                                            onClick={() => setCompanyFilter('')}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Tabela responsiva para empresas */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full bg-white min-w-[500px]">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left py-3 px-3 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">
                                                Empresa
                                            </th>
                                            <th className="text-center py-3 px-1 sm:px-2 font-medium text-gray-700 text-xs sm:text-sm">
                                                Total
                                            </th>
                                            <th className="text-center py-3 px-1 sm:px-2 font-medium text-gray-700 text-xs sm:text-sm">
                                                Check-in
                                            </th>
                                            <th className="text-center py-3 px-1 sm:px-2 font-medium text-gray-700 text-xs sm:text-sm">
                                                Check-out
                                            </th>
                                            <th className="text-center py-3 px-1 sm:px-2 font-medium text-gray-700 text-xs sm:text-sm">
                                                %
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {companyItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-gray-500">
                                                    Nenhuma empresa encontrada
                                                </td>
                                            </tr>
                                        ) : (
                                            companyItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="py-2 sm:py-3 px-3 sm:px-4">
                                                        <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                                                            {item.name}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-center">
                                                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                                            {item.total}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-center">
                                                        <span className="text-xs sm:text-sm font-semibold text-green-600">
                                                            {item.checkedIn}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-center">
                                                        <span className="text-xs sm:text-sm font-semibold text-red-600">
                                                            {getCheckOut(item.total, item.checkedIn)}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 sm:py-3 px-1 sm:px-2 text-center">
                                                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                                                {isNaN(item.percentage) ? 0 : item.percentage}%
                                                            </span>
                                                            <div className="w-6 sm:w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-blue-500 transition-all duration-300"
                                                                    style={{ width: `${isNaN(item.percentage) ? 0 : item.percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </TabsContent>

                        <TabsContent value="credentials" className="mt-4">
                            <div className="mb-4">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Filtrar credenciais..."
                                        value={credentialFilter}
                                        onChange={(e) => setCredentialFilter(e.target.value)}
                                        className="pl-10 pr-8"
                                    />
                                    {credentialFilter && (
                                        <button
                                            onClick={() => setCredentialFilter('')}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Cards para credenciais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {credentialItems.length === 0 ? (
                                    <div className="col-span-full text-center py-8 text-gray-500">
                                        Nenhuma credencial encontrada
                                    </div>
                                ) : (
                                    credentialItems.map((item) => (
                                        <Card key={item.id} className="border-l-4" style={{ borderLeftColor: item.color }}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full border-2 border-black flex-shrink-0"
                                                            style={{ backgroundColor: item.color }}
                                                        />
                                                        <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900">{isNaN(item.percentage) ? 0 : item.percentage}%</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm mb-2">
                                                    <span className="text-green-600 font-medium">
                                                        {item.checkedIn} presentes
                                                    </span>
                                                    <span className="text-gray-600">
                                                        {item.total} total
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${isNaN(item.percentage) ? 0 : item.percentage}%`,
                                                            backgroundColor: item.color
                                                        }}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Seção de Gráficos em Tempo Real para Produtoras de Eventos */}
                    <div className="mt-8 space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-semibold text-gray-900">
                                Análise em Tempo Real - Produção de Eventos
                            </h2>
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                LIVE
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gráfico de Check-ins em Tempo Real */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                        Check-ins por Hora
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ height: '300px' }}>
                                        <Chart
                                            options={{
                                                chart: {
                                                    type: 'line',
                                                    height: 300,
                                                    animations: {
                                                        enabled: true,
                                                        speed: 800
                                                    },
                                                    toolbar: {
                                                        show: false
                                                    }
                                                },
                                                theme: {
                                                    mode: 'light'
                                                },
                                                stroke: {
                                                    width: [3, 3],
                                                    curve: 'smooth',
                                                    dashArray: [0, 5]
                                                },
                                                colors: ['#3B82F6', '#10B981'],
                                                xaxis: {
                                                    categories: (() => {
                                                        if (!attendanceToday?.length) return [];
                                                        const hourlyData = Array.from({ length: 24 }, (_, hour) => `${hour.toString().padStart(2, '0')}:00`);
                                                        return hourlyData;
                                                    })(),
                                                    title: {
                                                        text: 'Hora do Dia'
                                                    }
                                                },
                                                yaxis: {
                                                    title: {
                                                        text: 'Quantidade de Check-ins'
                                                    }
                                                },
                                                legend: {
                                                    show: true,
                                                    position: 'top'
                                                },
                                                grid: {
                                                    borderColor: '#e7e7e7'
                                                },
                                                tooltip: {
                                                    enabled: true,
                                                    shared: true,
                                                    intersect: false
                                                }
                                            }}
                                            series={[
                                                {
                                                    name: 'Check-ins/hora',
                                                    data: (() => {
                                                        if (!attendanceToday?.length) return Array(24).fill(0);
                                                        return Array.from({ length: 24 }, (_, hour) => {
                                                            return attendanceToday.filter(attendance => {
                                                                const attendanceHour = new Date(attendance.checkIn).getHours();
                                                                return attendanceHour === hour;
                                                            }).length;
                                                        });
                                                    })()
                                                },
                                                {
                                                    name: 'Acumulado',
                                                    data: (() => {
                                                        if (!attendanceToday?.length) return Array(24).fill(0);
                                                        return Array.from({ length: 24 }, (_, hour) => {
                                                            return attendanceToday.filter(attendance => {
                                                                const attendanceHour = new Date(attendance.checkIn).getHours();
                                                                return attendanceHour <= hour;
                                                            }).length;
                                                        });
                                                    })()
                                                }
                                            ]}
                                            type="line"
                                            height={300}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Distribuição por Credenciais */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-purple-600" />
                                        Distribuição por Credenciais
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ height: '300px' }}>
                                        <Chart
                                            options={{
                                                chart: {
                                                    type: 'donut',
                                                    height: 300,
                                                    animations: {
                                                        enabled: true,

                                                        speed: 800
                                                    }
                                                },
                                                colors: credentialItems.map(item => item.color),
                                                labels: credentialItems.map(item => item.name),
                                                legend: {
                                                    show: true,
                                                    position: 'bottom',
                                                    horizontalAlign: 'center'
                                                },
                                                plotOptions: {
                                                    pie: {
                                                        donut: {
                                                            size: '70%',
                                                            labels: {
                                                                show: true,
                                                                total: {
                                                                    show: true,
                                                                    label: 'Total Check-ins',
                                                                    formatter: () => {
                                                                        return credentialItems.reduce((sum, item) => sum + item.checkedIn, 0).toString();
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                dataLabels: {
                                                    enabled: true,
                                                    formatter: function (val: number, opts: any) {
                                                        const item = credentialItems[opts.seriesIndex];
                                                        return `${item.checkedIn} (${Math.round(val)}%)`;
                                                    }
                                                },
                                                tooltip: {
                                                    enabled: true,
                                                    custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
                                                        const item = credentialItems[seriesIndex];
                                                        return `
                                                            <div class="px-3 py-2 bg-white border rounded shadow">
                                                                <div class="font-semibold">${item.name}</div>
                                                                <div class="text-sm">Check-ins: ${item.checkedIn}</div>
                                                                <div class="text-sm">Total: ${item.total}</div>
                                                                <div class="text-sm">Percentual: ${Math.round(series[seriesIndex])}%</div>
                                                            </div>
                                                        `;
                                                    }
                                                }
                                            }}
                                            series={credentialItems.map(item => item.checkedIn)}
                                            type="donut"
                                            height={300}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top 5 Empresas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="w-4 h-4 text-orange-600" />
                                        Top 5 Empresas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ height: '300px' }}>
                                        <Chart
                                            options={{
                                                chart: {
                                                    type: 'bar',
                                                    height: 300,
                                                    animations: {
                                                        enabled: true,

                                                        speed: 800
                                                    },
                                                    toolbar: {
                                                        show: false
                                                    }
                                                },
                                                plotOptions: {
                                                    bar: {
                                                        horizontal: true,
                                                        dataLabels: {
                                                            position: 'top'
                                                        }
                                                    }
                                                },
                                                colors: ['#F97316', '#E5E7EB'],
                                                xaxis: {
                                                    categories: companyItems
                                                        .sort((a, b) => b.checkedIn - a.checkedIn)
                                                        .slice(0, 5)
                                                        .map(item => item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name),
                                                    title: {
                                                        text: 'Quantidade'
                                                    }
                                                },
                                                yaxis: {
                                                    title: {
                                                        text: 'Empresas'
                                                    }
                                                },
                                                legend: {
                                                    show: true,
                                                    position: 'top'
                                                },
                                                dataLabels: {
                                                    enabled: true,
                                                    formatter: function (val: number) {
                                                        return val.toString();
                                                    }
                                                },
                                                tooltip: {
                                                    enabled: true,
                                                    shared: true,
                                                    intersect: false,
                                                    custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
                                                        const topCompanies = companyItems
                                                            .sort((a, b) => b.checkedIn - a.checkedIn)
                                                            .slice(0, 5);
                                                        const company = topCompanies[dataPointIndex];

                                                        return `
                                                            <div class="px-3 py-2 bg-white border rounded shadow">
                                                                <div class="font-semibold">${company.name}</div>
                                                                <div class="text-sm">Check-ins: ${company.checkedIn}</div>
                                                                <div class="text-sm">Total: ${company.total}</div>
                                                                <div class="text-sm">Taxa: ${Math.round(company.percentage)}%</div>
                                                            </div>
                                                        `;
                                                    }
                                                }
                                            }}
                                            series={[
                                                {
                                                    name: 'Check-ins',
                                                    data: companyItems
                                                        .sort((a, b) => b.checkedIn - a.checkedIn)
                                                        .slice(0, 5)
                                                        .map(item => item.checkedIn)
                                                },
                                                {
                                                    name: 'Total',
                                                    data: companyItems
                                                        .sort((a, b) => b.checkedIn - a.checkedIn)
                                                        .slice(0, 5)
                                                        .map(item => item.total)
                                                }
                                            ]}
                                            type="bar"
                                            height={300}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Timeline dos Últimos Check-ins */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        Últimos 10 Check-ins
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-80 overflow-y-auto">
                                        {attendanceToday
                                            ?.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())
                                            .slice(0, 10)
                                            .map((attendance, index) => {
                                                // Usar o participant aninhado do attendance ou buscar nos participantes
                                                const participant = attendance.participant || participantesDoDia.find(p => p.id === attendance.participantId);
                                                const empresa = participant?.company;
                                                const credential = participant?.credential;

                                                return (
                                                    <div key={attendance.id} className="relative flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                                                        {/* Avatar e Indicador */}
                                                        <div className="flex-shrink-0 relative">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                                                <UserCheck className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
                                                        </div>

                                                        {/* Informações do Participante */}
                                                        <div className="flex-1 min-w-0">
                                                            {/* Nome e Horário */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-sm font-semibold text-gray-900 truncate">
                                                                    {participant?.name || 'Participante Não Identificado'}
                                                                </h4>
                                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(attendance.checkIn).toLocaleTimeString('pt-BR', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        second: '2-digit'
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Detalhes do Participante */}
                                                            <div className="space-y-1 text-xs text-gray-600">
                                                                {participant?.cpf && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-medium">CPF:</span>
                                                                        <span>{participant.cpf}</span>
                                                                    </div>
                                                                )}
                                                                {participant?.phone && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-medium">Tel:</span>
                                                                        <span>{participant.phone}</span>
                                                                    </div>
                                                                )}
                                                                {participant?.email && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-medium">Email:</span>
                                                                        <span className="truncate">{participant.email}</span>
                                                                    </div>
                                                                )}
                                                                {participant?.role && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-medium">Função:</span>
                                                                        <span>{participant.role}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Tags de Empresa e Credencial */}
                                                            <div className="flex items-center gap-2 mt-3">
                                                                {empresa && (
                                                                    <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                                                                        <Building className="w-3 h-3" />
                                                                        <span className="text-xs font-medium">
                                                                            {empresa.length > 25 ? empresa.substring(0, 25) + '...' : empresa}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {credential && (
                                                                    <div
                                                                        className="flex items-center gap-1 px-2 py-1 rounded-md text-white"
                                                                        style={{
                                                                            backgroundColor: (() => {
                                                                                const cred = credentials?.find((c) => c.nome === credential);
                                                                                return cred?.cor || '#6B7280';
                                                                            })()
                                                                        }}
                                                                    >
                                                                        <MapPin className="w-3 h-3" />
                                                                        <span className="text-xs font-medium">{credential}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Informações Adicionais */}
                                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                                                <div className="text-xs text-gray-500">
                                                                    Check-in #{String(index + 1).padStart(2, '0')}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-xs text-green-600">
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                    Confirmado
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) || (
                                                <div className="text-center py-8">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Clock className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-500 text-sm">
                                                        Nenhum check-in registrado ainda
                                                    </p>
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        Os check-ins aparecerão aqui em tempo real
                                                    </p>
                                                </div>
                                            )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Indicadores de Performance */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-blue-100 text-sm">Taxa de Check-in</p>
                                            <p className="text-2xl font-bold">
                                                {participantesDoDia.length > 0
                                                    ? Math.round((totalCheckedInToday / participantesDoDia.length) * 100)
                                                    : 0
                                                }%
                                            </p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-blue-200" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-green-100 text-sm">Check-ins/Hora</p>
                                            <p className="text-2xl font-bold">
                                                {(() => {
                                                    if (!attendanceToday?.length) return 0;
                                                    const currentHour = new Date().getHours();
                                                    return attendanceToday.filter(attendance => {
                                                        const attendanceHour = new Date(attendance.checkIn).getHours();
                                                        return attendanceHour === currentHour;
                                                    }).length;
                                                })()}
                                            </p>
                                        </div>
                                        <Activity className="w-8 h-8 text-green-200" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-purple-100 text-sm">Empresas Ativas</p>
                                            <p className="text-2xl font-bold">
                                                {companyItems.filter(item => item.checkedIn > 0).length}
                                            </p>
                                        </div>
                                        <Building className="w-8 h-8 text-purple-200" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-orange-100 text-sm">Credenciais Ativas</p>
                                            <p className="text-2xl font-bold">
                                                {credentialItems.filter(item => item.checkedIn > 0).length}
                                            </p>
                                        </div>
                                        <MapPin className="w-8 h-8 text-orange-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}