"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCredentials } from "@/features/eventos/api/query/use-credentials";
import { useDeleteCredential, useSetCredentialActive, useUpdateCredential } from "@/features/eventos/api/mutation/use-credential-mutations";
import { useEventos } from "@/features/eventos/api/query/use-eventos";
import { Credential, UpdateCredentialRequest, Event } from "@/features/eventos/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search, Calendar, Clock, Wrench, Truck, Sun, Moon, Check, X, Building, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatEventDate } from "@/lib/utils";
import Link from "next/link";
import { CredentialForm } from "./credential-form";

// Utilitários para trabalhar com shifts
const parseShiftId = (shiftId: string) => {
  const parts = shiftId.split('-');
  if (parts.length >= 5) {
    return {
      workDate: `${parts[0]}-${parts[1]}-${parts[2]}`,
      workStage: parts[3] as 'montagem' | 'evento' | 'desmontagem',
      workPeriod: parts[4] as 'diurno' | 'noturno'
    };
  }
  return {
    workDate: shiftId,
    workStage: 'evento' as const,
    workPeriod: 'diurno' as const
  };
};

const getStageInfo = (stage: string) => {
  switch (stage) {
    case 'montagem':
      return { name: 'Montagem', icon: Wrench, color: 'text-orange-600' };
    case 'evento':
      return { name: 'Evento', icon: Calendar, color: 'text-blue-600' };
    case 'desmontagem':
      return { name: 'Desmontagem', icon: Truck, color: 'text-red-600' };
    default:
      return { name: stage, icon: Calendar, color: 'text-gray-600' };
  }
};

const formatShiftInfo = (shiftId: string) => {
  const { workDate, workStage, workPeriod } = parseShiftId(shiftId);
  const formattedDate = formatEventDate(workDate + 'T00:00:00');
  const stageInfo = getStageInfo(workStage);
  const period = workPeriod === 'diurno' ? 'Dia' : 'Noite';

  return {
    date: formattedDate,
    stage: stageInfo.name,
    period: period,
    stageInfo
  };
};

// Função para gerar shift IDs baseados na estrutura do evento
const generateEventShifts = (event: Event): string[] => {
  const shifts: string[] = [];
  
  if (!event) return shifts;
  
  // Processar cada etapa do evento
  const stages = ['montagem', 'evento', 'desmontagem'] as const;
  
  stages.forEach(stage => {
    const stageData = event[stage];
    if (!stageData) return;
    
    try {
      let dataArray: any[] = [];
      
      // Se for string JSON, fazer parse
      if (typeof stageData === 'string') {
        dataArray = JSON.parse(stageData);
      }
      // Se já for array, usar diretamente
      else if (Array.isArray(stageData)) {
        dataArray = stageData;
      }
      
      // Gerar shift IDs para cada dia da etapa
      dataArray.forEach(item => {
        if (item && item.date && item.period) {
          const shiftId = `${item.date}-${stage}-${item.period}`;
          shifts.push(shiftId);
        }
      });
    } catch (error) {
      console.warn(`Erro ao processar dados da etapa ${stage}:`, error);
    }
  });
  
  return shifts;
};

export const CredentialsDashboard = () => {
  const params = useParams();
  const eventId = params.id as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");

  const { data: credentials = [], isLoading, error } = useCredentials({
    eventId,
    search: searchTerm || undefined,
  });

  // Buscar dados do evento para obter turnos
  const { data: eventData } = useEventos({ id: eventId });
  const event = Array.isArray(eventData) ? null : eventData as Event;

  // Gerar dias disponíveis baseado no evento (similar ao empresas)
  const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> => {
    if (!event) return []

    const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' }> = []

    // Função helper para processar arrays de dados do evento
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
        else {
          return;
        }

        // Processar cada item do array
        dataArray.forEach(item => {
          if (item && item.date) {
            const dateObj = new Date(item.date);
            if (isNaN(dateObj.getTime())) {
              console.warn(`Data inválida encontrada: ${item.date}`);
              return;
            }

            const formattedDate = formatEventDate(dateObj.toISOString());
            
            // Usar período do item se disponível
            let period: 'diurno' | 'noturno';
            if (item.period && (item.period === 'diurno' || item.period === 'noturno')) {
              period = item.period;
            } else {
              // Fallback: calcular baseado na hora
              const hour = dateObj.getHours();
              period = (hour >= 6 && hour < 18) ? 'diurno' : 'noturno';
            }

            // Criar ID único baseado na data e período
            const dayId = `${dateObj.toISOString().split('T')[0]}-${stage}-${period}`;

            days.push({
              id: dayId,
              label: `${formattedDate} (${stageName} - ${period === 'diurno' ? 'Diurno' : 'Noturno'})`,
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
    if ('montagem' in event) {
      processEventArray((event as any).montagem, 'montagem', 'MONTAGEM');
    }
    if ('evento' in event) {
      processEventArray((event as any).evento, 'evento', 'EVENTO');
    }
    if ('desmontagem' in event) {
      processEventArray((event as any).desmontagem, 'desmontagem', 'DESMONTAGEM');
    }

    // Ordenar dias cronologicamente
    days.sort((a, b) => {
      const dateA = new Date(a.id.split('-')[0]);
      const dateB = new Date(b.id.split('-')[0]);

      if (dateA.getTime() === dateB.getTime()) {
        const typeOrder = { montagem: 0, evento: 1, desmontagem: 2 };
        const periodOrder = { diurno: 0, noturno: 1 };

        const typeComparison = typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
        if (typeComparison !== 0) return typeComparison;

        return periodOrder[a.period as keyof typeof periodOrder] - periodOrder[b.period as keyof typeof periodOrder];
      }

      return dateA.getTime() - dateB.getTime();
    });

    return days
  }, [event])

  const eventDays = getEventDays()
  const shouldAutoSelectDay = !selectedDay && eventDays.length > 0
  const effectiveSelectedDay = shouldAutoSelectDay ? eventDays[0].id : selectedDay

  const deleteCredential = useDeleteCredential();
  const setCredentialActive = useSetCredentialActive();
  const updateCredential = useUpdateCredential();

  const handleDelete = async (credential: Credential) => {
    if (confirm(`Tem certeza que deseja deletar a credencial "${credential.nome}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteCredential.mutateAsync({
          id: credential.id,
          performedBy: "system", // TODO: Pegar do usuário logado
        });
        toast.success("Credencial deletada com sucesso!");
      } catch (error) {
        console.error("Erro ao deletar credencial:", error);
        toast.error("Erro ao deletar credencial");
      }
    }
  };

  const handleToggleActive = async (credential: Credential) => {
    try {
      await setCredentialActive.mutateAsync({
        id: credential.id,
        isActive: !credential.isActive,
        performedBy: "system", // TODO: Pegar do usuário logado
      });
    } catch (error) {
      console.error("Erro ao alterar status da credencial:", error);
    }
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setIsEditDialogOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingCredential(null);
    setIsEditDialogOpen(false);
  };

  const handleSaveEdit = async (data: UpdateCredentialRequest) => {
    if (!editingCredential) return;

    try {
      await updateCredential.mutateAsync({
        id: editingCredential.id,
        data,
      });
      setEditingCredential(null);
      setIsEditDialogOpen(false);
      toast.success("Credencial atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar credencial:", error);
      toast.error("Erro ao atualizar credencial");
    }
  };

  // Gerar turnos disponíveis do evento
  const availableEventShifts = useMemo(() => {
    const shifts = event ? generateEventShifts(event) : [];
    
    console.log('🔍 Debug event shifts:', {
      event: event,
      eventId: eventId,
      montagem: event?.montagem,
      evento: event?.evento,
      desmontagem: event?.desmontagem,
      generatedShifts: shifts,
      totalShifts: shifts.length
    });
    
    return shifts;
  }, [event, eventId]);

  // Processar credenciais com informações de shift expandidas
  const processedCredentials = useMemo(() => {
    return credentials.map(credential => {
      // Se a credencial já tem as propriedades de shift, usar diretamente
      if (credential.workDate && credential.workStage && credential.workPeriod) {
        return {
          ...credential,
          // Garantir que days_works tenha pelo menos o shift principal se estiver vazio
          days_works: credential.days_works?.length > 0 ? credential.days_works : [credential.shiftId || `${credential.workDate}-${credential.workStage}-${credential.workPeriod}`]
        };
      }

      // Se não, extrair do primeiro shift ID nos days_works como fallback
      const firstShiftId = credential.days_works?.[0];
      if (firstShiftId) {
        const { workDate, workStage, workPeriod } = parseShiftId(firstShiftId);
        return {
          ...credential,
          shiftId: firstShiftId,
          workDate,
          workStage,
          workPeriod
        };
      }

      // Se não tem nenhum shift, usar o primeiro disponível do evento como fallback
      if (availableEventShifts.length > 0) {
        const fallbackShift = availableEventShifts[0];
        const { workDate, workStage, workPeriod } = parseShiftId(fallbackShift);
        return {
          ...credential,
          shiftId: fallbackShift,
          workDate,
          workStage,
          workPeriod,
          days_works: [fallbackShift]
        };
      }

      return credential;
    });
  }, [credentials, availableEventShifts]);

  // Função para obter cor da tab baseada no tipo (copiado do empresas)
  const getTabColor = useCallback((type: string, isActive: boolean) => {
    if (isActive) {
      switch (type) {
        case 'montagem':
          return 'border-orange-500 text-orange-600 bg-orange-50'
        case 'evento':
          return 'border-blue-500 text-blue-600 bg-blue-50'
        case 'desmontagem':
          return 'border-red-500 text-red-600 bg-red-50'
        default:
          return 'border-gray-500 text-gray-600 bg-gray-50'
      }
    } else {
      switch (type) {
        case 'montagem':
          return 'hover:text-orange-700 hover:border-orange-300'
        case 'evento':
          return 'hover:text-blue-700 hover:border-blue-300'
        case 'desmontagem':
          return 'hover:text-red-700 hover:border-red-300'
        default:
          return 'hover:text-gray-700 hover:border-gray-300'
      }
    }
  }, [])

  // Função para obter ícone do período (copiado do empresas)
  const getPeriodIcon = useCallback((period?: 'diurno' | 'noturno') => {
    if (period === 'diurno') {
      return <Sun className="h-3 w-3 text-yellow-500" />;
    } else if (period === 'noturno') {
      return <Moon className="h-3 w-3 text-blue-500" />;
    }
    return null;
  }, [])

  // Estatísticas das credenciais
  const stats = useMemo(() => {
    if (!processedCredentials) {
      return {
        total: 0,
        ativas: 0,
        inativas: 0,
        distribuidas: 0,
        uniqueNames: 0
      }
    }

    const total = processedCredentials.length
    const ativas = processedCredentials.filter(c => c.isActive).length
    const inativas = processedCredentials.filter(c => !c.isActive).length
    const distribuidas = processedCredentials.filter(c => c.isDistributed).length
    const uniqueNamesSet = new Set(processedCredentials.map(c => c.nome))
    const uniqueNames = uniqueNamesSet.size

    return {
      total,
      ativas,
      inativas,
      distribuidas,
      uniqueNames
    }
  }, [processedCredentials])

  // Filtrar credenciais por dia selecionado
  const credentialsByDay = useMemo(() => {
    const selectedDayCredentials = processedCredentials.filter(credential => {
      // Se não há dia selecionado, mostrar todas
      if (!effectiveSelectedDay) return true
      
      // Se tem shiftId direto, comparar
      if (credential.shiftId === effectiveSelectedDay) {
        return true
      }
      
      // Se tem days_works, verificar se contém o dia selecionado
      if (credential.days_works && credential.days_works.includes(effectiveSelectedDay)) {
        return true
      }
      
      return false
    })

    return selectedDayCredentials
  }, [processedCredentials, effectiveSelectedDay])

  // Auto-selecionar primeiro dia se nenhum estiver selecionado
  React.useEffect(() => {
    if (eventDays.length > 0 && !selectedDay) {
      setSelectedDay(eventDays[0].id)
    }
  }, [eventDays, selectedDay])

  const filteredCredentials = useMemo(() => {
    return credentialsByDay.filter((credential) => {
      const searchLower = searchTerm.toLowerCase();

      // Buscar por nome ou cor
      if (credential.nome.toLowerCase().includes(searchLower) ||
        credential.cor.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Buscar por informações de shift
      if (credential.workDate && credential.workStage && credential.workPeriod) {
        const formattedDate = formatEventDate(credential.workDate + 'T00:00:00');
        const stage = getStageInfo(credential.workStage).name;
        const period = credential.workPeriod === 'diurno' ? 'Dia' : 'Noite';

        return formattedDate.toLowerCase().includes(searchLower) ||
          stage.toLowerCase().includes(searchLower) ||
          period.toLowerCase().includes(searchLower);
      }

      // Fallback: buscar nos days_works
      return credential.days_works.some(shiftId => {
        const shiftInfo = formatShiftInfo(shiftId);
        return shiftInfo.date.toLowerCase().includes(searchLower) ||
          shiftInfo.stage.toLowerCase().includes(searchLower) ||
          shiftInfo.period.toLowerCase().includes(searchLower);
      });

      return false;
    });
  }, [credentialsByDay, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Credenciais</h2>
          <Link href={`/eventos/${eventId}/credenciais/create`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nova Credencial
            </Button>
          </Link>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Turnos de Trabalho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-32"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-20"></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erro ao carregar credenciais</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total</p>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-xs opacity-75">{stats.uniqueNames} nomes únicos</p>
              </div>
              <Building className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Ativas</p>
                <p className="text-3xl font-bold">{stats.ativas}</p>
              </div>
              <Check className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Inativas</p>
                <p className="text-3xl font-bold">{stats.inativas}</p>
              </div>
              <X className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Distribuídas</p>
                <p className="text-3xl font-bold">{stats.distribuidas}</p>
              </div>
              <Calendar className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Link href={`/eventos/${eventId}/credenciais/create`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nova Credencial
            </Button>
          </Link>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar credencial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
        </div>
      </div>

      {/* Tabs dos dias */}
      {eventDays.length > 0 && (
        <div className="border-b border-gray-200 bg-white rounded-t-lg">
          <nav className="-mb-px flex flex-wrap gap-1 px-4 py-2">
            {eventDays.map((day) => {
              const credentialsInDay = processedCredentials.filter(credential => {
                return credential.shiftId === day.id || 
                       (credential.days_works && credential.days_works.includes(day.id))
              }).length
              const isActive = effectiveSelectedDay === day.id

              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`border-b-2 py-2 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${
                    isActive
                      ? getTabColor(day.type, true)
                      : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">
                        {day.label.split(' ')[0]}
                      </span>
                      {getPeriodIcon(day.period)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs opacity-75">
                        {day.type === 'montagem' ? 'MONTAGEM' :
                          day.type === 'evento' ? 'EVENTO' :
                            day.type === 'desmontagem' ? 'DESMONTAGEM' :
                              'EVENTO'}
                      </span>
                      {day.period && (
                        <span className="text-xs opacity-60">
                          ({day.period === 'diurno' ? 'D' : 'N'})
                        </span>
                      )}
                    </div>
                    <span className="text-xs opacity-75">
                      {isLoading ? (
                        <span className="inline-block w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>
                      ) : (
                        `(${credentialsInDay})`
                      )}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Tabela de credenciais */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Cor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Turnos de Trabalho
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p>Carregando credenciais...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCredentials.length > 0 ? (
                filteredCredentials.map((credential) => (
                  <tr key={credential.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {credential.nome}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: credential.cor }}
                        />
                        <span className="text-xs font-mono text-gray-600">{credential.cor}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {credential.workDate && credential.workStage && credential.workPeriod ? (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="secondary"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {formatEventDate(credential.workDate + 'T00:00:00')} - {credential.workStage?.toUpperCase()} - {credential.workPeriod === 'diurno' ? 'Diurno' : 'Noturno'}
                            </Badge>
                            {credential.shiftId && (
                              <div className="text-xs text-gray-500 font-mono">
                                {credential.shiftId}
                              </div>
                            )}
                          </div>
                        ) : credential.days_works && credential.days_works.length > 0 ? (
                          <>
                            {credential.days_works.slice(0, 2).map((shiftId, index) => {
                              const displayInfo = formatShiftInfo(shiftId);
                              const IconComponent = displayInfo.stageInfo.icon;
                              return (
                                <div key={index} className="flex items-center space-x-1 text-xs">
                                  <IconComponent className={`h-3 w-3 ${displayInfo.stageInfo.color}`} />
                                  <Badge variant="outline" className="text-xs py-0 px-1">
                                    {displayInfo.date}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs py-0 px-1">
                                    {displayInfo.period}
                                  </Badge>
                                </div>
                              );
                            })}
                            {credential.days_works.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{credential.days_works.length - 2} mais
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Não configurado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={credential.isActive}
                          onCheckedChange={() => handleToggleActive(credential)}
                        />
                        <Badge variant={credential.isActive ? "default" : "secondary"}>
                          {credential.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(credential)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-gray-600 border-gray-200 hover:bg-gray-50"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white text-black border-gray-200">
                            <DropdownMenuItem
                              onClick={() => handleDelete(credential)}
                              className="cursor-pointer text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Building className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        {effectiveSelectedDay ? `Nenhuma credencial encontrada para este turno` : 'Nenhuma credencial encontrada'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {effectiveSelectedDay ? 'Crie uma nova credencial para este turno' : 'Crie uma nova credencial para começar'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-800">
          <DialogHeader>
            <DialogTitle>Editar Credencial</DialogTitle>
            <DialogDescription>
              {editingCredential && `Edite os detalhes da credencial "${editingCredential.nome}"`}
            </DialogDescription>
          </DialogHeader>
          {editingCredential && (
            <CredentialForm
              credential={editingCredential}
              onSubmit={handleSaveEdit}
              onCancel={handleCancelEdit}
              isLoading={updateCredential.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 