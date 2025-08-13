/* eslint-disable @typescript-eslint/prefer-as-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Loader2, Search, X, Sun, Moon } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { createEventParticipant } from "@/features/eventos/actions/create-event-participant"
import { useCredentials } from "@/features/eventos/api/query";
import { useEmpresasByEvent } from "@/features/eventos/api/query/use-empresas";
import { Credential } from "@/features/eventos/types";

interface ModalAdicionarStaffProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  selectedDay?: string;
  onSuccess?: () => void;
  evento?: any;
}

const initialStaff = {
  name: "",
  cpf: "",
  funcao: "",
  empresa: "",
  tipo_credencial: "",
  daysWork: [] as string[]
};

export default function ModalAdicionarStaff({ isOpen, onClose, eventId, selectedDay, onSuccess, evento }: ModalAdicionarStaffProps) {
  const [loading, setLoading] = useState(false);
  const [novoStaff, setNovoStaff] = useState(initialStaff);
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [isEmpresaSelectOpen, setIsEmpresaSelectOpen] = useState(false);

  const { data: credentials = [] } = useCredentials({ eventId });
  const { data: empresas = [] } = useEmpresasByEvent(eventId);

  const formatCPF = (cpf: string): string => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return cpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

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
        period: 'diurno' as 'diurno'
      };
    } catch (error) {
      // Se não conseguir fazer parse da data, retornar valor padrão
      return {
        dateISO: shiftId,
        dateFormatted: shiftId,
        stage: 'unknown',
        period: 'diurno' as 'diurno'
      };
    }
  }, []);

  const formatEventDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const activeCredentials = credentials.filter((credential: Credential) => credential.isActive !== false);
  const empresasArray = Array.isArray(empresas) ? empresas : [];

  // Filtrar empresas baseado na busca
  const filteredEmpresas = useMemo(() => {
    if (!empresaSearch.trim()) return empresasArray;
    return empresasArray.filter(empresa =>
      empresa.nome.toLowerCase().includes(empresaSearch.toLowerCase())
    );
  }, [empresasArray, empresaSearch]);

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

  // Nova função para obter turnos do evento baseada no sistema de shifts (igual à página principal)
  const getEventDays = useCallback(() => {
    if (!evento) return [];

    console.log('🔧 getEventDays (modal) chamada, evento:', evento);

    const days: Array<{
      id: string;
      label: string;
      date: string;
      type: string;
      period?: 'diurno' | 'noturno';
    }> = [];

    // Usar a nova estrutura SimpleEventDay se disponível com suporte a turnos
    const montagemData = ensureArray(evento.montagem);
    console.log('🔧 Processando montagem (modal):', montagemData);
    if (montagemData.length > 0) {
      montagemData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            const dateStr = formatEventDate(day.date);
            const dateISO = new Date(day.date).toISOString().split('T')[0];
            const periodLabel = day.period === 'diurno' ? 'Diurno' : 'Noturno';

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
    console.log('🔧 Processando evento (modal):', eventoData);
    if (eventoData.length > 0) {
      eventoData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            const dateStr = formatEventDate(day.date);
            const dateISO = new Date(day.date).toISOString().split('T')[0];
            const periodLabel = day.period === 'diurno' ? 'Diurno' : 'Noturno';

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
    console.log('🔧 Processando desmontagem (modal):', desmontagemData);
    if (desmontagemData.length > 0) {
      desmontagemData.forEach(day => {
        if (day && day.date && day.period) {
          try {
            const dateStr = formatEventDate(day.date);
            const dateISO = new Date(day.date).toISOString().split('T')[0];
            const periodLabel = day.period === 'diurno' ? 'Diurno' : 'Noturno';

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

    console.log('🎯 Dias finais gerados (modal):', days);
    return days.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.type !== b.type) {
        const typeOrder: Record<string, number> = { montagem: 1, evento: 2, desmontagem: 3 };
        return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      }
      return (a.period === 'diurno' ? 0 : 1) - (b.period === 'diurno' ? 0 : 1);
    });
  }, [evento, ensureArray]);

  const toggleShift = useCallback((shiftId: string) => {
    setNovoStaff(prev => ({
      ...prev,
      daysWork: prev.daysWork.includes(shiftId)
        ? prev.daysWork.filter(d => d !== shiftId)
        : [...prev.daysWork, shiftId].sort()
    }));
  }, []);

  const handleSubmit = async () => {
    const { name, cpf, funcao, empresa, tipo_credencial } = novoStaff;

    if (!name.trim() || !cpf.trim() || !funcao.trim() || !empresa.trim() || !tipo_credencial) {
      toast.error("Todos os campos obrigatórios devem ser preenchidos!");
      return;
    }

    if (activeCredentials.length === 0) {
      toast.error("Não há credenciais disponíveis para este evento!");
      return;
    }

    setLoading(true);
    try {
      await createEventParticipant({
        eventId,
        credentialId: tipo_credencial,
        name: name.toUpperCase(),
        cpf,
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
    setEmpresaSearch("");
    setIsEmpresaSelectOpen(false);
    onClose();
  };

  const eventDays = getEventDays();
  const hasDefinedShifts = eventDays.length > 0;

  const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno') => {
    if (period === 'diurno') return <Sun className="h-3 w-3 text-yellow-500" />;
    if (period === 'noturno') return <Moon className="h-3 w-3 text-blue-500" />;
    return null;
  }, []);

  // Automaticamente selecionar o dia quando o modal abrir
  useEffect(() => {
    if (isOpen && selectedDay) {
      // Verificar se o shift ID selecionado existe nos turnos do evento
      const selectedShiftExists = eventDays.some(shift => shift.id === selectedDay);

      if (selectedShiftExists && !novoStaff.daysWork.includes(selectedDay)) {
        setNovoStaff(prev => ({
          ...prev,
          daysWork: [selectedDay]
        }));
      }
    }
  }, [isOpen, selectedDay, eventDays, novoStaff.daysWork]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Novo Staff
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do novo Staff
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome completo *</label>
              <Input
                value={novoStaff.name}
                onChange={(e) => setNovoStaff({ ...novoStaff, name: e.target.value.toUpperCase() })}
                placeholder="Digite o nome completo"
                disabled={loading}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CPF *</label>
              <Input
                value={novoStaff.cpf}
                onChange={(e) => setNovoStaff({ ...novoStaff, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Função *</label>
              <Input
                value={novoStaff.funcao}
                onChange={(e) => setNovoStaff({ ...novoStaff, funcao: e.target.value.toUpperCase() })}
                placeholder="Digite a função"
                disabled={loading}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Empresa *</label>
              {empresasArray.length > 0 ? (
                <div className="relative">
                  <Select
                    value={novoStaff.empresa}
                    onValueChange={(value) => {
                      setNovoStaff({ ...novoStaff, empresa: value.toUpperCase() });
                      setEmpresaSearch("");
                      setIsEmpresaSelectOpen(false);
                    }}
                    disabled={loading}
                    open={isEmpresaSelectOpen}
                    onOpenChange={setIsEmpresaSelectOpen}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] bg-white border-none">
                      {/* Campo de pesquisa */}
                      <div className="sticky top-0 z-10  border-none p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Pesquisar empresa..."
                            value={empresaSearch}
                            onChange={(e) => setEmpresaSearch(e.target.value.toUpperCase())}
                            className="pl-8 h-8"
                            onClick={(e) => e.stopPropagation()}
                            style={{ textTransform: 'uppercase' }}
                          />
                          {empresaSearch && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmpresaSearch("");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Lista de empresas filtradas */}
                      <div className="max-h-[150px] overflow-y-auto">
                        {filteredEmpresas.length > 0 ? (
                          filteredEmpresas.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.nome.toUpperCase()}>
                              {empresa.nome.toUpperCase()}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            Nenhuma empresa encontrada
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input
                  value={novoStaff.empresa}
                  onChange={(e) => setNovoStaff({ ...novoStaff, empresa: e.target.value.toUpperCase() })}
                  placeholder="Digite o nome da empresa"
                  disabled={loading}
                  style={{ textTransform: 'uppercase' }}
                />
              )}
            </div>
          </div>

          {/* Tipo de Credencial */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Credencial *</label>
            {activeCredentials.length > 0 ? (
              <Select
                value={novoStaff.tipo_credencial}
                onValueChange={(value) => setNovoStaff({ ...novoStaff, tipo_credencial: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de credencial" />
                </SelectTrigger>
                <SelectContent className="border-none">
                  {activeCredentials.map((credential) => (
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
                                    {shift.period === 'diurno' ? 'Diurno' : 'Noturno'}
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
                      {selectedDay && novoStaff.daysWork.includes(selectedDay) && (
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
                                {shift.period === 'diurno' ? 'Dia' : 'Noite'}
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
