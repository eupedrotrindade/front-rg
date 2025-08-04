import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { createEventParticipant } from "@/features/eventos/actions/create-event-participant";
import { useEventWristbandsByEvent } from "@/features/eventos/api/query/use-event-wristbands";
import { useEventWristbandModels } from "@/features/eventos/api/query/use-event-wristband-models";

interface ModalAdicionarStaffProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: () => void;
  evento?: any; // Adicionar evento para obter datas reais
}

export default function ModalAdicionarStaff({ isOpen, onClose, eventId, onSuccess, evento }: ModalAdicionarStaffProps) {
  const [loading, setLoading] = useState(false);
  const [novoStaff, setNovoStaff] = useState({
    name: "",
    cpf: "",
    funcao: "",
    empresa: "",
    tipo_credencial: "",
    cadastrado_por: "",
    daysWork: [] as string[]
  });

  // Hooks para dados
  const { data: wristbands = [] } = useEventWristbandsByEvent(eventId);
  const { data: wristbandModels = [] } = useEventWristbandModels();

  // Criar mapa de modelos de pulseira
  const wristbandModelMap = wristbandModels.reduce((map: any, model: any) => {
    map[model.id] = model;
    return map;
  }, {});

  // Função para formatar CPF
  const formatCPF = (cpf: string): string => {
    if (!cpf) return "";
    const trimmedCpf = cpf.trim();
    if (!trimmedCpf) return "";
    const digits = trimmedCpf.replace(/\D/g, "");
    if (digits.length !== 11) return trimmedCpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Função utilitária para capitalizar cada palavra
  const capitalizeWords = (str: string): string =>
    str.replace(/(\b\w)/g, (char) => char);

  // Função para obter tipos de credencial únicos
  const tiposCredencialUnicosFiltrados = Array.from(new Set(wristbands.map(w => w.id))).filter(
    (tipo): tipo is string => typeof tipo === "string" && !!tipo && tipo.trim() !== ""
  );

  // Função para validar e processar dias de trabalho
  const validateAndProcessDaysWork = useCallback((inputValue: string): string[] => {
    const days = inputValue.split(',').map(day => day.trim()).filter(day => day);
    const validDays: string[] = [];

    days.forEach(day => {
      let formattedDate: string;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(day)) {
        formattedDate = day;
      } else {
        const date = new Date(day);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString('pt-BR');
        } else {
          formattedDate = day;
        }
      }
      validDays.push(formattedDate);
    });

    return validDays;
  }, []);

  // Função para alternar seleção de data
  const toggleDateSelection = useCallback((date: string) => {
    setNovoStaff(prev => {
      const currentDates = [...prev.daysWork];
      const dateIndex = currentDates.indexOf(date);
      if (dateIndex > -1) {
        currentDates.splice(dateIndex, 1);
      } else {
        currentDates.push(date);
      }
      return { ...prev, daysWork: currentDates.sort() };
    });
  }, []);

  // Função para obter datas disponíveis baseadas no evento
  const getAvailableDates = useCallback((phase?: string): string[] => {
    if (!evento) return [];

    const availableDates: string[] = [];

    if (phase) {
      let startDate: string | undefined;
      let endDate: string | undefined;

      switch (phase) {
        case "preparacao":
          startDate = evento.preparationStartDate;
          endDate = evento.preparationEndDate;
          break;
        case "montagem":
          startDate = evento.setupStartDate;
          endDate = evento.setupEndDate;
          break;
        case "finalizacao":
          startDate = evento.finalizationStartDate;
          endDate = evento.finalizationEndDate;
          break;
        default:
          return [];
      }

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const currentDate = new Date(start);

        while (currentDate <= end) {
          const formattedDate = currentDate.toLocaleDateString('pt-BR');
          availableDates.push(formattedDate);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      return availableDates.sort();
    }

    // Se não especificou fase, retorna todas as datas do evento
    const periods = [];

    if (evento.setupStartDate && evento.setupEndDate) {
      periods.push({ start: evento.setupStartDate, end: evento.setupEndDate });
    }
    if (evento.preparationStartDate && evento.preparationEndDate) {
      periods.push({ start: evento.preparationStartDate, end: evento.preparationEndDate });
    }
    if (evento.finalizationStartDate && evento.finalizationEndDate) {
      periods.push({ start: evento.finalizationStartDate, end: evento.finalizationEndDate });
    }

    periods.forEach(period => {
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const formattedDate = currentDate.toLocaleDateString('pt-BR');
        availableDates.push(formattedDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return availableDates.sort();
  }, [evento]);

  // Função para verificar se há períodos definidos
  const hasDefinedPeriods = useCallback((): boolean => {
    if (!evento) return false;
    return !!(evento.setupStartDate && evento.setupEndDate) ||
      !!(evento.preparationStartDate && evento.preparationEndDate) ||
      !!(evento.finalizationStartDate && evento.finalizationEndDate);
  }, [evento]);

  // Função para obter informações dos períodos permitidos
  const getPermittedDatesInfo = useCallback((): string => {
    if (!evento) return "Carregando...";

    const periods = [];
    const hasSetup = evento.setupStartDate && evento.setupEndDate;
    const hasPreparation = evento.preparationStartDate && evento.preparationEndDate;
    const hasFinalization = evento.finalizationStartDate && evento.finalizationEndDate;

    if (hasSetup && evento.setupStartDate && evento.setupEndDate) {
      periods.push(`Montagem: ${new Date(evento.setupStartDate).toLocaleDateString('pt-BR')} - ${new Date(evento.setupEndDate).toLocaleDateString('pt-BR')}`);
    }
    if (hasPreparation && evento.preparationStartDate && evento.preparationEndDate) {
      const startDate = new Date(evento.preparationStartDate);
      const endDate = new Date(evento.preparationEndDate);

      // Remover horário para evitar problemas de timezone
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      periods.push(`Evento: ${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`);
    }
    if (hasFinalization && evento.finalizationStartDate && evento.finalizationEndDate) {
      periods.push(`Desmontagem: ${new Date(evento.finalizationStartDate).toLocaleDateString('pt-BR')} - ${new Date(evento.finalizationEndDate).toLocaleDateString('pt-BR')}`);
    }

    if (periods.length === 0) {
      return "Nenhum período definido";
    }

    if (periods.length === 1 && hasPreparation) {
      return `${periods[0]} (apenas dia do evento)`;
    }

    return periods.join(' | ');
  }, [evento]);

  // Função para adicionar novo staff
  const adicionarNovoStaff = async () => {
    if (!novoStaff.name.trim() || !novoStaff.cpf.trim() || !novoStaff.funcao.trim() ||
      !novoStaff.empresa.trim() || !novoStaff.tipo_credencial?.trim()) {
      toast.error("Todos os campos obrigatórios devem ser preenchidos!");
      return;
    }

    setLoading(true);
    try {
      await createEventParticipant({
        eventId: eventId,
        wristbandId: novoStaff.tipo_credencial,
        name: novoStaff.name,
        cpf: novoStaff.cpf,
        role: novoStaff.funcao,
        company: novoStaff.empresa,
        validatedBy: "Sistema",
        daysWork: novoStaff.daysWork,
      });

      toast.success("Staff adicionado com sucesso!");

      // Limpar formulário
      setNovoStaff({
        name: "",
        cpf: "",
        funcao: "",
        empresa: "",
        tipo_credencial: "",
        cadastrado_por: "",
        daysWork: []
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao adicionar staff:", error);
      toast.error("Erro ao adicionar staff. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-purple-50 border-0 shadow-2xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            Adicionar Novo Staff
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Preencha os dados do novo Staff
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-gray-600">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Nome completo *
              </label>
              <Input
                type="text"
                value={novoStaff.name}
                onChange={(e) => setNovoStaff({ ...novoStaff, name: capitalizeWords(e.target.value) })}
                placeholder="Digite o nome completo"
                disabled={loading}
                className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-gray-600">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                CPF *
              </label>
              <Input
                type="text"
                value={novoStaff.cpf}
                onChange={(e) => setNovoStaff({ ...novoStaff, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                disabled={loading}
                className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Função *
              </label>
              <Input
                type="text"
                value={novoStaff.funcao}
                onChange={(e) => setNovoStaff({ ...novoStaff, funcao: capitalizeWords(e.target.value) })}
                placeholder="Digite a função"
                disabled={loading}
                className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Empresa *
              </label>
              <Input
                type="text"
                value={novoStaff.empresa}
                onChange={(e) => setNovoStaff({ ...novoStaff, empresa: capitalizeWords(e.target.value) })}
                placeholder="Digite a empresa"
                disabled={loading}
                className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tipo de Credencial *
            </label>
            <Select
              value={novoStaff.tipo_credencial || ""}
              onValueChange={(value) => setNovoStaff({ ...novoStaff, tipo_credencial: value.toUpperCase() })}
              disabled={tiposCredencialUnicosFiltrados.length === 0 || loading}
            >
              <SelectTrigger className="bg-gray-50 text-gray-600 border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                <SelectValue placeholder="Selecione o tipo de credencial" />
              </SelectTrigger>
              <SelectContent>
                {tiposCredencialUnicosFiltrados.map((tipo, idx) => {
                  const wristband = wristbands.find(w => w.id === tipo);
                  const wristbandModel = wristband ? wristbandModelMap[wristband.wristbandModelId] : undefined;
                  return (
                    <SelectItem key={idx} value={tipo}>
                      {wristbandModel?.credentialType || tipo}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              <Calendar className="w-4 h-4 inline mr-2" />
              Dias de Trabalho
            </label>
            {hasDefinedPeriods() ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                  <strong>Selecione as datas disponíveis para o evento:</strong>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Evento */}
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-2">Evento</p>
                    <div className="flex flex-col gap-2">
                      {getAvailableDates("preparacao").map((date) => (
                        <Button
                          key={date}
                          type="button"
                          variant={novoStaff.daysWork.includes(date) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDateSelection(date)}
                          disabled={loading}
                          className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                            ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                            }`}
                        >
                          {date}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Montagem */}
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-2">Montagem</p>
                    <div className="flex flex-col gap-2">
                      {getAvailableDates("montagem").map((date) => (
                        <Button
                          key={date}
                          type="button"
                          variant={novoStaff.daysWork.includes(date) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDateSelection(date)}
                          disabled={loading}
                          className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                            ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                            }`}
                        >
                          {date}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Finalização */}
                  <div>
                    <p className="text-xs font-semibold text-purple-700 mb-2">Finalização</p>
                    <div className="flex flex-col gap-2">
                      {getAvailableDates("finalizacao").map((date) => (
                        <Button
                          key={date}
                          type="button"
                          variant={novoStaff.daysWork.includes(date) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleDateSelection(date)}
                          disabled={loading}
                          className={`text-xs transition-all duration-200 ${novoStaff.daysWork.includes(date)
                            ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                            }`}
                        >
                          {date}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                {novoStaff.daysWork.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 rounded-lg p-4">
                    <p className="text-sm text-purple-800 font-medium">
                      <strong>Datas selecionadas:</strong> {novoStaff.daysWork.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  type="text"
                  value={novoStaff.daysWork.join(', ')}
                  onChange={(e) => setNovoStaff({ ...novoStaff, daysWork: validateAndProcessDaysWork(e.target.value) })}
                  placeholder="Datas de trabalho (formato: DD/MM/AAAA, separadas por vírgula)"
                  disabled={loading}
                  className="bg-white border-blue-300 focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                  <strong>Períodos permitidos:</strong> {getPermittedDatesInfo()}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium">
              <strong>Atenção:</strong> Todos os campos marcados com * são obrigatórios
            </p>
          </div>

          <div className="flex gap-4 pt-6">
            <Button
              onClick={() => {
                onClose();
                setNovoStaff({
                  name: "",
                  cpf: "",
                  funcao: "",
                  empresa: "",
                  tipo_credencial: "",
                  cadastrado_por: "",
                  daysWork: []
                });
              }}
              variant="outline"
              className="flex-1 bg-white border-gray-300 hover:bg-gray-50 text-gray-600 hover:border-gray-400 shadow-sm"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={adicionarNovoStaff}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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