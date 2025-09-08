/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar, Edit, Loader2, Search, X, Sun, Moon, ChevronDown, Check } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useUpdateEventParticipant } from "@/features/eventos/api/mutation/use-update-event-participant";
import { useCredentials } from "@/features/eventos/api/query";
import { useEmpresasByEvent } from "@/features/eventos/api/query/use-empresas";
import { useCredentialsByShift } from "@/features/eventos/api/query/use-credentials-by-shift";
import { useEmpresasByShift } from "@/features/eventos/api/query/use-empresas-by-shift";
import { useEventAttendanceByEventAndDate } from "@/features/eventos/api/query/use-event-attendance";
import { getMovementCredentialByParticipant, changeCredentialCode } from "@/features/eventos/actions/movement-credentials";
import { useEditAttendance } from "@/features/eventos/api/mutation/use-check-operations";
import { Credential, EventParticipant } from "@/features/eventos/types";

interface ModalEditarStaffProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  participant: EventParticipant | null;
  selectedDay?: string;
  onSuccess?: () => void;
  evento?: any;
}

export default function ModalEditarStaff({
  isOpen,
  onClose,
  eventId,
  participant,
  selectedDay,
  onSuccess,
  evento
}: ModalEditarStaffProps) {
  const [loading, setLoading] = useState(false);
  const [isEmpresaPopoverOpen, setIsEmpresaPopoverOpen] = useState(false);
  const [isCredentialPopoverOpen, setIsCredentialPopoverOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [wristbandCode, setWristbandCode] = useState("");

  // Estado do formulário baseado no participante (tabela event_participants)
  const [staffData, setStaffData] = useState({
    name: "",
    cpf: "",
    rg: "",
    funcao: "",
    empresa: "",
    tipo_credencial: "",
    daysWork: [] as string[]
  });

  // Estado separado para dados de attendance (tabela event_attendance)
  const [attendanceEditData, setAttendanceEditData] = useState({
    checkinDate: "",
    checkinTime: "",
    checkoutDate: "",
    checkoutTime: ""
  });

  // Parse selectedDay to extract shift information
  const parseSelectedDay = useCallback((dayId: string) => {
    if (!dayId) return null;
    const parts = dayId.split('-');
    if (parts.length >= 5) {
      return {
        date: `${parts[0]}-${parts[1]}-${parts[2]}`,
        stage: parts[3] as 'montagem' | 'evento' | 'desmontagem',
        period: parts[4] as 'diurno' | 'noturno' | 'dia_inteiro'
      };
    }
    return null;
  }, []);

  const currentShiftInfo = parseSelectedDay(selectedDay || '');

  // Use filtered hooks when we have shift info, fallback to all items
  const { data: allCredentials = [] } = useCredentials({ eventId });
  const { data: allEmpresas = [] } = useEmpresasByEvent(eventId);

  const { data: shiftCredentials = [] } = useCredentialsByShift({
    eventId,
    shiftId: selectedDay,
    workDate: currentShiftInfo?.date,
    workStage: currentShiftInfo?.stage,
    workPeriod: currentShiftInfo?.period,
    enabled: !!currentShiftInfo
  });

  const { data: shiftEmpresas = [] } = useEmpresasByShift({
    eventId,
    shiftId: selectedDay,
    workDate: currentShiftInfo?.date,
    workStage: currentShiftInfo?.stage,
    workPeriod: currentShiftInfo?.period,
    enabled: !!currentShiftInfo
  });

  // Use filtered data when available, otherwise fall back to all data
  const credentials = currentShiftInfo && shiftCredentials.length > 0 ? shiftCredentials : allCredentials;
  const empresas = currentShiftInfo && shiftEmpresas.length > 0 ? shiftEmpresas : allEmpresas;
  const updateParticipant = useUpdateEventParticipant();
  const editAttendanceMutation = useEditAttendance();

  const formatCPF = (cpf: string): string => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return cpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Função helper para aplicar máscara de maiúsculo
  const applyUppercaseMask = (value: string): string => {
    return value.toUpperCase();
  };

  const formatEventDate = useCallback((dateStr: string): string => {
    // Avoid timezone issues by parsing the date components directly
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    }

    // If it's already in YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }

    // Fallback to original method for other formats
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  // Função para extrair data do shift ID (compatibilidade com novo sistema)
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
    try {
      const dateFormatted = formatEventDate(shiftId.includes('T') ? shiftId : shiftId + 'T00:00:00');
      return {
        dateISO: shiftId,
        dateFormatted,
        stage: 'unknown',
        period: 'diurno' as const
      };
    } catch (error) {
      // Se não conseguir fazer parse da data, retornar valor padrão
      return {
        dateISO: shiftId,
        dateFormatted: shiftId,
        stage: 'unknown',
        period: 'diurno' as const
      };
    }
  }, [formatEventDate]);

  const activeCredentials = credentials.filter((credential: Credential) => credential.isActive !== false);

  const empresasArray = useMemo(() => {
    return Array.isArray(empresas) ? empresas : [];
  }, [empresas]);

  // Função helper para garantir que os dados sejam arrays válidos
  const ensureArray = useCallback((data: any): any[] => {
    if (!data) return [];

    // Se for string, tentar fazer parse
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn('⚠️ Dados não são JSON válido:', data);
        return [];
      }
    }

    // Se já for array, retornar como está
    if (Array.isArray(data)) {
      return data;
    }

    // Se for objeto, tentar extrair dados
    if (typeof data === 'object' && data !== null) {
      console.warn('⚠️ Dados inesperados para dias do evento:', data);
      return [];
    }

    return [];
  }, []);

  // Nova função para obter turnos do evento baseada no sistema de shifts
  const getEventDays = useCallback(() => {
    if (!evento) return [];

    console.log('🔧 getEventDays (modal edit) chamada, evento:', evento);

    const days: Array<{
      id: string;
      label: string;
      date: string;
      type: string;
      period?: 'diurno' | 'noturno' | 'dia_inteiro';
    }> = [];

    // Usar a nova estrutura SimpleEventDay se disponível com suporte a turnos
    const montagemData = ensureArray(evento.montagem);
    console.log('🔧 Processando montagem (modal edit):', montagemData);
    if (montagemData.length > 0) {
      montagemData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            const dateStr = formatEventDate(day.date);
            // Avoid timezone issues by handling date string directly
            const dateISO = day.date.includes('T') ? day.date.split('T')[0] : day.date.split(' ')[0];
            const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

            console.log(`✅ Adicionando montagem (modal edit): ${dateStr} - ${periodLabel}`);
            days.push({
              id: `${dateISO}-montagem-${day.period}`,
              label: `${dateStr} (MONTAGEM - ${periodLabel})`,
              date: dateStr,
              type: 'montagem',
              period: day.period
            });
          } catch (error) {
            console.error('❌ Erro ao processar data da montagem (modal edit):', day, error);
          }
        }
      });
    } else if (evento.setupStartDate && evento.setupEndDate) {
      // Fallback para estrutura antiga com suporte a turnos
      const startDate = new Date(evento.setupStartDate);
      const endDate = new Date(evento.setupEndDate);
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = formatEventDate(date.toISOString());
        // Avoid timezone issues
        const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Adicionar ambos os períodos (diurno e noturno) para cada data
        ['diurno', 'noturno'].forEach(period => {
          const periodTyped = period as 'diurno' | 'noturno';
          const periodLabel = periodTyped === 'diurno' ? 'Diurno' : 'Noturno';

          days.push({
            id: `${dateISO}-montagem-${periodTyped}`,
            label: `${dateStr} (MONTAGEM - ${periodLabel})`,
            date: dateStr,
            type: 'montagem',
            period: periodTyped
          });
        });
      }
    }

    // Adicionar dias de Evento/evento com suporte a turnos
    const eventoData = ensureArray(evento.evento);
    console.log('🔧 Processando evento (modal edit):', eventoData);
    if (eventoData.length > 0) {
      eventoData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            const dateStr = formatEventDate(day.date);
            // Avoid timezone issues by handling date string directly
            const dateISO = day.date.includes('T') ? day.date.split('T')[0] : day.date.split(' ')[0];
            const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

            console.log(`✅ Adicionando evento (modal edit): ${dateStr} - ${periodLabel}`);
            days.push({
              id: `${dateISO}-evento-${day.period}`,
              label: `${dateStr} (EVENTO - ${periodLabel})`,
              date: dateStr,
              type: 'evento',
              period: day.period
            });
          } catch (error) {
            console.error('❌ Erro ao processar data do evento (modal edit):', day, error);
          }
        }
      });
    } else if (evento.preparationStartDate && evento.preparationEndDate) {
      // Fallback para estrutura antiga com suporte a turnos
      const startDate = new Date(evento.preparationStartDate);
      const endDate = new Date(evento.preparationEndDate);
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = formatEventDate(date.toISOString());
        // Avoid timezone issues
        const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Adicionar ambos os períodos (diurno e noturno) para cada data
        ['diurno', 'noturno'].forEach(period => {
          const periodTyped = period as 'diurno' | 'noturno';
          const periodLabel = periodTyped === 'diurno' ? 'Diurno' : 'Noturno';

          days.push({
            id: `${dateISO}-evento-${periodTyped}`,
            label: `${dateStr} (EVENTO - ${periodLabel})`,
            date: dateStr,
            type: 'evento',
            period: periodTyped
          });
        });
      }
    }

    // Adicionar dias de finalização com suporte a turnos
    const desmontagemData = ensureArray(evento.desmontagem);
    console.log('🔧 Processando desmontagem (modal edit):', desmontagemData);
    if (desmontagemData.length > 0) {
      desmontagemData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            const dateStr = formatEventDate(day.date);
            // Avoid timezone issues by handling date string directly
            const dateISO = day.date.includes('T') ? day.date.split('T')[0] : day.date.split(' ')[0];
            const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

            console.log(`✅ Adicionando desmontagem (modal edit): ${dateStr} - ${periodLabel}`);
            days.push({
              id: `${dateISO}-desmontagem-${day.period}`,
              label: `${dateStr} (DESMONTAGEM - ${periodLabel})`,
              date: dateStr,
              type: 'desmontagem',
              period: day.period
            });
          } catch (error) {
            console.error('❌ Erro ao processar data da desmontagem (modal edit):', day, error);
          }
        }
      });
    } else if (evento.finalizationStartDate && evento.finalizationEndDate) {
      // Fallback para estrutura antiga com suporte a turnos
      const startDate = new Date(evento.finalizationStartDate);
      const endDate = new Date(evento.finalizationEndDate);
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = formatEventDate(date.toISOString());
        // Avoid timezone issues
        const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Adicionar ambos os períodos (diurno e noturno) para cada data
        ['diurno', 'noturno'].forEach(period => {
          const periodTyped = period as 'diurno' | 'noturno';
          const periodLabel = periodTyped === 'diurno' ? 'Diurno' : 'Noturno';

          days.push({
            id: `${dateISO}-desmontagem-${periodTyped}`,
            label: `${dateStr} (DESMONTAGEM - ${periodLabel})`,
            date: dateStr,
            type: 'desmontagem',
            period: periodTyped
          });
        });
      }
    }

    console.log('🎯 Dias finais gerados (modal edit):', days);
    return days.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.type !== b.type) {
        const typeOrder: Record<string, number> = { montagem: 1, evento: 2, desmontagem: 3 };
        return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      }
      return (a.period === 'diurno' ? 0 : 1) - (b.period === 'diurno' ? 0 : 1);
    });
  }, [evento, ensureArray, formatEventDate]);

  const toggleShift = useCallback((shiftId: string) => {
    setStaffData(prev => {
      // If we're in filtering mode and trying to deselect the current shift, prevent it
      if (selectedDay && shiftId === selectedDay && prev.daysWork.includes(shiftId)) {
        // Show a warning but don't remove the shift
        console.warn('⚠️ Não é possível desmarcar o turno atual quando em modo de edição filtrada');
        return prev;
      }

      return {
        ...prev,
        daysWork: prev.daysWork.includes(shiftId)
          ? prev.daysWork.filter(d => d !== shiftId)
          : [...prev.daysWork, shiftId].sort()
      };
    });
  }, [selectedDay]);

  const handleSubmit = async () => {
    if (!participant) {
      toast.error("Nenhum participante selecionado para edição!");
      return;
    }

    const { name, cpf, rg, funcao, empresa, tipo_credencial } = staffData;

    if (!name.trim() || !funcao.trim() || !empresa.trim() || !tipo_credencial) {
      toast.error("Todos os campos obrigatórios devem ser preenchidos!");
      return;
    }

    // Validation: at least one document (CPF or RG) is recommended but not required
    const hasCpf = !!cpf && cpf.trim() !== "";
    const hasRg = !!rg && rg.trim() !== "";

    if (!hasCpf && !hasRg) {
      const confirmWithoutDoc = window.confirm(
        "Nenhum documento (CPF ou RG) foi informado. Deseja continuar mesmo assim?"
      );
      if (!confirmWithoutDoc) {
        return;
      }
    }

    if (activeCredentials.length === 0) {
      toast.error("Não há credenciais disponíveis para este evento!");
      return;
    }

    setLoading(true);
    try {
      // 1. Atualizar dados do participante (tabela event_participants)
      await updateParticipant.mutateAsync({
        id: participant.id,
        eventId,
        credentialId: tipo_credencial,
        name: name.toUpperCase(),
        cpf: hasCpf ? cpf : undefined,
        rg: hasRg ? rg : undefined,
        hasDocument: hasCpf || hasRg,
        role: funcao.toUpperCase(),
        company: empresa.toUpperCase(),
        validatedBy: "Sistema",
        daysWork: staffData.daysWork
      });

      // 2. Atualizar código da pulseira se fornecido
      if (wristbandCode.trim()) {
        try {
          await changeCredentialCode(eventId, participant.id, wristbandCode.trim());
        } catch (error) {
          console.error("⚠️ Erro ao salvar código da pulseira:", error);
          toast.warning("Participante atualizado, mas houve erro ao salvar a pulseira.");
        }
      }

      // 3. Atualizar dados de attendance se existir e tiver alterações (tabela event_attendance)
      if (attendanceData && attendanceData.id && (attendanceEditData.checkinDate || attendanceEditData.checkinTime || attendanceEditData.checkoutDate || attendanceEditData.checkoutTime)) {
        try {
          let checkInDateTime = null;
          let checkOutDateTime = null;

          // Processar check-in se ambos os campos estiverem preenchidos
          if (attendanceEditData.checkinDate && attendanceEditData.checkinTime) {
            checkInDateTime = new Date(`${attendanceEditData.checkinDate}T${attendanceEditData.checkinTime}:00`).toISOString();
          } else if (attendanceData.checkIn) {
            // Manter o valor original se não foi alterado
            checkInDateTime = attendanceData.checkIn;
          }

          // Processar check-out se ambos os campos estiverem preenchidos
          if (attendanceEditData.checkoutDate && attendanceEditData.checkoutTime) {
            checkOutDateTime = new Date(`${attendanceEditData.checkoutDate}T${attendanceEditData.checkoutTime}:00`).toISOString();
          } else if (attendanceData.checkOut) {
            // Manter o valor original se não foi alterado
            checkOutDateTime = attendanceData.checkOut;
          }

          await editAttendanceMutation.mutateAsync({
            attendanceId: attendanceData.id,
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime,
            notes: `Editado via modal de staff${wristbandCode.trim() ? ` - Pulseira: ${wristbandCode.trim()}` : ''}`,
            performedBy: 'Sistema-Edição-Staff',
            validatedBy: 'Sistema',
          });
        } catch (error) {
          console.error("⚠️ Erro ao atualizar dados de attendance:", error);
          toast.warning("Participante atualizado, mas houve erro ao salvar os dados de presença.");
        }
      }

      toast.success("Staff editado com sucesso!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao editar staff:", error);
      toast.error("Erro ao editar staff. Tente novamente.");
    }
    setLoading(false);
  };

  const handleClose = () => {
    setStaffData({
      name: "",
      cpf: "",
      rg: "",
      funcao: "",
      empresa: "",
      tipo_credencial: "",
      daysWork: []
    });
    setAttendanceEditData({
      checkinDate: "",
      checkinTime: "",
      checkoutDate: "",
      checkoutTime: ""
    });
    setAttendanceData(null);
    setWristbandCode("");
    setIsEmpresaPopoverOpen(false);
    setIsCredentialPopoverOpen(false);
    onClose();
  };

  const eventDays = getEventDays();
  const hasDefinedShifts = eventDays.length > 0;

  const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
    if (period === 'diurno') return <Sun className="h-3 w-3 text-yellow-500" />;
    if (period === 'noturno') return <Moon className="h-3 w-3 text-blue-500" />;
    if (period === 'dia_inteiro') return <Calendar className="h-3 w-3 text-purple-500" />;
    return null;
  }, []);

  // Função para formatar data para API
  const formatDateForAPI = useCallback((dateStr: string): string => {
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    if (/^\d{4}-\d{2}-\d{2}-.+-.+$/.test(dateStr)) {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${day}-${month}-${year}`;
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  }, []);

  // Hook para buscar dados de attendance
  const { data: attendanceList = [] } = useEventAttendanceByEventAndDate(
    eventId,
    selectedDay ? formatDateForAPI(selectedDay) : ""
  );

  // Função para buscar dados de attendance e pulseira do participante
  const fetchParticipantData = useCallback(async (participant: EventParticipant) => {
    if (!participant || !selectedDay) return;

    try {
      // Buscar dados de attendance
      const attendance = attendanceList.find(att => att.participantId === participant.id);
      setAttendanceData(attendance);

      // Buscar código da pulseira
      const movementCredential = await getMovementCredentialByParticipant(eventId, participant.id);
      if (movementCredential?.data?.code) {
        setWristbandCode(movementCredential.data.code);
      } else {
        setWristbandCode("");
      }

      // Atualizar campos de data/hora se existe attendance (tabela separada)
      if (attendance) {
        const newAttendanceData = {
          checkinDate: "",
          checkinTime: "",
          checkoutDate: "",
          checkoutTime: ""
        };

        if (attendance.checkIn) {
          const checkinDate = new Date(attendance.checkIn);
          newAttendanceData.checkinDate = checkinDate.toISOString().split('T')[0];
          newAttendanceData.checkinTime = checkinDate.toTimeString().split(' ')[0].slice(0, 5);
        }
        
        if (attendance.checkOut) {
          const checkoutDate = new Date(attendance.checkOut);
          newAttendanceData.checkoutDate = checkoutDate.toISOString().split('T')[0];
          newAttendanceData.checkoutTime = checkoutDate.toTimeString().split(' ')[0].slice(0, 5);
        }

        setAttendanceEditData(newAttendanceData);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do participante:", error);
    }
  }, [eventId, selectedDay, attendanceList]);

  // Inicializar o formulário com os dados do participante quando o modal abrir
  useEffect(() => {
    if (isOpen && participant) {
      console.log('🔧 Inicializando formulário de edição com participante:', participant);
      console.log('📅 Dias de trabalho do participante:', participant.daysWork);
      console.log('📅 Dia selecionado atual:', selectedDay);

      // Preencher dados do formulário
      let participantDaysWork = participant.daysWork || [];

      // If we have a selectedDay and it's not in the participant's days, add it
      // This ensures the current context shift is always selected
      if (selectedDay && !participantDaysWork.includes(selectedDay)) {
        participantDaysWork = [selectedDay, ...participantDaysWork];
        console.log('📅 Adicionado dia atual aos dias de trabalho:', selectedDay);
      }

      console.log('📅 Dias que serão pré-selecionados:', participantDaysWork);

      setStaffData({
        name: participant.name || "",
        cpf: participant.cpf || "",
        rg: (participant as any).rg || "",
        funcao: participant.role || "",
        empresa: participant.company || "",
        tipo_credencial: participant.credentialId || participant.wristbandId || "",
        daysWork: participantDaysWork
      });

      // Buscar dados de attendance e pulseira
      fetchParticipantData(participant);
    }
  }, [isOpen, participant, selectedDay, fetchParticipantData]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Staff
          </DialogTitle>
          <DialogDescription>
            {participant ? `Editando: ${participant.name}` : 'Edite os dados do Staff'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome completo *</label>
              <Input
                value={staffData.name}
                onChange={(e) => setStaffData({ ...staffData, name: applyUppercaseMask(e.target.value) })}
                placeholder="Digite o nome completo"
                disabled={loading}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CPF (opcional)</label>
              <Input
                value={staffData.cpf}
                onChange={(e) => setStaffData({ ...staffData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">RG (opcional)</label>
              <Input
                value={staffData.rg}
                onChange={(e) => setStaffData({ ...staffData, rg: e.target.value })}
                placeholder="Digite o RG"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Função *</label>
              <Input
                value={staffData.funcao}
                onChange={(e) => setStaffData({ ...staffData, funcao: applyUppercaseMask(e.target.value) })}
                placeholder="Digite a função"
                disabled={loading}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Empresa *</label>
                {currentShiftInfo && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    🏢 Filtrado para o turno atual
                  </span>
                )}
              </div>
              {empresasArray.length > 0 ? (
                <Popover open={isEmpresaPopoverOpen} onOpenChange={setIsEmpresaPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isEmpresaPopoverOpen}
                      className="w-full justify-between bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={loading}
                      style={{ textTransform: 'uppercase' }}
                    >
                      {staffData.empresa ? (
                        <span>{staffData.empresa}</span>
                      ) : (
                        <span className="text-gray-500">SELECIONE UMA EMPRESA</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-white" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar empresa..." className="h-9" />
                      <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {empresasArray.map((empresa) => (
                            <CommandItem
                              key={empresa.id}
                              value={empresa.nome}
                              onSelect={() => {
                                setStaffData({ ...staffData, empresa: applyUppercaseMask(empresa.nome) })
                                setIsEmpresaPopoverOpen(false)
                              }}
                              className="hover:bg-gray-100 hover:cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${staffData.empresa === empresa.nome.toUpperCase() ? 'opacity-100' : 'opacity-0'
                                  }`}
                              />
                              <span style={{ textTransform: 'uppercase' }}>{empresa.nome.toUpperCase()}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  value={staffData.empresa}
                  onChange={(e) => setStaffData({ ...staffData, empresa: applyUppercaseMask(e.target.value) })}
                  placeholder="Digite o nome da empresa"
                  disabled={loading}
                  style={{ textTransform: 'uppercase' }}
                />
              )}
            </div>
          </div>

          {/* Tipo de Credencial */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Tipo de Credencial *</label>
              {currentShiftInfo && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  🗑️ Filtrado para o turno atual
                </span>
              )}
            </div>
            {activeCredentials.length > 0 ? (
              <Popover open={isCredentialPopoverOpen} onOpenChange={setIsCredentialPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isCredentialPopoverOpen}
                    className="w-full justify-between bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {staffData.tipo_credencial ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-black"
                          style={{ backgroundColor: activeCredentials.find(c => c.id === staffData.tipo_credencial)?.cor }}
                        />
                        {activeCredentials.find(c => c.id === staffData.tipo_credencial)?.nome}
                      </div>
                    ) : (
                      <span className="text-gray-500">Selecione o tipo de credencial</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-white" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar credencial..." className="h-9" />
                    <CommandEmpty>Nenhuma credencial encontrada.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {/* Opção para remover credencial */}
                        <CommandItem
                          value="remover-credencial"
                          onSelect={() => {
                            setStaffData({ ...staffData, tipo_credencial: "" })
                            setIsCredentialPopoverOpen(false)
                          }}
                          className="hover:bg-gray-100 hover:cursor-pointer"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${!staffData.tipo_credencial ? 'opacity-100' : 'opacity-0'
                              }`}
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200" />
                            <span className="text-gray-600">SEM CREDENCIAL</span>
                          </div>
                        </CommandItem>
                        {activeCredentials.map((credential) => (
                          <CommandItem
                            key={credential.id}
                            value={credential.nome}
                            onSelect={() => {
                              setStaffData({ ...staffData, tipo_credencial: credential.id })
                              setIsCredentialPopoverOpen(false)
                            }}
                            className="hover:bg-gray-100 hover:cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${staffData.tipo_credencial === credential.id ? 'opacity-100' : 'opacity-0'
                                }`}
                            />
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full border-2 border-black"
                                style={{ backgroundColor: credential.cor }}
                              />
                              {credential.nome}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  Nenhuma credencial disponível. Crie credenciais primeiro.
                </p>
              </div>
            )}
          </div>

          {/* Check-in e Check-out - só aparecem se já tiver feito check-in */}
          {attendanceData && attendanceData.checkIn && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium mb-2">
                  📍 Dados de Presença - Turno Atual
                </p>
                <p className="text-xs text-green-600">
                  Este participante já fez check-in. Você pode editar os horários e pulseira abaixo.
                </p>
              </div>

              {/* Check-in */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Data Check-in</label>
                  <Input
                    type="date"
                    value={attendanceEditData.checkinDate}
                    onChange={(e) => setAttendanceEditData({ ...attendanceEditData, checkinDate: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hora Check-in</label>
                  <Input
                    type="time"
                    value={attendanceEditData.checkinTime}
                    onChange={(e) => setAttendanceEditData({ ...attendanceEditData, checkinTime: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Check-out - só aparece se já tiver feito check-out */}
              {attendanceData.checkOut && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Data Check-out</label>
                    <Input
                      type="date"
                      value={attendanceEditData.checkoutDate}
                      onChange={(e) => setAttendanceEditData({ ...attendanceEditData, checkoutDate: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hora Check-out</label>
                    <Input
                      type="time"
                      value={attendanceEditData.checkoutTime}
                      onChange={(e) => setAttendanceEditData({ ...attendanceEditData, checkoutTime: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Pulseira - só aparece se já tiver feito check-in */}
              <div>
                <label className="block text-sm font-medium mb-2">Código da Pulseira</label>
                <Input
                  value={wristbandCode}
                  onChange={(e) => setWristbandCode(e.target.value)}
                  placeholder="Digite o código da pulseira"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Dias de Trabalho */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Dias de Trabalho
            </label>

            {selectedDay && currentShiftInfo && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  🎯 Turno Atual do Participante:
                </p>
                <div className="flex items-center gap-2">
                  {getPeriodIcon(currentShiftInfo.period)}
                  <span className="text-sm text-blue-700">
                    {formatEventDate(currentShiftInfo.date)} -
                    {currentShiftInfo.stage.toUpperCase()} -
                    {currentShiftInfo.period === 'diurno' ? 'DIURNO' :
                      currentShiftInfo.period === 'noturno' ? 'NOTURNO' : 'DIA INTEIRO'}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  ⚠️ As credenciais e empresas foram filtradas para este turno específico.
                  Outros turnos estão desabilitados para manter a consistência.
                </p>
              </div>
            )}

            {hasDefinedShifts ? (
              <div className="space-y-4">
                {/* Agrupar turnos por estágio e depois por data */}
                {Object.entries(
                  eventDays.reduce((acc, shift) => {
                    if (!acc[shift.type]) acc[shift.type] = {};
                    if (!acc[shift.type][shift.date]) acc[shift.type][shift.date] = [];
                    acc[shift.type][shift.date].push(shift);
                    return acc;
                  }, {} as Record<string, Record<string, typeof eventDays>>)
                ).map(([stage, dateGroups]) => {
                  const stageLabel = stage === 'montagem' ? 'Montagem' :
                    stage === 'evento' ? 'Evento' :
                      stage === 'desmontagem' ? 'Desmontagem' : 'Finalização';

                  const isCurrentStage = selectedDay && currentShiftInfo &&
                    stage === currentShiftInfo.stage;

                  return (
                    <div key={stage} className={`border rounded-lg p-3 ${isCurrentStage
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                      }`}>
                      <h4 className="text-sm font-semibold mb-3 text-gray-700">{stageLabel}</h4>
                      {Object.entries(dateGroups).map(([date, shifts]) => {
                        return (
                          <div key={date} className="mb-3 last:mb-0">
                            <p className="text-xs font-medium mb-2 text-gray-600">{date}</p>
                            <div className="flex flex-wrap gap-2">
                              {shifts.map((shift) => (
                                <Button
                                  key={shift.id}
                                  type="button"
                                  variant={staffData.daysWork.includes(shift.id) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleShift(shift.id)}
                                  disabled={!!loading || (!!selectedDay && shift.id !== selectedDay)}
                                  className={`flex items-center gap-1 text-xs h-8 ${selectedDay && shift.id === selectedDay
                                    ? 'ring-2 ring-blue-500 bg-blue-50'
                                    : selectedDay && shift.id !== selectedDay
                                      ? 'opacity-50 cursor-not-allowed'
                                      : ''
                                    }`}
                                >
                                  {getPeriodIcon(shift.period)}
                                  <span>
                                    {shift.period === 'diurno' ? 'Diurno' : shift.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {staffData.daysWork.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Turnos selecionados:</strong> {staffData.daysWork.length}
                    </p>
                    <div className="mt-2 space-y-2">
                      {Object.entries(
                        staffData.daysWork.reduce((acc, shiftId) => {
                          const shift = eventDays.find(s => s.id === shiftId);
                          if (!shift) return acc;

                          const { dateFormatted } = parseShiftId(shiftId);
                          if (!acc[dateFormatted]) acc[dateFormatted] = [];
                          acc[dateFormatted].push(shift);
                          return acc;
                        }, {} as Record<string, any[]>)
                      ).map(([date, shifts]) => (
                        <div key={date} className="bg-blue-50 border border-blue-200 rounded p-2">
                          <p className="text-xs font-medium text-blue-800 mb-1">{date}</p>
                          <div className="flex flex-wrap gap-1">
                            {shifts.map((shift) => (
                              <span key={shift.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs">
                                {getPeriodIcon(shift.period)}
                                {shift.type === 'montagem' ? 'Mont' :
                                  shift.type === 'evento' ? 'Evt' :
                                    shift.type === 'desmontagem' ? 'Desm' : 'Fin'} -
                                {shift.period === 'diurno' ? 'Dia' : shift.period === 'noturno' ? 'Noite' : 'Inteiro'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Input
                value={staffData.daysWork.map(shiftId => parseShiftId(shiftId).dateFormatted).join(', ')}
                onChange={(e) => {
                  const dates = e.target.value.split(',').map(d => d.trim()).filter(d => d);
                  setStaffData({
                    ...staffData,
                    daysWork: dates
                  });
                }}
                placeholder="Datas de trabalho (DD/MM/AAAA, separadas por vírgula)"
                disabled={loading}
              />
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}