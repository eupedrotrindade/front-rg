/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useDeleteEventParticipant } from '@/features/eventos/api/mutation/use-delete-event-participant'
import { useCoordenadoresByEvent } from '@/features/eventos/api/query/use-coordenadores-by-event'
import { useEventVehiclesByEvent } from '@/features/eventos/api/query/use-event-vehicles-by-event'
import { useEmpresasByEvent } from '@/features/eventos/api/query/use-empresas'
import { useUpdateEventParticipant } from '@/features/eventos/api/mutation/use-update-event-participant'
import { useCheckIn, useCheckOut } from '@/features/eventos/api/mutation/use-check-operations'
import { useDeleteEventAttendance } from '@/features/eventos/api/mutation/use-delete-event-attendance'
import { useEventAttendanceByEventAndDate } from '@/features/eventos/api/query/use-event-attendance'
import { changeCredentialCode } from '@/features/eventos/actions/movement-credentials'
import { updateParticipantCredential } from '@/features/eventos/actions/update-participant-credential'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Calendar, Clock, MapPin, Mail, Phone, UserCog, Eye, Trash2, Users, Building, Search, Download, Upload, Plus, Filter, User, Check, X, Loader2, RotateCcw, MoreVertical } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EventParticipant } from '@/features/eventos/types'

import EventParticipantEditDialog from '@/features/eventos/components/event-participant-edit-dialog'
import EventLayout from '@/components/dashboard/dashboard-layout'
import ModalAdicionarStaff from '@/components/operador/modalAdicionarStaff'
import { useCredentials } from '@/features/eventos/api/query'

export default function EventoDetalhesPage() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data: eventos } = useEventos()
    const {
        data: participantsData = [],
        isLoading: participantsLoading,
    } = useEventParticipantsByEvent({ eventId: String(params.id) });

    const { mutate: deleteParticipant, isPending: isDeleting } = useDeleteEventParticipant()
    const { data: credentials } = useCredentials({ eventId: String(params.id) })
    // Hooks para coordenadores, vagas e empresas
    const { data: coordenadores = [], isLoading: coordenadoresLoading } = useCoordenadoresByEvent({
        eventId: String(params.id)
    })
    const { data: vagas = [], isLoading: vagasLoading } = useEventVehiclesByEvent({
        eventId: String(params.id)
    })
    const { data: empresas = [], isLoading: empresasLoading } = useEmpresasByEvent(String(params.id))
    const { mutate: updateParticipant, isPending: isUpdatingParticipant } = useUpdateEventParticipant()
    const checkInMutation = useCheckIn()
    const checkOutMutation = useCheckOut()
    const deleteAttendanceMutation = useDeleteEventAttendance()

    const [deletingParticipant, setDeletingParticipant] = useState<EventParticipant | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDay, setSelectedDay] = useState<string>('')
    const [replicatingStaff, setReplicatingStaff] = useState<string | null>(null)
    const [showReplicateDialog, setShowReplicateDialog] = useState(false)
    const [replicateSourceDay, setReplicateSourceDay] = useState<string>('')
    const [showProgressDialog, setShowProgressDialog] = useState(false)
    const [progressData, setProgressData] = useState<{
        total: number
        current: number
        processed: number
        currentParticipant: string
    }>({
        total: 0,
        current: 0,
        processed: 0,
        currentParticipant: ''
    })

    // Estado para modal de adicionar staff
    const [showAdicionarStaffModal, setShowAdicionarStaffModal] = useState(false)

    // Estados para check-in/check-out
    const [participantAction, setParticipantAction] = useState<EventParticipant | null>(null)
    const [codigoPulseira, setCodigoPulseira] = useState<string>('')
    const [selectedDateForAction, setSelectedDateForAction] = useState<string>('')
    const [popupCheckin, setPopupCheckin] = useState(false)
    const [popupCheckout, setPopupCheckout] = useState(false)
    const [popupResetCheckin, setPopupResetCheckin] = useState(false)
    const [loading, setLoading] = useState(false)

    // Estados para seleção múltipla e edição em massa
    const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
    const [showBulkEditModal, setShowBulkEditModal] = useState(false)
    const [bulkEditData, setBulkEditData] = useState({
        credentialId: 'no-change',
        role: '',
        company: 'no-change'
    })
    const [bulkEditLoading, setBulkEditLoading] = useState(false)

    // Estados para remoção de duplicados
    const [showDuplicatesModal, setShowDuplicatesModal] = useState(false)
    const [duplicatesLoading, setDuplicatesLoading] = useState(false)

    // Função para converter data para formato da API (dd-mm-yyyy)
    const formatDateForAPI = useCallback((dateStr: string): string => {
        // Se já está no formato dd-mm-yyyy, retorna como está
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        // Se está no formato dd/mm/yyyy, converte para dd-mm-yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${day}-${month}-${year}`;
        }

        // Se está no formato yyyy-mm-dd, converte para dd-mm-yyyy
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        }

        // Se é uma data JavaScript, converte para dd-mm-yyyy
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
    // Este hook busca os dados reais de check-in/check-out do sistema
    const { data: attendanceData = [], isLoading: attendanceLoading } = useEventAttendanceByEventAndDate(
        String(params.id),
        formatDateForAPI(selectedDay)
    )

    const evento = Array.isArray(eventos)
        ? eventos.find((e) => String(e.id) === String(params.id))
        : undefined

    const participantsArray = Array.isArray(participantsData) ? participantsData : []


    // Função para normalizar formato de data
    const normalizeDate = useCallback((dateStr: string): string => {
        // Se já está no formato dd/mm/yyyy, retorna como está
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        // Se está no formato yyyy-mm-dd, converte para dd/mm/yyyy
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}/${year}`;
        }

        // Se é uma data JavaScript, converte para dd/mm/yyyy
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

        // Adicionar dias de Evento/evento
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
    const getParticipantesPorDia = useCallback((dia: string): EventParticipant[] => {
        return participantsArray.filter((participant: EventParticipant) => {
            if (!participant.daysWork || participant.daysWork.length === 0) {
                return false; // Se não tem dias de trabalho definidos, não aparece em nenhum dia específico
            }

            // Normalizar o dia selecionado
            const normalizedDia = normalizeDate(dia);

            // Verificar se algum dos dias de trabalho do participante corresponde ao dia selecionado
            const hasDay = participant.daysWork.some(workDay => {
                const normalizedWorkDay = normalizeDate(workDay);
                const matches = normalizedWorkDay === normalizedDia;
                return matches;
            });

            return hasDay;
        });
    }, [participantsArray, normalizeDate]);

    // Função para obter a cor da tab baseada no tipo de dia
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'setup':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50';
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50';
                case 'finalization':
                    return 'border-purple-500 text-purple-600 bg-purple-50';
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50';
            }
        } else {
            switch (type) {
                case 'setup':
                    return 'hover:text-yellow-700 hover:border-yellow-300';
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300';
                case 'finalization':
                    return 'hover:text-purple-700 hover:border-purple-300';
                default:
                    return 'hover:text-gray-700 hover:border-gray-300';
            }
        }
    }, []);

    // Função para verificar se o participante já fez check-in no dia selecionado
    const hasCheckIn = useCallback((participantId: string, date: string): boolean => {
        if (!attendanceData || attendanceData.length === 0) return false;

        const normalizedDate = normalizeDate(date);
        return attendanceData.some(attendance => {
            const normalizedAttendanceDate = normalizeDate(attendance.date);
            return attendance.participantId === participantId &&
                attendance.checkIn !== null &&
                normalizedAttendanceDate === normalizedDate;
        });
    }, [attendanceData, normalizeDate]);

    // Função para verificar se o participante já fez check-out no dia selecionado
    const hasCheckOut = useCallback((participantId: string, date: string): boolean => {
        if (!attendanceData || attendanceData.length === 0) return false;

        const normalizedDate = normalizeDate(date);
        return attendanceData.some(attendance => {
            const normalizedAttendanceDate = normalizeDate(attendance.date);
            return attendance.participantId === participantId &&
                attendance.checkOut !== null &&
                normalizedAttendanceDate === normalizedDate;
        });
    }, [attendanceData, normalizeDate]);

    // KPIs baseados no dia selecionado
    const participantesDoDia = getParticipantesPorDia(selectedDay)
    const totalParticipants = participantesDoDia.length
    const participantsWithWristbands = participantesDoDia.filter(p => p.wristbandId).length
    const participantsWithoutWristbands = totalParticipants - participantsWithWristbands

    // Calcular check-ins e check-outs baseado nos dados reais de attendance
    const checkedInParticipants = participantesDoDia.filter(p => hasCheckIn(p.id, selectedDay)).length
    const checkedOutParticipants = participantesDoDia.filter(p => hasCheckOut(p.id, selectedDay)).length
    const activeParticipants = checkedInParticipants - checkedOutParticipants

    const credentialsArray = Array.isArray(credentials) ? credentials : [];

    // Calcular estatísticas por credencial
    const getCredentialStats = useCallback(() => {
        const stats: Record<string, { total: number; checkedIn: number; credentialName: string; color: string }> = {}

        credentialsArray.forEach(credential => {
            const participantsWithCredential = participantesDoDia.filter(p => p.credentialId === credential.id)
            const checkedInWithCredential = participantsWithCredential.filter(p => hasCheckIn(p.id, selectedDay))

            stats[credential.id] = {
                total: participantsWithCredential.length,
                checkedIn: checkedInWithCredential.length,
                credentialName: credential.nome,
                color: credential.cor
            }
        })

        // Adicionar participantes sem credencial
        const participantsWithoutCredential = participantesDoDia.filter(p => !p.credentialId)
        const checkedInWithoutCredential = participantsWithoutCredential.filter(p => hasCheckIn(p.id, selectedDay))

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

    // Função para detectar participantes duplicados
    const findDuplicates = useCallback(() => {
        const duplicates: Array<{
            cpf: string;
            participants: EventParticipant[];
            reason: string;
        }> = []

        // Agrupar por CPF
        const participantsByCpf = participantsArray.reduce((acc, participant) => {
            if (participant.cpf) {
                const cpf = participant.cpf.replace(/\D/g, '') // Remove formatação
                if (!acc[cpf]) {
                    acc[cpf] = []
                }
                acc[cpf].push(participant)
            }
            return acc
        }, {} as Record<string, EventParticipant[]>)

        // Encontrar duplicados por CPF
        Object.entries(participantsByCpf).forEach(([cpf, participants]) => {
            if (participants.length > 1) {
                duplicates.push({
                    cpf,
                    participants,
                    reason: 'CPF duplicado'
                })
            }
        })

        return duplicates
    }, [participantsArray])

    const duplicates = findDuplicates()

    // Filtrar participantes
    const filteredParticipants = useMemo(() => {
        let filtered = participantesDoDia

        // Filtrar por termo de busca
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.cpf?.includes(searchTerm) ||
                p.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.role?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        return filtered
    }, [participantesDoDia, searchTerm])

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



    const handleDeleteParticipant = (participant: EventParticipant) => {
        setDeletingParticipant(participant)
    }

    const confirmDeleteParticipant = () => {
        if (!deletingParticipant) return

        deleteParticipant(
            {
                id: deletingParticipant.id,
                performedBy: "current-user"
            },
            {
                onSuccess: () => {
                    toast.success("Participante excluído com sucesso!")
                    setDeletingParticipant(null)
                },
                onError: (error) => {
                    console.error("Erro ao excluir participante:", error)
                    toast.error("Erro ao excluir participante. Tente novamente.")
                },
            }
        )
    }

    const getInitials = (nome: string) => nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    // Função para abrir popup de check-in
    const abrirCheckin = (participant: EventParticipant) => {
        // Verificar se já fez check-in no dia selecionado
        if (hasCheckIn(participant.id, selectedDay)) {
            toast.error("Este participante já fez check-in neste dia!");
            return;
        }

        setParticipantAction(participant);
        setCodigoPulseira("");
        setSelectedDateForAction(selectedDay);
        setPopupCheckin(true);
    };

    // Função para abrir popup de check-out
    const abrirCheckout = (participant: EventParticipant) => {
        // Verificar se já fez check-out no dia selecionado
        if (hasCheckOut(participant.id, selectedDay)) {
            toast.error("Este participante já fez check-out neste dia!");
            return;
        }

        // Verificar se fez check-in antes de fazer check-out
        if (!hasCheckIn(participant.id, selectedDay)) {
            toast.error("Este participante precisa fazer check-in antes do check-out!");
            return;
        }

        setParticipantAction(participant);
        setSelectedDateForAction(selectedDay);
        setPopupCheckout(true);
    };

    // Função para abrir popup de reset check-in
    const abrirResetCheckin = (participant: EventParticipant) => {
        setParticipantAction(participant);
        setPopupResetCheckin(true);
    };

    // Função para confirmar check-in
    const confirmarCheckin = async () => {
        if (!participantAction || !codigoPulseira.trim()) {
            toast.error("Dados insuficientes para realizar check-in");
            return;
        }

        // Verificar se já fez check-in no dia selecionado
        const dateToCheck = selectedDateForAction || selectedDay;
        if (hasCheckIn(participantAction.id, dateToCheck)) {
            toast.error("Este participante já fez check-in neste dia!");
            setPopupCheckin(false);
            setParticipantAction(null);
            setCodigoPulseira("");
            setSelectedDateForAction("");
            return;
        }

        setLoading(true);
        try {
            const today = new Date()
            const day = String(today.getDate()).padStart(2, '0')
            const month = String(today.getMonth() + 1).padStart(2, '0')
            const year = today.getFullYear()
            const todayFormatted = `${day}-${month}-${year}`

            const dateToUse = selectedDateForAction
                ? formatDateForAPI(selectedDateForAction)
                : todayFormatted;

            await checkInMutation.mutateAsync({
                participantId: participantAction.id,
                date: dateToUse,
                validatedBy: "Sistema",
                performedBy: "Sistema",
                notes: `Check-in realizado via painel de eventos - Pulseira: ${codigoPulseira.trim()}`,
            });

            // Salvar pulseira no sistema de movement_credentials
            try {
                await changeCredentialCode(
                    String(params.id),
                    participantAction.id,
                    codigoPulseira.trim()
                );
            } catch (error) {
                console.error("⚠️ Erro ao salvar pulseira no sistema:", error);
            }

            toast.success("Check-in realizado com sucesso!");

            // Forçar atualização dos dados de attendance
            await queryClient.invalidateQueries({
                queryKey: ["event-attendance-by-event-date", String(params.id), formatDateForAPI(selectedDay)]
            });

            setPopupCheckin(false);
            setParticipantAction(null);
            setCodigoPulseira("");
            setSelectedDateForAction("");
        } catch (error) {
            console.error("❌ Erro ao realizar check-in:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            toast.error(`Erro ao realizar check-in: ${errorMessage}`);
        }
        setLoading(false);
    };

    // Função para confirmar check-out
    const confirmarCheckout = async () => {
        if (!participantAction) {
            toast.error("Participante não selecionado");
            return;
        }

        // Verificar se já fez check-out no dia selecionado
        const dateToCheck = selectedDateForAction || selectedDay;
        if (hasCheckOut(participantAction.id, dateToCheck)) {
            toast.error("Este participante já fez check-out neste dia!");
            setPopupCheckout(false);
            setParticipantAction(null);
            setSelectedDateForAction("");
            return;
        }

        // Verificar se fez check-in antes de fazer check-out
        if (!hasCheckIn(participantAction.id, dateToCheck)) {
            toast.error("Este participante precisa fazer check-in antes do check-out!");
            setPopupCheckout(false);
            setParticipantAction(null);
            setSelectedDateForAction("");
            return;
        }

        setLoading(true);
        try {
            const today = new Date()
            const day = String(today.getDate()).padStart(2, '0')
            const month = String(today.getMonth() + 1).padStart(2, '0')
            const year = today.getFullYear()
            const todayFormatted = `${day}-${month}-${year}`

            const dateToUse = selectedDateForAction
                ? formatDateForAPI(selectedDateForAction)
                : todayFormatted;

            await checkOutMutation.mutateAsync({
                participantId: participantAction.id,
                date: dateToUse,
                validatedBy: "Sistema",
                performedBy: "Sistema",
                notes: "Check-out realizado via painel de eventos",
            });

            toast.success("Check-out realizado com sucesso!");

            // Forçar atualização dos dados de attendance
            await queryClient.invalidateQueries({
                queryKey: ["event-attendance-by-event-date", String(params.id), formatDateForAPI(selectedDay)]
            });

            setPopupCheckout(false);
            setParticipantAction(null);
            setSelectedDateForAction("");
        } catch (error) {
            console.error("❌ Erro ao realizar check-out:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            toast.error(`Erro ao realizar check-out: ${errorMessage}`);
        }
        setLoading(false);
    };

    // Funções para seleção múltipla
    const toggleParticipantSelection = (participantId: string) => {
        setSelectedParticipants(prev => {
            const newSet = new Set(prev)
            if (newSet.has(participantId)) {
                newSet.delete(participantId)
            } else {
                newSet.add(participantId)
            }
            return newSet
        })
    }

    const selectAllParticipants = () => {
        if (selectedParticipants.size === filteredParticipants.length) {
            setSelectedParticipants(new Set())
        } else {
            setSelectedParticipants(new Set(filteredParticipants.map(p => p.id)))
        }
    }

    const clearSelection = () => {
        setSelectedParticipants(new Set())
    }

    // Função para edição em massa
    const handleBulkEdit = async () => {
        if (selectedParticipants.size === 0) {
            toast.error('Nenhum participante selecionado')
            return
        }

        setBulkEditLoading(true)
        let successCount = 0
        let errorCount = 0

        try {
            for (const participantId of Array.from(selectedParticipants)) {
                try {
                    const updateData: any = {}

                    if (bulkEditData.credentialId && bulkEditData.credentialId !== 'no-change') {
                        await updateParticipantCredential(participantId, bulkEditData.credentialId)
                        successCount++
                    }

                    if (bulkEditData.role) {
                        updateData.role = bulkEditData.role
                    }

                    if (bulkEditData.company && bulkEditData.company !== 'no-change') {
                        updateData.company = bulkEditData.company
                    }

                    if (Object.keys(updateData).length > 0) {
                        await updateParticipant(
                            { id: participantId, ...updateData },
                            {
                                onSuccess: () => successCount++,
                                onError: () => errorCount++
                            }
                        )
                    }

                } catch (error) {
                    console.error(`Erro ao atualizar participante ${participantId}:`, error)
                    errorCount++
                }
            }

            toast.success(`Atualização concluída: ${successCount} sucessos, ${errorCount} erros`)
            setShowBulkEditModal(false)
            setBulkEditData({ credentialId: 'no-change', role: '', company: 'no-change' })
            clearSelection()

        } catch (error) {
            toast.error('Erro na edição em massa')
        }

        setBulkEditLoading(false)
    }

    // Função para remover duplicados
    const handleRemoveDuplicates = async () => {
        setDuplicatesLoading(true)
        let removedCount = 0
        let errorCount = 0

        try {
            for (const duplicate of duplicates) {
                // Para cada grupo de duplicados, manter apenas o primeiro e remover os demais
                const participantsToRemove = duplicate.participants.slice(1) // Remove o primeiro, mantém os outros

                for (const participant of participantsToRemove) {
                    try {
                        await new Promise((resolve, reject) => {
                            deleteParticipant(
                                {
                                    id: participant.id,
                                    performedBy: "sistema-remocao-duplicados"
                                },
                                {
                                    onSuccess: () => {
                                        removedCount++
                                        resolve(true)
                                    },
                                    onError: (error) => {
                                        console.error(`Erro ao remover duplicado ${participant.id}:`, error)
                                        errorCount++
                                        reject(error)
                                    }
                                }
                            )
                        })

                        // Delay pequeno entre remoções para evitar sobrecarga
                        await new Promise(resolve => setTimeout(resolve, 200))

                    } catch (error) {
                        console.error(`Erro ao processar duplicado ${participant.id}:`, error)
                        errorCount++
                    }
                }
            }

            if (removedCount > 0) {
                toast.success(`${removedCount} participantes duplicados removidos com sucesso!`)
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} erros durante a remoção`)
            }

            setShowDuplicatesModal(false)

        } catch (error) {
            console.error('Erro geral na remoção de duplicados:', error)
            toast.error('Erro ao remover duplicados')
        }

        setDuplicatesLoading(false)
    }

    // Função para resetar check-in - deleta todos os registros de attendance
    const handleResetCheckin = async () => {
        if (!participantAction) return

        setLoading(true)
        try {
            await deleteAttendanceMutation.mutateAsync({
                participantId: participantAction.id
            })

            toast.success("Check-in resetado com sucesso!");

            // Forçar atualização dos dados de attendance
            await queryClient.invalidateQueries({
                queryKey: ["event-attendance-by-event-date", String(params.id), formatDateForAPI(selectedDay)]
            });

            setPopupResetCheckin(false)
            setParticipantAction(null)
        } catch (error) {
            console.error('Erro ao resetar check-in:', error)
            toast.error("Erro ao resetar check-in");
        }
        setLoading(false)
    }

    const getCredencial = (participant: EventParticipant): string => {
        const credential = credentialsArray.find((c: { id: string }) => c.id === participant.credentialId);
        if (credential && participant.credentialId) {
            return participant.credentialId;
        } else {
            return 'SEM CREDENCIAL';
        }
    };

    const getBotaoAcao = (participant: EventParticipant) => {
        // Verificar se o participante trabalha no dia selecionado usando normalização
        if (!participant.daysWork || participant.daysWork.length === 0) {
            return null; // Não trabalha nesta data
        }

        // Normalizar o dia selecionado
        const normalizedSelectedDay = normalizeDate(selectedDay);

        // Verificar se algum dos dias de trabalho do participante corresponde ao dia selecionado
        const hasDay = participant.daysWork.some(workDay => {
            const normalizedWorkDay = normalizeDate(workDay);
            return normalizedWorkDay === normalizedSelectedDay;
        });

        if (!hasDay) {
            return null; // Não trabalha nesta data
        }

        // Verificar status de presença baseado nos dados reais de attendance
        const hasCheckInToday = hasCheckIn(participant.id, selectedDay);
        const hasCheckOutToday = hasCheckOut(participant.id, selectedDay);


        if (!hasCheckInToday) {
            return "checkin";
        } else if (hasCheckInToday && !hasCheckOutToday) {
            return "checkout";
        } else if (hasCheckInToday && hasCheckOutToday) {
            return "reset"; // Permitir resetar quando já fez check-in e check-out
        } else {
            return null;
        }
    }

    // Função para abrir popup de replicação de staff
    const handleOpenReplicateDialog = (sourceDay: string) => {
        setReplicateSourceDay(sourceDay)
        setShowReplicateDialog(true)
    }

    // Função para replicar staff rapidamente
    const handleReplicateStaff = async () => {
        if (!replicateSourceDay) return

        setReplicatingStaff(replicateSourceDay)
        setShowReplicateDialog(false)

        try {
            // Buscar todos os participantes que trabalham no dia atual (origem)
            const participantsFromCurrentDay = getParticipantesPorDia(selectedDay)

            console.log('Dia de origem:', selectedDay)
            console.log('Dia de destino:', replicateSourceDay)
            console.log('Participantes encontrados no dia de origem:', participantsFromCurrentDay)

            // Inicializar dados de progresso
            setProgressData({
                total: participantsFromCurrentDay.length,
                current: 0,
                processed: 0,
                currentParticipant: ''
            })
            setShowProgressDialog(true)

            let processedCount = 0

            // Para cada participante do dia atual, adicionar ao dia de destino
            for (let i = 0; i < participantsFromCurrentDay.length; i++) {
                const participant = participantsFromCurrentDay[i]
                const currentParticipantName = participant.name || 'Participante sem nome'

                // Atualizar progresso
                setProgressData(prev => ({
                    ...prev,
                    current: i + 1,
                    currentParticipant: currentParticipantName
                }))

                const currentDaysWork = participant.daysWork || []
                const alreadyWorksInDestination = currentDaysWork.includes(replicateSourceDay)

                if (alreadyWorksInDestination) {
                    // Se já trabalha no dia de destino, apenas limpar dados de check-in/check-out
                    console.log(`Resetando dados para ${participant.name} no dia ${replicateSourceDay}`)
                    processedCount++
                    setProgressData(prev => ({ ...prev, processed: processedCount }))
                } else {
                    // Adicionar o dia de destino aos dias de trabalho
                    const updatedDaysWork = [...currentDaysWork, replicateSourceDay]

                    try {
                        // Atualizar participante via API - apenas dados básicos
                        console.log(`Adicionando dia ${replicateSourceDay} para ${participant.name}`)

                        const updateData = {
                            id: participant.id,
                            eventId: participant.eventId || String(params.id),
                            name: participant.name || '',
                            cpf: participant.cpf || '',
                            role: participant.role || '',
                            company: participant.company || '',
                            credentialId: participant.credentialId || undefined,
                            daysWork: updatedDaysWork
                        }

                        console.log('Dados para atualização:', updateData)

                        updateParticipant(updateData, {
                            onSuccess: () => {
                                console.log(`✅ ${participant.name} atualizado com sucesso`)
                                processedCount++
                                setProgressData(prev => ({ ...prev, processed: processedCount }))
                            },
                            onError: (error) => {
                                console.error(`❌ Erro ao atualizar ${participant.name}:`, error)
                            }
                        })

                        // Simular delay para mostrar progresso
                        await new Promise(resolve => setTimeout(resolve, 500))

                    } catch (error) {
                        console.error(`Erro ao atualizar ${participant.name}:`, error)
                    }
                }
            }

            // Fechar popup de progresso após delay
            setTimeout(() => {
                setShowProgressDialog(false)
                setReplicatingStaff(null)

                toast.success(
                    `Replicação concluída! ${processedCount} participantes processados para ${replicateSourceDay}.`
                )
            }, 1000)

        } catch (error) {
            console.error('Erro na replicação:', error)
            setShowProgressDialog(false)
            setReplicatingStaff(null)
            toast.error('Erro ao replicar participantes')
        }
    }

    const isLoading = participantsLoading || coordenadoresLoading || vagasLoading || empresasLoading || attendanceLoading

    return (
        <EventLayout eventId={String(params.id)} eventName={evento.name}>
            <div className="p-8">


                {/* Action Bar */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="btn-brand-green"

                                onClick={() => window.open(`/eventos/${params.id}/import-export`, '_blank')}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Importar/Exportar
                            </Button>


                            <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-600 border-gray-200 hover:bg-gray-50 text-gray-600 hover:border-gray-300 bg-white shadow-sm transition-all duration-200"
                                disabled={isLoading}
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filtros
                            </Button>

                            {/* {duplicates.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-white shadow-sm transition-all duration-200"
                                    onClick={() => setShowDuplicatesModal(true)}
                                    disabled={isLoading}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover Duplicados ({duplicates.length})
                                </Button>
                            )} */}
                        </div>

                        <Button
                            onClick={() => setShowAdicionarStaffModal(true)}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Staff
                        </Button>
                    </div>
                </div>



                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Procure pelo nome, cpf ou código da pulseira"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-gray-200 focus:border-purple-500 focus:ring-purple-500 shadow-sm transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Estatísticas por Credencial */}
                {selectedDay && (
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Object.entries(getCredentialStats()).map(([credentialId, stats]) => (
                                <Card key={credentialId} className="bg-white shadow-lg border-l-4" style={{ borderLeftColor: stats.color }}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: stats.color }}
                                                />
                                                <span className="text-sm font-medium text-gray-900 uppercase">
                                                    {stats.credentialName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-2xl font-bold text-gray-900">
                                                {stats.checkedIn}/{stats.total}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500">Check-ins</div>
                                                <div className="text-xs text-gray-600">
                                                    {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                                                </div>
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
                    </div>
                )}

                {/* Tabs dos dias do evento com carrossel */}
                <div className="mb-8">
                    <div className="border-b border-gray-200 bg-white rounded-t-lg relative">
                        {/* Container dos tabs sem scroll horizontal */}
                        <nav
                            className="-mb-px flex flex-wrap gap-1 px-4 py-2"
                        >
                            {getEventDays().map((day) => {
                                const participantesNoDia = getParticipantesPorDia(day.id).length;
                                const isActive = selectedDay === day.id;

                                return (
                                    <div key={day.id} className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedDay(day.id)}
                                            className={`border-b-2 py-2 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${isActive
                                                ? getTabColor(day.type, true)
                                                : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                                                }`}
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-medium">
                                                    {day.label.split(' ')[0]}
                                                </span>
                                                <span className="text-xs opacity-75">
                                                    ({participantesNoDia})
                                                </span>
                                            </div>
                                        </button>
                                        {isActive && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenReplicateDialog(day.id)}
                                                disabled={replicatingStaff === day.id}
                                                className="text-xs h-6 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                            >
                                                {replicatingStaff === day.id ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                                                        Replicando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Users className="w-3 h-3 mr-1" />
                                                        Replicar Participantes
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Barra de ações em massa */}
                {selectedParticipants.size > 0 && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-blue-900">
                                    {selectedParticipants.size} participante(s) selecionado(s)
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearSelection}
                                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Limpar seleção
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setShowBulkEditModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <UserCog className="w-4 h-4 mr-2" />
                                    Editar em massa
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <Table className='uppercase'>
                        <TableHeader>
                            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider w-12">
                                    <Checkbox
                                        checked={selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0}
                                        onCheckedChange={selectAllParticipants}
                                    />
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                    Participante
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                                    Empresa
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                                    Validado Por
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                    CPF
                                </TableHead>
                                <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                    Ações
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white divide-y divide-gray-100 text-gray-600">
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="px-6 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <User className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-semibold text-gray-700 mb-2">Carregando...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredParticipants.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="px-6 py-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <User className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-semibold text-gray-700 mb-2">
                                                Nenhum participante encontrado para {selectedDay}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Adicione participantes com dias de trabalho definidos ou ajuste os filtros
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredParticipants.map((participant: EventParticipant, index: number) => {
                                const botaoTipo = getBotaoAcao(participant)

                                return (
                                    <TableRow
                                        key={index}
                                        className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 cursor-pointer transition-all duration-200"
                                    >
                                        <TableCell className="px-6 py-4 whitespace-nowrap w-12">
                                            <Checkbox
                                                checked={selectedParticipants.has(participant.id)}
                                                onCheckedChange={() => toggleParticipantSelection(participant.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            <div className="flex items-center">

                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {participant.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {participant.role}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                                            <div className="space-y-1">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {participant.company}
                                                </span>
                                                {participant.daysWork && participant.daysWork.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {participant.daysWork.slice(0, 2).map((day, idx) => (
                                                            <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                {day}
                                                            </span>
                                                        ))}
                                                        {participant.daysWork.length > 2 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                +{participant.daysWork.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                                            <div className="space-y-1">
                                                <p className="text-gray-600">{participant.validatedBy || '-'}</p>
                                                {/* Indicadores de status de check-in/check-out */}
                                                <div className="flex gap-1">
                                                    {hasCheckIn(participant.id, selectedDay) && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            <Check className="w-3 h-3 mr-1" />
                                                            Check-in
                                                        </span>
                                                    )}
                                                    {hasCheckOut(participant.id, selectedDay) && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Check-out
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                            <p className="text-gray-600">{participant.cpf}</p>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                {/* Botão principal de ação */}
                                                {botaoTipo === "checkin" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                                        disabled={loading}
                                                        onClick={() => abrirCheckin(participant)}
                                                    >
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Check-in
                                                    </Button>
                                                )}
                                                {botaoTipo === "checkout" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                                        disabled={loading}
                                                        onClick={() => abrirCheckout(participant)}
                                                    >
                                                        <Clock className="w-4 h-4 mr-1" />
                                                        Check-out
                                                    </Button>
                                                )}
                                                {botaoTipo === "reset" && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                                                        disabled={loading}
                                                        onClick={() => abrirResetCheckin(participant)}
                                                    >
                                                        <RotateCcw className="w-4 h-4 mr-1" />
                                                        Reset
                                                    </Button>
                                                )}

                                                {/* Dropdown com ações secundárias */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50"
                                                        >
                                                            <MoreVertical className="h-4 w-4 text-gray-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 bg-white">
                                                        {/* Botão de reset quando está em checkout */}
                                                        {botaoTipo === "checkout" && (
                                                            <DropdownMenuItem
                                                                onClick={() => abrirResetCheckin(participant)}
                                                                className="text-yellow-600 focus:text-yellow-700"
                                                            >
                                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                                Resetar Check-in
                                                            </DropdownMenuItem>
                                                        )}

                                                        {/* Editar participante */}
                                                        <DropdownMenuItem asChild>
                                                            <EventParticipantEditDialog participant={participant} />
                                                        </DropdownMenuItem>

                                                        {/* Excluir participante */}
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteParticipant(participant)}
                                                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Excluir Participante
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Dialog de Confirmação de Exclusão de Participante */}
            <AlertDialog open={!!deletingParticipant} onOpenChange={(open) => !open && setDeletingParticipant(null)}>
                <AlertDialogContent className="bg-white text-black">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o participante &quot;{deletingParticipant?.name}&quot;?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteParticipant}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Replicação de Staff */}
            <AlertDialog open={showReplicateDialog} onOpenChange={setShowReplicateDialog}>
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-600" />
                            Replicar Participantes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Escolha a nova data para onde os participantes serão replicados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Seleção da nova data */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nova Data
                            </label>
                            <select
                                value={replicateSourceDay}
                                onChange={(e) => setReplicateSourceDay(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Selecione uma data</option>
                                {getEventDays().map((day) => (
                                    <option key={day.id} value={day.id}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Informações sobre a replicação */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">Atenção</span>
                            </div>
                            <div className="text-xs text-yellow-700">
                                Serão levados apenas: NOME, CPF, FUNÇÃO, EMPRESA e TIPO DE CREDENCIAL.
                                Todos os dados de check-in/check-out serão limpos na nova data.
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReplicateStaff}
                            disabled={!replicateSourceDay}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {replicatingStaff ? "Replicando..." : "Confirmar Replicação"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Popup de Progresso */}
            <AlertDialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
                <AlertDialogContent className="max-w-md bg-white text-black">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            Replicando Participantes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Atualizando dias de trabalho...
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4">
                        {/* Barra de Progresso */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progresso</span>
                                <span>{progressData.current} / {progressData.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${progressData.total > 0 ? (progressData.current / progressData.total) * 100 : 0}%`
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Participante Atual */}
                        {progressData.currentParticipant && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        Processando: {progressData.currentParticipant}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Estatísticas */}
                        <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                            <div className="font-bold text-green-700 text-lg">{progressData.processed}</div>
                            <div className="text-sm text-green-600">Participantes processados</div>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {/* DIALOG DUPLICADOS */}
            {/* This section is no longer needed as the import/export system handles duplicates */}

            {/* DIALOG RESUMO IMPORTAÇÃO */}
            {/* This section is no longer needed as the import/export system handles resumo */}

            {/* Dialog de Check-in */}
            <AlertDialog open={popupCheckin} onOpenChange={setPopupCheckin}>
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            Realizar Check-in
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Digite o código da pulseira para realizar o check-in.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Código da Pulseira
                            </label>
                            <Input
                                type="text"
                                value={codigoPulseira}
                                onChange={(e) => setCodigoPulseira(e.target.value)}
                                placeholder="Digite o código da pulseira"
                                className="w-full"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        confirmarCheckin();
                                    }
                                }}
                            />
                        </div>

                        {participantAction && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        {participantAction.name}
                                    </span>
                                </div>
                                <div className="text-xs text-blue-700 mt-1">
                                    CPF: {participantAction.cpf}
                                </div>
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarCheckin}
                            disabled={loading || !codigoPulseira.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {loading ? "Processando..." : "Confirmar Check-in"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Check-out */}
            <AlertDialog open={popupCheckout} onOpenChange={setPopupCheckout}>
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-red-600" />
                            Realizar Check-out
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Confirme o check-out do participante.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {participantAction && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-800">
                                        {participantAction.name}
                                    </span>
                                </div>
                                <div className="text-xs text-red-700 mt-1">
                                    CPF: {participantAction.cpf}
                                </div>
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarCheckout}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {loading ? "Processando..." : "Confirmar Check-out"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Reset Check-in */}
            <AlertDialog open={popupResetCheckin} onOpenChange={setPopupResetCheckin}>
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-yellow-600" />
                            Resetar Check-in
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação irá remover o registro de check-in do participante.
                            Você tem certeza que deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {participantAction && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-yellow-600" />
                                    <span className="text-sm font-medium text-yellow-800">
                                        {participantAction.name}
                                    </span>
                                </div>
                                <div className="text-xs text-yellow-700 mt-1">
                                    CPF: {participantAction.cpf}
                                </div>
                            </div>
                        )}

                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <X className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-800">Atenção</span>
                            </div>
                            <div className="text-xs text-red-700">
                                • O registro de check-in será removido permanentemente<br />
                                • O participante ficará como &quot;não presente&quot; no dia selecionado<br />
                                • Esta ação ficará registrada no histórico
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetCheckin}
                            disabled={loading}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            {loading ? "Processando..." : "Resetar Check-in"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Adicionar Staff */}
            <ModalAdicionarStaff
                isOpen={showAdicionarStaffModal}
                onClose={() => setShowAdicionarStaffModal(false)}
                eventId={String(params.id)}
                evento={evento}
                onSuccess={() => {
                    // Recarregar dados se necessário
                    console.log("Staff adicionado com sucesso!");
                }}
            />

            {/* Modal de Edição em Massa */}
            <AlertDialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
                <AlertDialogContent className="bg-white text-black max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-blue-600" />
                            Editar em Massa
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Edite {selectedParticipants.size} participante(s) selecionado(s).
                            Apenas os campos preenchidos serão atualizados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Seleção de Credencial */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Credencial
                            </label>
                            <Select
                                value={bulkEditData.credentialId}
                                onValueChange={(value) => setBulkEditData(prev => ({ ...prev, credentialId: value }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione uma credencial (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-change">Não alterar</SelectItem>
                                    {credentialsArray.filter(c => c.isActive !== false).map((credential) => (
                                        <SelectItem key={credential.id} value={credential.id}>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: credential.cor }}
                                                />
                                                {credential.nome}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Campo Função */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Função
                            </label>
                            <Input
                                type="text"
                                value={bulkEditData.role}
                                onChange={(e) => setBulkEditData(prev => ({ ...prev, role: e.target.value }))}
                                placeholder="Nova função (opcional)"
                                className="w-full"
                            />
                        </div>

                        {/* Campo Empresa */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Empresa
                            </label>
                            <Select
                                value={bulkEditData.company}
                                onValueChange={(value) => setBulkEditData(prev => ({ ...prev, company: value }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione uma empresa (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-change">Não alterar</SelectItem>
                                    {empresas?.map((empresa) => (
                                        <SelectItem key={empresa.id} value={empresa.nome}>
                                            {empresa.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Aviso */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <UserCog className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">Atenção</span>
                            </div>
                            <div className="text-xs text-yellow-700">
                                Esta ação irá alterar os dados de {selectedParticipants.size} participante(s).
                                Apenas os campos preenchidos serão atualizados.
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setBulkEditData({ credentialId: 'no-change', role: '', company: 'no-change' })
                        }}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkEdit}
                            disabled={bulkEditLoading || (
                                (!bulkEditData.credentialId || bulkEditData.credentialId === 'no-change') &&
                                !bulkEditData.role &&
                                (!bulkEditData.company || bulkEditData.company === 'no-change')
                            )}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {bulkEditLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                'Atualizar Participantes'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Remoção de Duplicados */}
            <AlertDialog open={showDuplicatesModal} onOpenChange={setShowDuplicatesModal}>
                <AlertDialogContent className="bg-white text-black max-w-4xl max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Remover Participantes Duplicados
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Foram encontrados {duplicates.length} grupos de participantes duplicados.
                            O primeiro de cada grupo será mantido, os demais serão removidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-4">
                        {duplicates.map((duplicate, index) => (
                            <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-800">
                                        CPF: {duplicate.cpf} ({duplicate.reason})
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {duplicate.participants.map((participant, participantIndex) => (
                                        <div
                                            key={participant.id}
                                            className={`p-3 rounded border ${participantIndex === 0
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-100 border-red-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">
                                                    {participant.name}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded ${participantIndex === 0
                                                    ? 'bg-green-200 text-green-800'
                                                    : 'bg-red-200 text-red-800'
                                                    }`}>
                                                    {participantIndex === 0 ? 'MANTER' : 'REMOVER'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                                <div>Função: {participant.role}</div>
                                                <div>Empresa: {participant.company}</div>
                                                {participant.daysWork && (
                                                    <div>Dias: {participant.daysWork.join(', ')}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">Atenção</span>
                            </div>
                            <div className="text-xs text-yellow-700">
                                • Esta ação não pode ser desfeita<br />
                                • Serão removidos {duplicates.reduce((acc, d) => acc + (d.participants.length - 1), 0)} participantes duplicados<br />
                                • Os dados de check-in/check-out dos participantes removidos serão perdidos
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveDuplicates}
                            disabled={duplicatesLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {duplicatesLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removendo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover {duplicates.reduce((acc, d) => acc + (d.participants.length - 1), 0)} Duplicados
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </EventLayout>
    )
}