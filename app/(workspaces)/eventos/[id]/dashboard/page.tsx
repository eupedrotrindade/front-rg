/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowLeft, BarChart3, Building, Calendar, TrendingUp, Users, Clock, Activity, MapPin, CalendarDays, UserCheck, Sun, Moon, Search, X, RefreshCw, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect } from 'react'
import EventLayout from '@/components/dashboard/dashboard-layout'
import VirtualizedDashboardList from '@/components/virtualized-dashboard/VirtualizedDashboardList'
import '@/styles/virtualized-dashboard.css'
import { formatEventDate } from '@/lib/utils'
import { toast } from 'sonner'
import SimpleEventDaysManager from '@/components/event-days/SimpleEventDaysManager'
import { useUpdateEvento } from '@/features/eventos/api/mutation/use-update-evento'

export default function EventDashboardPage() {
    const params = useParams()
    const router = useRouter()
    const { data: eventos, refetch: refetchEventos } = useEventos()
    const {
        data: participantsData = [],
        isLoading: participantsLoading,
        refetch: refetchParticipants
    } = useEventParticipantsByEvent({ eventId: String(params.id) });

    const { data: credentials, refetch: refetchCredentials } = useCredentials({ eventId: String(params.id) })
    const { data: empresas = [], isLoading: empresasLoading, refetch: refetchEmpresas } = useEmpresasByEvent(String(params.id))

    const [selectedDay, setSelectedDay] = useState<string>('')
    const [credentialFilter, setCredentialFilter] = useState<string>('')
    const [companyFilter, setCompanyFilter] = useState<string>('')
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const [isExpirationDialogOpen, setIsExpirationDialogOpen] = useState<boolean>(false)
    const [selectedExpiration, setSelectedExpiration] = useState<string>('7')

    const evento = Array.isArray(eventos)
        ? eventos.find((e) => String(e.id) === String(params.id))
        : undefined

    const participantsArray = useMemo(() => Array.isArray(participantsData) ? participantsData : [], [participantsData])
    const credentialsArray = useMemo(() => Array.isArray(credentials) ? credentials : [], [credentials])

    // Normalizar dados das empresas (mesmo modelo da página de empresas)
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
    }, [empresas, normalizeEmpresas])

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

    // Função para extrair informações do shift ID
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

    // Extrair informações do turno selecionado
    const shiftInfo = useMemo(() => {
        if (!selectedDay) return null;
        return parseShiftId(selectedDay);
    }, [selectedDay, parseShiftId]);

    // ✅ Hook simplificado: buscar TODOS os attendances do evento
    const { data: attendanceRawData, isLoading: attendanceLoading, refetch: refetchAttendance } = useEventAttendance(
        { eventId: String(params.id) }
    )

    // ✅ Normalizar dados de attendance para garantir que seja sempre um array
    const allAttendanceData = useMemo(() => {
        if (!attendanceRawData) return [];
        if (Array.isArray(attendanceRawData)) return attendanceRawData;
        if (typeof attendanceRawData === 'object' && attendanceRawData.data && Array.isArray(attendanceRawData.data)) {
            return attendanceRawData.data;
        }
        return [];
    }, [attendanceRawData])

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
                return formatEventDate(date.toISOString());
            }
        } catch (error) {
            console.error('Erro ao converter data:', dateStr, error);
        }

        return dateStr;
    }, []);

    // Função para gerar tabs dos dias do evento usando nova estrutura com suporte a turnos
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

    // ✅ Função para obter data atual no formato brasileiro
    const getTodayBR = useCallback(() => {
        const today = new Date();
        return today.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }, []);

    // ✅ Usar useMemo para eventDays (deve vir antes do auto-refresh)
    const eventDays = useMemo(() => {
        return getEventDays();
    }, [getEventDays]);

    // 🔄 Função para atualizar todos os dados
    const refreshAllData = useCallback(async () => {
        console.log('🔄 Iniciando refresh dos dados...');
        setIsRefreshing(true);

        try {
            await Promise.all([
                refetchEventos?.(),
                refetchParticipants?.(),
                refetchCredentials?.(),
                refetchEmpresas?.(),
                refetchAttendance?.()
            ]);
            console.log('✅ Refresh concluído com sucesso');
        } catch (error) {
            console.error('❌ Erro durante refresh:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [refetchEventos, refetchParticipants, refetchCredentials, refetchEmpresas, refetchAttendance]);

    // 🔗 Função para gerar token de acesso público para dashboard com expiração personalizada
    const generatePublicDashboardToken = (expirationDays: number) => {
        const expirationTime = Date.now() + (expirationDays * 24 * 60 * 60 * 1000) // dias em milissegundos
        const token = btoa(`${params.id}:${expirationTime}`)
        const publicUrl = `${window.location.origin}/dashboard/${token}`
        return publicUrl
    }

    // 🔗 Função para copiar URL pública do dashboard com expiração personalizada
    const copyPublicDashboardUrl = async () => {
        try {
            const expirationDays = parseInt(selectedExpiration)
            const publicUrl = generatePublicDashboardToken(expirationDays)
            await navigator.clipboard.writeText(publicUrl)

            const expirationText = expirationDays === 1 ? '1 dia' : `${expirationDays} dias`
            toast.success('URL pública da dashboard copiada para a área de transferência!', {
                description: `Link válido por ${expirationText}. Compartilhe para acesso sem login.`
            })
            setIsExpirationDialogOpen(false)
        } catch (error) {
            console.error('Erro ao copiar URL:', error)
            toast.error('Erro ao copiar URL pública')
        }
    }

    // 🕐 Auto-refresh a cada 1 minuto
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

    // ✅ Simplificado: filtrar participantes por turno baseado nos campos workDate, workStage, workPeriod
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

    // ✅ Simplificado: verificar check-in vinculando participant com attendance
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

    // KPIs baseados no turno selecionado
    const participantesDoDia = getParticipantesPorDia(selectedDay)

    // ✅ Empresas filtradas pelo turno selecionado
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

    // Debug: Log para verificar se está funcionando corretamente
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

    // ✅ CORRIGIDO: calcular estatísticas das credenciais APENAS para participantes do dia selecionado
    const getCredentialStats = useCallback(() => {
        const stats: Record<string, { total: number; checkedIn: number; credentialName: string; color: string }> = {}

        if (!selectedDay) return stats;

        console.log('🎫 Calculando stats das credenciais para turno:', selectedDay);
        console.log('📊 Participantes do dia:', participantesDoDia.length);
        console.log('📋 Credenciais disponíveis:', credentialsArray.length);

        // Para cada credencial, buscar participantes que a possuem NO DIA SELECIONADO
        credentialsArray.forEach((credential: any) => {
            const participantsWithCredential = participantesDoDia.filter((p: any) =>
                p.credentialId === credential.id
            );

            const checkedInWithCredential = participantsWithCredential.filter((p: any) =>
                hasCheckIn(p.id, selectedDay)
            );

            console.log(`🎫 Credencial "${credential.nome}": ${checkedInWithCredential.length}/${participantsWithCredential.length} presentes`);

            // ✅ SÓ INCLUIR se houver participantes com essa credencial no dia
            if (participantsWithCredential.length > 0) {
                const total = Number(participantsWithCredential.length) || 0;
                const checkedIn = Number(checkedInWithCredential.length) || 0;

                stats[credential.id] = {
                    total,
                    checkedIn,
                    credentialName: credential.nome || 'Credencial',
                    color: credential.cor || '#3B82F6'
                }
            }
        })

        // Participantes sem credencial no dia selecionado
        const participantsWithoutCredential = participantesDoDia.filter((p: any) => !p.credentialId);
        const checkedInWithoutCredential = participantsWithoutCredential.filter((p: any) =>
            hasCheckIn(p.id, selectedDay)
        );

        if (participantsWithoutCredential.length > 0) {
            console.log(`👤 Sem credencial: ${checkedInWithoutCredential.length}/${participantsWithoutCredential.length} presentes`);

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

    // ✅ CORRIGIDO: Simplificar cálculo de estatísticas por empresa - APENAS participantes do dia
    const getCompanySummary = useCallback(() => {
        const stats: Record<string, { total: number; checkedIn: number; companyName: string }> = {}

        if (!selectedDay) return stats;

        console.log('🏢 Calculando stats das empresas para turno:', selectedDay);
        console.log('📊 Participantes do dia:', participantesDoDia.length);

        // ✅ SIMPLIFICADO: agrupar participantes por empresa diretamente
        const participantsByCompany: Record<string, any[]> = {};

        participantesDoDia.forEach((participant: any) => {
            const companyName = participant.company || 'SEM EMPRESA';
            if (!participantsByCompany[companyName]) {
                participantsByCompany[companyName] = [];
            }
            participantsByCompany[companyName].push(participant);
        });

        // Calcular estatísticas para cada empresa com participantes
        Object.entries(participantsByCompany).forEach(([companyName, participants]) => {
            const checkedInParticipants = participants.filter((p: any) =>
                hasCheckIn(p.id, selectedDay)
            );

            console.log(`🏢 Empresa "${companyName}": ${checkedInParticipants.length}/${participants.length} presentes`);

            stats[companyName] = {
                total: participants.length,
                checkedIn: checkedInParticipants.length,
                companyName
            };
        });

        console.log('📊 Total de empresas com participantes no dia:', Object.keys(stats).length);
        return stats;
    }, [participantesDoDia, hasCheckIn, selectedDay]);

    // ✅ Auto-selecionar o dia atual (hoje) quando disponível
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

    const credentialStats = getCredentialStats();
    const companySummary = getCompanySummary();

    // ✅ Debug: Verificar se companySummary tem dados
    console.log('🔍 Verificando dados das empresas:', {
        credentialStats: Object.keys(credentialStats).length,
        companySummary: Object.keys(companySummary).length,
        companySummaryData: companySummary
    });

    // Estatísticas das empresas (mesmo modelo da página de empresas)
    const empresasStats = useMemo(() => {
        if (!empresasArray) {
            return {
                total: 0,
                configuradas: 0,
                parcialmenteConfiguradas: 0,
                naoConfiguradas: 0,
                uniqueEmpresas: 0
            }
        }

        // No novo modelo, cada record é um shift de uma empresa
        const total = empresasArray.length

        // Empresas únicas (agrupar por nome)
        const uniqueEmpresasSet = new Set(empresasArray.map((e: any) => e.nome))
        const uniqueEmpresas = uniqueEmpresasSet.size

        // Uma empresa é considerada configurada se tem campos de shift individuais
        const configuradas = empresasArray.filter((e: any) =>
            e.shiftId && e.workDate && e.workStage && e.workPeriod
        ).length

        const parcialmenteConfiguradas = empresasArray.filter((e: any) =>
            e.id_evento && (!e.shiftId || !e.workDate || !e.workStage || !e.workPeriod)
        ).length

        const naoConfiguradas = empresasArray.filter((e: any) =>
            !e.id_evento && (!e.shiftId || !e.workDate || !e.workStage || !e.workPeriod)
        ).length

        return {
            total,
            configuradas,
            parcialmenteConfiguradas,
            naoConfiguradas,
            uniqueEmpresas
        }
    }, [empresasArray])

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

    // Preparar dados para a lista virtualizada
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

        console.log('🔧 Preparando dashboard items:', {
            credentialStats: Object.keys(credentialStats),
            companySummary: Object.keys(companySummary),
            companySummaryData: companySummary,
            totalCompanies: Object.keys(companySummary).length
        });

        // Adicionar credenciais
        Object.entries(credentialStats).forEach(([credentialId, stats]) => {
            items.push({
                id: `credential-${credentialId}`,
                name: stats.credentialName,
                type: 'credential',
                checkedIn: stats.checkedIn,
                total: stats.total,
                percentage: stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0,
                color: stats.color
            })
        })

        // Adicionar empresas
        Object.entries(companySummary).forEach(([companyName, stats]) => {
            console.log(`➕ Adicionando empresa: ${companyName}`, stats);

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

            items.push({
                id: `company-${companyName}`,
                name: stats.companyName,
                type: 'company',
                checkedIn: stats.checkedIn,
                total: stats.total,
                percentage: stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0,
                color: getCompanyColor(companyName)
            })
        })

        console.log('✅ Dashboard items criados:', {
            totalItems: items.length,
            credenciais: items.filter(i => i.type === 'credential').length,
            empresas: items.filter(i => i.type === 'company').length,
            empresasList: items.filter(i => i.type === 'company').map(i => i.name)
        });

        return items
    }, [credentialStats, companySummary])

    // Separar itens por tipo e aplicar filtros
    const credentialItems = useMemo(() => {
        return dashboardItems
            .filter(item => item.type === 'credential')
            .filter(item =>
                credentialFilter === '' ||
                item.name.toLowerCase().includes(credentialFilter.toLowerCase())
            )
    }, [dashboardItems, credentialFilter])

    const companyItems = useMemo(() => {
        const companyItemsFiltered = dashboardItems
            .filter(item => item.type === 'company')
            .filter(item =>
                companyFilter === '' ||
                item.name.toLowerCase().includes(companyFilter.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name)); // ✅ Ordenação alfabética

        console.log('🏢 Company items filtrados e ordenados:', {
            totalDashboardItems: dashboardItems.length,
            companyItemsBeforeFilter: dashboardItems.filter(item => item.type === 'company').length,
            companyFilter,
            companyItemsAfterFilter: companyItemsFiltered.length,
            companyItemsList: companyItemsFiltered.map(item => ({ name: item.name, total: item.total, checkedIn: item.checkedIn }))
        });

        return companyItemsFiltered;
    }, [dashboardItems, companyFilter])

    // ✅ Função para calcular check-out (total - check-in)
    const getCheckOut = useCallback((total: number, checkedIn: number) => {
        return total - checkedIn;
    }, []);

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
            <div className="p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/eventos/${params.id}`)}
                            className="flex items-center gap-2 text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Voltar para Participantes</span>
                            <span className="sm:hidden">Voltar</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={refreshAllData}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 text-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
                            <span className="sm:hidden">{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
                        </Button>
                        <Dialog open={isExpirationDialogOpen} onOpenChange={setIsExpirationDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span className="hidden sm:inline">Link Público</span>
                                    <span className="sm:hidden">Link</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <ExternalLink className="w-5 h-5" />
                                        Gerar Link Público
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Tempo de expiração do link:
                                        </label>
                                        <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a expiração" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1 dia</SelectItem>
                                                <SelectItem value="3">3 dias</SelectItem>
                                                <SelectItem value="7">7 dias (padrão)</SelectItem>
                                                <SelectItem value="15">15 dias</SelectItem>
                                                <SelectItem value="30">30 dias</SelectItem>
                                                <SelectItem value="90">90 dias</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                        <p className="text-sm text-blue-800">
                                            ℹ️ O link público permitirá acesso ao dashboard sem necessidade de login.
                                            Após a expiração, o link será automaticamente invalidado.
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsExpirationDialogOpen(false)}
                                            className="flex-1"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={copyPublicDashboardUrl}
                                            className="flex-1"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Copiar Link
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                                <span className="hidden sm:inline">Dashboard do Evento</span>
                                <span className="sm:hidden">Dashboard</span>
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-1">
                                <span className="hidden sm:inline">Visão geral e acompanhamento em tempo real do evento • Atualização automática a cada 1 minuto</span>
                                <span className="sm:hidden">Acompanhamento em tempo real • Auto-refresh 1min</span>
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="flex items-center gap-2 text-sm"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(String(params.id))
                                    toast.success('ID do evento copiado!')
                                } catch (e) {
                                    toast.error('Não foi possível copiar o ID')
                                }
                            }}
                        >
                            Copiar ID do Evento
                        </Button>
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
                                {/* ✅ CORRIGIDO: Total de Participantes DO DIA */}
                                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-blue-600 text-sm font-medium">Participantes do Dia</p>
                                                <p className="text-3xl font-bold text-blue-900">{participantesDoDia.length}</p>
                                                <p className="text-xs text-blue-600">
                                                    de {participantsArray.length} total no evento
                                                </p>
                                            </div>
                                            <Users className="w-8 h-8 text-blue-600" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* ✅ CORRIGIDO: Check-ins do Dia Selecionado */}
                                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-green-600 text-sm font-medium">Check-ins do Dia</p>
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

                                {/* ✅ CORRIGIDO: Credenciais com Participantes no Dia */}
                                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-purple-600 text-sm font-medium">Credenciais do Dia</p>
                                                <p className="text-3xl font-bold text-purple-900">{Object.keys(credentialStats).length}</p>
                                                <p className="text-xs text-purple-600">
                                                    de {credentialsArray.length} total no evento
                                                </p>
                                            </div>
                                            <MapPin className="w-8 h-8 text-purple-600" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* ✅ CORRIGIDO: Empresas com Participantes no Dia */}
                                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-orange-600 text-sm font-medium">Empresas do Dia</p>
                                                <p className="text-3xl font-bold text-orange-900">
                                                    {Object.keys(companySummary).length}
                                                </p>
                                                <p className="text-xs text-orange-600">
                                                    de {empresasStats.uniqueEmpresas} total no evento
                                                </p>
                                            </div>
                                            <Building className="w-8 h-8 text-orange-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Listas Virtualizadas de Progress */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Progresso de Check-in - {selectedDay ? (() => {
                                        const dayInfo = eventDays.find(d => d.id === selectedDay);
                                        return dayInfo ? dayInfo.label : selectedDay;
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

                            <Tabs defaultValue="credentials" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                                    <TabsTrigger
                                        value="credentials"
                                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-colors"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Credenciais ({credentialItems.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="companies"
                                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-colors"
                                    >
                                        <Building className="w-4 h-4" />
                                        Empresas ({companyItems.length})
                                    </TabsTrigger>
                                </TabsList>

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
                                    <VirtualizedDashboardList
                                        items={credentialItems}
                                        height={600}
                                        itemHeight={100}
                                    />
                                </TabsContent>

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

                                    {/* 📱 Tabela responsiva para empresas */}
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
                                                                        {item.percentage}%
                                                                    </span>
                                                                    <div className="w-6 sm:w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-blue-500 transition-all duration-300"
                                                                            style={{ width: `${item.percentage}%` }}
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
                            </Tabs>
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
                                {/* Montagem - Nova estrutura com fallback */}
                                {((evento.montagem && evento.montagem.length > 0) ||
                                    (evento.setupStartDate && evento.setupEndDate)) && (
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-green-600 mb-1">MONTAGEM</div>
                                                    <div className="text-sm text-gray-600">
                                                        {evento.montagem && evento.montagem.length > 0 ? (
                                                            evento.montagem.length === 1 ?
                                                                formatEventDate(evento.montagem[0].date) :
                                                                `${formatEventDate(evento.montagem[0].date)} - ${formatEventDate(evento.montagem[evento.montagem.length - 1].date)}`
                                                        ) : (
                                                            `${formatEventDate(evento.setupStartDate!)} - ${formatEventDate(evento.setupEndDate!)}`
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                {/* Evento - Nova estrutura com fallback */}
                                {((evento.evento && evento.evento.length > 0) ||
                                    (evento.preparationStartDate && evento.preparationEndDate)) && (
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-blue-600 mb-1">EVENTO</div>
                                                    <div className="text-sm text-gray-600">
                                                        {evento.evento && evento.evento.length > 0 ? (
                                                            evento.evento.length === 1 ?
                                                                formatEventDate(evento.evento[0].date) :
                                                                `${formatEventDate(evento.evento[0].date)} - ${formatEventDate(evento.evento[evento.evento.length - 1].date)}`
                                                        ) : (
                                                            `${formatEventDate(evento.preparationStartDate!)} - ${formatEventDate(evento.preparationEndDate!)}`
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                {/* Desmontagem - Nova estrutura com fallback */}
                                {((evento.desmontagem && evento.desmontagem.length > 0) ||
                                    (evento.finalizationStartDate && evento.finalizationEndDate)) && (
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="text-center">
                                                    <div className="text-sm font-medium text-purple-600 mb-1">DESMONTAGEM</div>
                                                    <div className="text-sm text-gray-600">
                                                        {evento.desmontagem && evento.desmontagem.length > 0 ? (
                                                            evento.desmontagem.length === 1 ?
                                                                formatEventDate(evento.desmontagem[0].date) :
                                                                `${formatEventDate(evento.desmontagem[0].date)} - ${formatEventDate(evento.desmontagem[evento.desmontagem.length - 1].date)}`
                                                        ) : (
                                                            `${formatEventDate(evento.finalizationStartDate!)} - ${formatEventDate(evento.finalizationEndDate!)}`
                                                        )}
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