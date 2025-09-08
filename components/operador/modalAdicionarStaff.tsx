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
import { Calendar, Plus, Loader2, Search, X, Sun, Moon, Clock, ChevronDown, Check } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { createEventParticipant } from "@/features/eventos/actions/create-event-participant"
import { useCredentials } from "@/features/eventos/api/query";
import { useEmpresasByEvent } from "@/features/eventos/api/query/use-empresas";
import { useCredentialsByShift } from "@/features/eventos/api/query/use-credentials-by-shift";
import { useEmpresasByShift } from "@/features/eventos/api/query/use-empresas-by-shift";
import { Credential } from "@/features/eventos/types";

interface ModalAdicionarStaffProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  selectedDay?: string;
  onSuccess?: () => void;
  evento?: any;
  operadorInfo?: {
    nome: string;
    cpf: string;
    id?: string;
    id_events?: string;
  } | null;
  existingParticipants?: Array<{
    id: string;
    name: string;
    cpf: string;
    role?: string;
    company?: string;
  }>;
}

const initialStaff = {
  name: "",
  cpf: "",
  rg: "",
  funcao: "",
  empresa: "",
  tipo_credencial: "",
  daysWork: [] as string[]
};

export default function ModalAdicionarStaff({ isOpen, onClose, eventId, selectedDay, onSuccess, evento, operadorInfo, existingParticipants = [] }: ModalAdicionarStaffProps) {
  const [loading, setLoading] = useState(false);
  const [novoStaff, setNovoStaff] = useState(initialStaff);
  const [isEmpresaPopoverOpen, setIsEmpresaPopoverOpen] = useState(false);
  const [isCredentialPopoverOpen, setIsCredentialPopoverOpen] = useState(false);
  const [internalSelectedDay, setInternalSelectedDay] = useState<string>('');
  const [isDaySelectionOpen, setIsDaySelectionOpen] = useState(false);
  
  // Use selectedDay prop if provided, otherwise use internal state
  const effectiveSelectedDay = selectedDay || internalSelectedDay;

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

  const currentShiftInfo = parseSelectedDay(effectiveSelectedDay || '');
  
  // Use filtered hooks when we have shift info, fallback to all items
  const { data: allCredentials = [] } = useCredentials({ eventId });
  const { data: allEmpresas = [] } = useEmpresasByEvent(eventId);
  
  const { data: shiftCredentials = [] } = useCredentialsByShift({
    eventId,
    shiftId: effectiveSelectedDay,
    workDate: currentShiftInfo?.date,
    workStage: currentShiftInfo?.stage,
    workPeriod: currentShiftInfo?.period,
    enabled: !!currentShiftInfo
  });
  
  const { data: shiftEmpresas = [] } = useEmpresasByShift({
    eventId,
    shiftId: effectiveSelectedDay,
    workDate: currentShiftInfo?.date,
    workStage: currentShiftInfo?.stage,
    workPeriod: currentShiftInfo?.period,
    enabled: !!currentShiftInfo
  });
  
  // Use filtered data when available, otherwise fall back to all data
  const credentials = currentShiftInfo && shiftCredentials.length > 0 ? shiftCredentials : allCredentials;
  const empresas = currentShiftInfo && shiftEmpresas.length > 0 ? shiftEmpresas : allEmpresas;

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
      const period = parts[4] as 'diurno' | 'noturno' | 'dia_inteiro';

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

  const getDateRange = useCallback((startDate?: string, endDate?: string): string[] => {
    if (!startDate || !endDate) return [];

    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toLocaleDateString('pt-BR'));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, []);

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

  // Função para obter ícone do período
  const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
    if (period === 'diurno') {
      return <Sun className="h-3 w-3 text-yellow-500" />;
    } else if (period === 'noturno') {
      return <Moon className="h-3 w-3 text-blue-500" />;
    } else if (period === 'dia_inteiro') {
      return <Clock className="h-3 w-3 text-purple-500" />;
    }
    return null;
  }, []);

  // Nova função para obter turnos do evento filtrada pelos dias do operador
  const getEventDays = useCallback(() => {
    if (!evento) return [];

    console.log('🔧 getEventDays (modal) chamada, evento:', evento);
    console.log('🔍 Operador info (modal):', operadorInfo);

    const days: Array<{
      id: string;
      label: string;
      date: string;
      type: string;
      period?: 'diurno' | 'noturno' | 'dia_inteiro';
    }> = [];

    // Usar a nova estrutura SimpleEventDay se disponível com suporte a turnos
    const montagemData = ensureArray(evento.montagem);
    console.log('🔧 Processando montagem (modal):', montagemData);
    if (montagemData.length > 0) {
      montagemData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            // Usar a data ISO diretamente para evitar problemas de timezone
            const dateISO = day.date; // Já está no formato YYYY-MM-DD
            const [year, month, day_num] = day.date.split('-');
            const dateStr = `${day_num}/${month}/${year}`;
            const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

            console.log(`✅ Adicionando montagem (modal): ${dateStr} - ${periodLabel}`);
            days.push({
              id: `${dateISO}-montagem-${day.period}`,
              label: `${dateStr} (MONTAGEM - ${periodLabel})`,
              date: dateStr,
              type: 'montagem',
              period: day.period
            });
          } catch (error) {
            console.error('❌ Erro ao processar data da montagem (modal):', day, error);
          }
        }
      });
    } else if (evento.setupStartDate && evento.setupEndDate) {
      // Fallback para estrutura antiga com suporte a turnos
      const startDate = new Date(evento.setupStartDate);
      const endDate = new Date(evento.setupEndDate);
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = formatEventDate(date.toISOString());
        const dateISO = date.toISOString().split('T')[0];

        // Adicionar ambos os períodos (diurno e noturno) para cada data
        ['diurno', 'noturno'].forEach(period => {
          const periodTyped = period as 'diurno' | 'noturno' | 'dia_inteiro';
          const periodLabel = periodTyped === 'diurno' ? 'Diurno' : periodTyped === 'noturno' ? 'Noturno' : 'Dia Inteiro';

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
    console.log('🔧 Processando evento (modal):', eventoData);
    if (eventoData.length > 0) {
      eventoData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            // Usar a data ISO diretamente para evitar problemas de timezone
            const dateISO = day.date; // Já está no formato YYYY-MM-DD
            const [year, month, day_num] = day.date.split('-');
            const dateStr = `${day_num}/${month}/${year}`;
            const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

            console.log(`✅ Adicionando evento (modal): ${dateStr} - ${periodLabel}`);
            days.push({
              id: `${dateISO}-evento-${day.period}`,
              label: `${dateStr} (EVENTO - ${periodLabel})`,
              date: dateStr,
              type: 'evento',
              period: day.period
            });
          } catch (error) {
            console.error('❌ Erro ao processar data do evento (modal):', day, error);
          }
        }
      });
    } else if (evento.preparationStartDate && evento.preparationEndDate) {
      // Fallback para estrutura antiga com suporte a turnos
      const startDate = new Date(evento.preparationStartDate);
      const endDate = new Date(evento.preparationEndDate);
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = formatEventDate(date.toISOString());
        const dateISO = date.toISOString().split('T')[0];

        // Adicionar ambos os períodos (diurno e noturno) para cada data
        ['diurno', 'noturno'].forEach(period => {
          const periodTyped = period as 'diurno' | 'noturno' | 'dia_inteiro';
          const periodLabel = periodTyped === 'diurno' ? 'Diurno' : periodTyped === 'noturno' ? 'Noturno' : 'Dia Inteiro';

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
    console.log('🔧 Processando desmontagem (modal):', desmontagemData);
    if (desmontagemData.length > 0) {
      desmontagemData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            // Usar a data ISO diretamente para evitar problemas de timezone
            const dateISO = day.date; // Já está no formato YYYY-MM-DD
            const [year, month, day_num] = day.date.split('-');
            const dateStr = `${day_num}/${month}/${year}`;
            const periodLabel = day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro';

            console.log(`✅ Adicionando desmontagem (modal): ${dateStr} - ${periodLabel}`);
            days.push({
              id: `${dateISO}-desmontagem-${day.period}`,
              label: `${dateStr} (DESMONTAGEM - ${periodLabel})`,
              date: dateStr,
              type: 'desmontagem',
              period: day.period
            });
          } catch (error) {
            console.error('❌ Erro ao processar data da desmontagem (modal):', day, error);
          }
        }
      });
    } else if (evento.finalizationStartDate && evento.finalizationEndDate) {
      // Fallback para estrutura antiga com suporte a turnos
      const startDate = new Date(evento.finalizationStartDate);
      const endDate = new Date(evento.finalizationEndDate);
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = formatEventDate(date.toISOString());
        const dateISO = date.toISOString().split('T')[0];

        // Adicionar ambos os períodos (diurno e noturno) para cada data
        ['diurno', 'noturno'].forEach(period => {
          const periodTyped = period as 'diurno' | 'noturno' | 'dia_inteiro';
          const periodLabel = periodTyped === 'diurno' ? 'Diurno' : periodTyped === 'noturno' ? 'Noturno' : 'Dia Inteiro';

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

    console.log('🎯 Dias totais gerados (modal):', days);

    // Filtrar apenas pelos dias atribuídos ao operador
    if (!operadorInfo?.id || !operadorInfo?.id_events) {
      console.log('🔍 Operador sem ID ou sem shifts atribuídos, mostrando todos os dias (modal)');
      const sortedDays = days.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.type !== b.type) {
          const typeOrder: Record<string, number> = { montagem: 1, evento: 2, desmontagem: 3 };
          return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
        }
        const periodOrder = { diurno: 0, noturno: 1, dia_inteiro: 2 };
        const aPeriodOrder = periodOrder[a.period as keyof typeof periodOrder] ?? 999;
        const bPeriodOrder = periodOrder[b.period as keyof typeof periodOrder] ?? 999;
        return aPeriodOrder - bPeriodOrder;
      });
      console.log('🎯 Dias finais disponíveis (modal):', sortedDays);
      return sortedDays;
    }

    console.log('🔍 Operador shifts (modal):', operadorInfo.id_events);

    // Dividir os shifts do operador por vírgula e processar cada shift
    const operatorShifts = operadorInfo.id_events
      .split(',')
      .map(shift => shift.trim())
      .filter(shift => shift.includes(eventId)) // Filtrar apenas shifts deste evento
      .map(shift => {
        // Extrair a parte do shift após o eventId (remover o prefixo "eventId:")
        if (shift.includes(':')) {
          return shift.split(':')[1]; // Pega a parte após os dois pontos
        }
        return shift;
      });

    console.log('🔍 Shifts do operador para este evento (modal):', operatorShifts);

    // Filtrar apenas os dias em que o operador trabalha
    const diasDisponiveis = days.filter(day => {
      const dayIncluded = operatorShifts.includes(day.id);
      if (dayIncluded) {
        console.log('✅ Dia incluído (modal):', day.id, day.label);
      } else {
        console.log('❌ Dia excluído (modal):', day.id, day.label);
        console.log('🔍 Comparando:', day.id, 'com shifts:', operatorShifts);
      }
      return dayIncluded;
    });

    const sortedFilteredDays = diasDisponiveis.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.type !== b.type) {
        const typeOrder: Record<string, number> = { montagem: 1, evento: 2, desmontagem: 3 };
        return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      }
      const periodOrder = { diurno: 0, noturno: 1, dia_inteiro: 2 };
      const aPeriodOrder = periodOrder[a.period as keyof typeof periodOrder] ?? 999;
      const bPeriodOrder = periodOrder[b.period as keyof typeof periodOrder] ?? 999;
      return aPeriodOrder - bPeriodOrder;
    });

    console.log('🎯 Dias finais disponíveis para o operador (modal):', sortedFilteredDays);
    return sortedFilteredDays;
  }, [evento, ensureArray, formatEventDate, operadorInfo, eventId]);

  const toggleShift = useCallback((shiftId: string) => {
    setNovoStaff(prev => ({
      ...prev,
      daysWork: prev.daysWork.includes(shiftId)
        ? prev.daysWork.filter(d => d !== shiftId)
        : [...prev.daysWork, shiftId].sort()
    }));
  }, []);

  const handleSubmit = async () => {
    const { name, cpf, rg, funcao, empresa, tipo_credencial } = novoStaff;

    if (!effectiveSelectedDay) {
      toast.error("Por favor, selecione um turno de trabalho primeiro!");
      return;
    }

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

    // Validação de documento duplicado (CPF ou RG)
    let documentoExistente = false;
    let tipoDocumento = "";

    if (hasCpf) {
      const cpfLimpo = cpf.trim().replace(/\D/g, '');
      documentoExistente = existingParticipants.some(
        participant => participant.cpf && participant.cpf.trim().replace(/\D/g, '') === cpfLimpo
      );
      tipoDocumento = "CPF";
    }

    if (!documentoExistente && hasRg) {
      const rgLimpo = rg.trim().replace(/\D/g, '');
      documentoExistente = existingParticipants.some(
        participant => (participant as any).rg && (participant as any).rg.trim().replace(/\D/g, '') === rgLimpo
      );
      tipoDocumento = "RG";
    }

    if (documentoExistente) {
      toast.error(`Já existe um staff cadastrado com este ${tipoDocumento}!`);
      return;
    }

    setLoading(true);
    try {
      await createEventParticipant({
        eventId,
        credentialId: tipo_credencial,
        name: name.toUpperCase(),
        cpf: hasCpf ? cpf : undefined,
        rg: hasRg ? rg : undefined,
        hasDocument: hasCpf || hasRg, // Set hasDocument based on document presence
        role: funcao.toUpperCase(),
        company: empresa.toUpperCase(),
        validatedBy: "Sistema",
        daysWork: novoStaff.daysWork,
      });

      toast.success("Staff adicionado com sucesso!");
      setNovoStaff(initialStaff);
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error("Erro ao adicionar staff. Tente novamente.");
    }
    setLoading(false);
  };

  const handleClose = () => {
    setNovoStaff(initialStaff);
    setIsEmpresaPopoverOpen(false);
    setIsCredentialPopoverOpen(false);
    setInternalSelectedDay('');
    setIsDaySelectionOpen(false);
    onClose();
  };

  const eventDays = getEventDays();
  const hasDefinedShifts = eventDays.length > 0;

  // Automaticamente selecionar o dia quando o modal abrir
  useEffect(() => {
    if (isOpen && effectiveSelectedDay) {
      // Verificar se o shift ID selecionado existe nos turnos do evento
      const selectedShiftExists = eventDays.some(shift => shift.id === effectiveSelectedDay);

      if (selectedShiftExists && !novoStaff.daysWork.includes(effectiveSelectedDay)) {
        setNovoStaff(prev => ({
          ...prev,
          daysWork: [effectiveSelectedDay]
        }));
      }
    }
  }, [isOpen, effectiveSelectedDay, eventDays, novoStaff.daysWork]);
  
  // Reset internal state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInternalSelectedDay('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Novo Staff
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div>Preencha os dados do novo Staff</div>
            {effectiveSelectedDay && (
              <div className="flex items-center gap-2 text-sm font-medium text-purple-600 bg-purple-50 p-2 rounded-lg">
                {(() => {
                  const currentDay = eventDays.find(day => day.id === effectiveSelectedDay);
                  if (currentDay) {
                    return (
                      <>
                        {getPeriodIcon(currentDay.period)}
                        <span>Dia atual de trabalho: {currentDay.label}</span>
                      </>
                    );
                  }
                  return <span>Dia selecionado: {effectiveSelectedDay}</span>;
                })()}
              </div>
            )}
            {operadorInfo?.nome && (
              <div className="text-sm text-gray-600">
                <strong>Operador:</strong> {operadorInfo.nome} ({operadorInfo.cpf})
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Turno (quando não pré-selecionado) */}
          {!selectedDay && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-yellow-600" />
                <h3 className="text-sm font-semibold text-yellow-800">
                  📅 Primeiro, selecione o turno de trabalho:
                </h3>
              </div>
              
              <div className="mb-4">
                <Popover open={isDaySelectionOpen} onOpenChange={setIsDaySelectionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isDaySelectionOpen}
                      className="w-full justify-between bg-white border-yellow-300"
                      disabled={loading}
                    >
                      {internalSelectedDay ? (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const selectedShift = eventDays.find(d => d.id === internalSelectedDay);
                            if (selectedShift) {
                              return (
                                <>
                                  {getPeriodIcon(selectedShift.period)}
                                  <span>{selectedShift.label}</span>
                                </>
                              );
                            }
                            return <span>{internalSelectedDay}</span>;
                          })()} 
                        </div>
                      ) : (
                        <span className="text-gray-500">Selecionar turno de trabalho</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full max-w-md p-0 bg-white" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar turno..." />
                      <CommandEmpty>Nenhum turno encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {eventDays.map((day) => (
                            <CommandItem
                              key={day.id}
                              value={day.id}
                              onSelect={(value) => {
                                setInternalSelectedDay(value)
                                setIsDaySelectionOpen(false)
                                // Auto-select this shift in work days
                                setNovoStaff(prev => ({
                                  ...prev,
                                  daysWork: [value]
                                }))
                              }}
                              className="hover:bg-gray-100"
                            >
                              <div className="flex items-center gap-2 w-full">
                                {getPeriodIcon(day.period)}
                                <span className="flex-1">{day.label}</span>
                                {internalSelectedDay === day.id && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <p className="text-xs text-yellow-700">
                ⚠️ Selecione o turno para filtrar as empresas e credenciais disponíveis.
              </p>
            </div>
          )}
          
          {/* Informação do turno atual */}
          {effectiveSelectedDay && currentShiftInfo && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {getPeriodIcon(currentShiftInfo.period)}
                <h3 className="text-sm font-semibold text-blue-800">
                  🎯 Adicionando Staff para o Turno:
                </h3>
              </div>
              <div className="text-sm text-blue-700">
                <span className="font-medium">
                  {(() => {
                    const [year, month, day] = currentShiftInfo.date.split('-');
                    return `${day}/${month}/${year}`;
                  })()} - 
                  {currentShiftInfo.stage.toUpperCase()} - 
                  {currentShiftInfo.period === 'diurno' ? 'DIURNO' : 
                   currentShiftInfo.period === 'noturno' ? 'NOTURNO' : 'DIA INTEIRO'}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                ⚠️ As credenciais e empresas foram filtradas para este turno específico.
                O staff será automaticamente atribuído a este turno.
              </p>
            </div>
          )}
          
          {/* Campos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome completo *</label>
              <Input
                value={novoStaff.name}
                onChange={(e) => setNovoStaff({ ...novoStaff, name: applyUppercaseMask(e.target.value) })}
                placeholder="Digite o nome completo"
                disabled={loading}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CPF (opcional)</label>
              <Input
                value={novoStaff.cpf}
                onChange={(e) => setNovoStaff({ ...novoStaff, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">RG (opcional)</label>
              <Input
                value={novoStaff.rg}
                onChange={(e) => setNovoStaff({ ...novoStaff, rg: e.target.value })}
                placeholder="Digite o RG"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Função *</label>
              <Input
                value={novoStaff.funcao}
                onChange={(e) => setNovoStaff({ ...novoStaff, funcao: applyUppercaseMask(e.target.value) })}
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
                      {novoStaff.empresa ? (
                        <span>{novoStaff.empresa}</span>
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
                                setNovoStaff({ ...novoStaff, empresa: applyUppercaseMask(empresa.nome) })
                                setIsEmpresaPopoverOpen(false)
                              }}
                              className="hover:bg-gray-100 hover:cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${novoStaff.empresa === empresa.nome.toUpperCase() ? 'opacity-100' : 'opacity-0'
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
                  value={novoStaff.empresa}
                  onChange={(e) => setNovoStaff({ ...novoStaff, empresa: applyUppercaseMask(e.target.value) })}
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
                    {novoStaff.tipo_credencial ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-black"
                          style={{ backgroundColor: activeCredentials.find(c => c.id === novoStaff.tipo_credencial)?.cor }}
                        />
                        {activeCredentials.find(c => c.id === novoStaff.tipo_credencial)?.nome}
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
                        {activeCredentials.map((credential) => (
                          <CommandItem
                            key={credential.id}
                            value={credential.nome}
                            onSelect={() => {
                              setNovoStaff({ ...novoStaff, tipo_credencial: credential.id })
                              setIsCredentialPopoverOpen(false)
                            }}
                            className="hover:bg-gray-100 hover:cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${novoStaff.tipo_credencial === credential.id ? 'opacity-100' : 'opacity-0'
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

          {/* Dias de Trabalho */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Dias de Trabalho
            </label>

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

                  return (
                    <div key={stage} className="border border-gray-200 rounded-lg p-3">
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
                                  variant={novoStaff.daysWork.includes(shift.id) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleShift(shift.id)}
                                  disabled={loading}
                                  className="flex items-center gap-1 text-xs h-8"
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

                {novoStaff.daysWork.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Turnos selecionados:</strong> {novoStaff.daysWork.length}
                      {effectiveSelectedDay && novoStaff.daysWork.includes(effectiveSelectedDay) && (
                        <span className="ml-2 text-green-600 font-medium">
                          (Turno atual selecionado automaticamente)
                        </span>
                      )}
                    </p>
                    <div className="mt-2 space-y-2">
                      {Object.entries(
                        novoStaff.daysWork.reduce((acc, shiftId) => {
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
                                {shift.period === 'diurno' ? 'Dia' : shift.period === 'noturno' ? 'Noite' : 'DI'}
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
                value={novoStaff.daysWork.map(shiftId => parseShiftId(shiftId).dateFormatted).join(', ')}
                onChange={(e) => {
                  const dates = e.target.value.split(',').map(d => d.trim()).filter(d => d);
                  setNovoStaff({
                    ...novoStaff,
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
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Staff
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
