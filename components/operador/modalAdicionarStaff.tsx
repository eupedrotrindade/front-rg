/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Loader2, Search, X } from 'lucide-react';
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { createEventParticipant } from "@/features/eventos/actions/create-event-participant"
import { useCredentials } from "@/features/eventos/api/query";
import { useEmpresasByEvent } from "@/features/eventos/api/query/use-empresas";
import { Credential } from "@/features/eventos/types";

interface ModalAdicionarStaffProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
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

export default function ModalAdicionarStaff({ isOpen, onClose, eventId, onSuccess, evento }: ModalAdicionarStaffProps) {
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

  const getEventPeriods = useCallback(() => {
    if (!evento) return { preparacao: [], montagem: [], finalizacao: [] };

    return {
      preparacao: getDateRange(evento.preparationStartDate, evento.preparationEndDate),
      montagem: getDateRange(evento.setupStartDate, evento.setupEndDate),
      finalizacao: getDateRange(evento.finalizationStartDate, evento.finalizationEndDate)
    };
  }, [evento, getDateRange]);

  const toggleDate = useCallback((date: string) => {
    setNovoStaff(prev => ({
      ...prev,
      daysWork: prev.daysWork.includes(date)
        ? prev.daysWork.filter(d => d !== date)
        : [...prev.daysWork, date].sort()
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

  const periods = getEventPeriods();
  const hasDefinedPeriods = Object.values(periods).some(dates => dates.length > 0);

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
                    <SelectContent className="max-h-[200px]">
                      {/* Campo de pesquisa */}
                      <div className="sticky top-0 z-10 bg-white border-b p-2">
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
                <SelectContent>
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

            {hasDefinedPeriods ? (
              <div className="space-y-4">
                {Object.entries(periods).map(([period, dates]) => {
                  if (dates.length === 0) return null;

                  const periodLabels = {
                    preparacao: "Evento",
                    montagem: "Montagem",
                    finalizacao: "Finalização"
                  };

                  return (
                    <div key={period}>
                      <p className="text-sm font-medium mb-2">{periodLabels[period as keyof typeof periodLabels]}</p>
                      <div className="flex flex-wrap gap-2">
                        {dates.map((date) => (
                          <Button
                            key={date}
                            type="button"
                            variant={novoStaff.daysWork.includes(date) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleDate(date)}
                            disabled={loading}
                          >
                            {date}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {novoStaff.daysWork.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Selecionadas:</strong> {novoStaff.daysWork.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <Input
                value={novoStaff.daysWork.join(', ')}
                onChange={(e) => setNovoStaff({
                  ...novoStaff,
                  daysWork: e.target.value.split(',').map(d => d.trim()).filter(d => d)
                })}
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
