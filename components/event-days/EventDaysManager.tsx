'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Calendar, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import { EventDay, EventPhase } from '@/public/types/event-days';
import { useEventDays } from '@/hooks/use-event-days';
import { SimpleEventDay } from '@/public/types/simple-event-days';

interface EventDaysManagerProps {
  initialData?: {
    montagem: SimpleEventDay[];
    evento: SimpleEventDay[];
    desmontagem: SimpleEventDay[];
  };
  onChange?: (days: { montagem: SimpleEventDay[]; evento: SimpleEventDay[]; desmontagem: SimpleEventDay[] }) => void;
  className?: string;
}

interface PhaseConfig {
  key: EventPhase;
  title: string;
  color: string;
  description: string;
}

const phases: PhaseConfig[] = [
  {
    key: 'montagem',
    title: 'Montagem',
    color: 'border-green-200 bg-green-50',
    description: 'Dias de montagem e preparação do evento'
  },
  {
    key: 'evento',
    title: 'Evento',
    color: 'border-blue-200 bg-blue-50',
    description: 'Dias de execução do evento principal'
  },
  {
    key: 'desmontagem',
    title: 'Desmontagem',
    color: 'border-purple-200 bg-purple-50',
    description: 'Dias de desmontagem e finalização'
  }
];

export default function EventDaysManager({ initialData, onChange, className = '' }: EventDaysManagerProps) {
  const eventDays = useEventDays(initialData);

  // Form state for adding new days
  const [newDayForm, setNewDayForm] = useState<{
    phase: EventPhase | '';
    date: string;
    period: 'diurno' | 'noturno';
    selectedGroup: string;
  }>({
    phase: '',
    date: '',
    period: 'diurno',
    selectedGroup: ''
  });

  // MUI DatePicker state
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Update form date when MUI picker changes
  React.useEffect(() => {
    if (selectedDate) {
      setNewDayForm(prev => ({ ...prev, date: selectedDate.toISOString() }));
    }
  }, [selectedDate]);

  // Handle date selection and close modal
  const handleDateSelect = (newDate: Dayjs | null) => {
    setSelectedDate(newDate);
    if (newDate) {
      setDatePickerOpen(false);
    }
  };

  // Format selected date for display
  const formatSelectedDateForDisplay = () => {
    if (!selectedDate) return 'Selecionar data e hora';
    return selectedDate.format('DD/MM/YYYY HH:mm');
  };

  // Call onChange when data changes
  const prevDataRef = React.useRef<string>('');
  React.useEffect(() => {
    if (onChange) {
      const currentData = {
        montagem: eventDays.montagem,
        evento: eventDays.evento,
        desmontagem: eventDays.desmontagem
      };
      const currentDataString = JSON.stringify(currentData);

      // Only call onChange if data actually changed
      if (prevDataRef.current !== currentDataString) {
        prevDataRef.current = currentDataString;
        onChange(currentData);
      }
    }
  }, [eventDays.montagem, eventDays.evento, eventDays.desmontagem, onChange]);

  // Helper functions for idSync generation (disabled for SimpleEventDay compatibility)
  const generateNextGroupId = (phase: EventPhase): string => {
    // This function is not compatible with SimpleEventDay structure
    return `${phase}-1`;
  };

  const getExistingGroups = (phase: EventPhase): string[] => {
    // This function is not compatible with SimpleEventDay structure
    return [];
  };

  const getGroupStatus = (phase: EventPhase, groupId: string): { hasStart: boolean; hasEnd: boolean } => {
    // This function is not compatible with SimpleEventDay structure
    // TODO: Implement for SimpleEventDay or remove if not needed
    return {
      hasStart: false,
      hasEnd: false
    };
  };

  const handleAddDay = () => {
    if (!newDayForm.phase || !newDayForm.date) {
      return;
    }

    let idSync: string | undefined;

    if (newDayForm.selectedGroup === 'NEW_GROUP') {
      // Generate new group ID
      idSync = generateNextGroupId(newDayForm.phase as EventPhase);
    } else if (newDayForm.selectedGroup) {
      // Use existing group
      idSync = newDayForm.selectedGroup;
    }

    // Create a simple day with date and period
    const newSimpleDay: SimpleEventDay = {
      date: newDayForm.date,
      period: newDayForm.period || 'diurno' // Default to 'diurno' if not specified
    };

    // For SimpleEventDay, we need to use the correct add method
    // Since useEventDays hook expects EventDay for addEventDay, we'll call it differently
    // We'll add the day to the phase array directly
    const currentPhase = newDayForm.phase as EventPhase;
    const currentDays = eventDays.getDaysByPhase(currentPhase);
    const updatedDays = [...currentDays, newSimpleDay];
    
    // Update the phase with new array
    if (currentPhase === 'montagem') {
      eventDays.setAllDays({ 
        montagem: updatedDays, 
        evento: eventDays.evento, 
        desmontagem: eventDays.desmontagem 
      });
    } else if (currentPhase === 'evento') {
      eventDays.setAllDays({ 
        montagem: eventDays.montagem, 
        evento: updatedDays, 
        desmontagem: eventDays.desmontagem 
      });
    } else if (currentPhase === 'desmontagem') {
      eventDays.setAllDays({ 
        montagem: eventDays.montagem, 
        evento: eventDays.evento, 
        desmontagem: updatedDays 
      });
    }

    // Reset form
    setNewDayForm({
      phase: '',
      date: '',
      period: 'diurno',
      selectedGroup: ''
    });
    setSelectedDate(null);
  };

  const formatDateTimeForInput = (dateTimeStr: string): string => {
    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
    if (!dateTimeStr) return '';

    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return '';

      return date.toISOString().slice(0, 16); // Remove seconds and timezone
    } catch {
      return '';
    }
  };

  const formatDateTimeFromInput = (inputStr: string): string => {
    // Convert datetime-local format to ISO datetime
    if (!inputStr) return '';

    try {
      const date = new Date(inputStr);
      if (isNaN(date.getTime())) return '';

      return date.toISOString(); // Full ISO datetime
    } catch {
      return '';
    }
  };

  const formatDateTimeDisplay = (dateTimeStr: string): string => {
    // Format ISO datetime for display as DD/MM/YYYY HH:mm
    if (!dateTimeStr) return '';

    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return dateTimeStr; // Fallback to original string

      return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeStr; // Fallback to original string
    }
  };

  const validation = eventDays.validateDays();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Gerenciar Dias do Evento</h3>
          <p className="text-sm text-gray-600">Configure as datas e períodos das diferentes fases do evento</p>
        </div>
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Erros de Validação:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Add New Day Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Adicionar Novo Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="phase">Fase</Label>
              <Select
                value={newDayForm.phase}
                onValueChange={(value) => setNewDayForm(prev => ({ ...prev, phase: value as EventPhase }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fase" />
                </SelectTrigger>
                <SelectContent className=''>
                  {phases.map(phase => (
                    <SelectItem key={phase.key} value={phase.key}>
                      {phase.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data e Hora</Label>
              <div className="mt-2">
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                  <DemoContainer components={['DateTimePicker']}>
                    <DateTimePicker
                      label="Selecionar data e hora"
                      value={selectedDate}
                      onChange={handleDateSelect}
                      viewRenderers={{
                        hours: renderTimeViewClock,
                        minutes: renderTimeViewClock,
                        seconds: renderTimeViewClock,
                      }}
                    />
                  </DemoContainer>
                </LocalizationProvider>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupSelect">Período</Label>
              <Select
                value={newDayForm.selectedGroup}
                onValueChange={(value) => setNewDayForm(prev => ({ ...prev, selectedGroup: value }))}
                disabled={!newDayForm.phase}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW_GROUP">
                    + Criar novo período ({newDayForm.phase ? generateNextGroupId(newDayForm.phase as EventPhase) : 'fase-1'})
                  </SelectItem>
                  {newDayForm.phase && getExistingGroups(newDayForm.phase as EventPhase).map(groupId => {
                    const status = getGroupStatus(newDayForm.phase as EventPhase, groupId);
                    const statusIcon = status.hasStart && status.hasEnd ? '✅' :
                      status.hasStart ? '🟡' : '⏳';
                    const statusText = status.hasStart && status.hasEnd ? ' (completo)' :
                      status.hasStart ? ' (precisa fim)' : ' (precisa início)';

                    return (
                      <SelectItem key={groupId} value={groupId}>
                        {statusIcon} {groupId}{statusText}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Automatização:</strong> Primeira data = início, última data = fim
                </AlertDescription>
              </Alert>

              {/* Status hints */}
              {newDayForm.selectedGroup && newDayForm.selectedGroup !== 'NEW_GROUP' && newDayForm.phase && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {(() => {
                      const existingDays = eventDays.getDaysByPhase(newDayForm.phase as EventPhase);
                      const dayCount = existingDays.length;

                      if (dayCount === 0) {
                        return '💡 Este será o primeiro dia desta fase.';
                      } else {
                        return '✨ Adicionando mais um dia a esta fase.';
                      }
                    })()}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="text-sm text-green-800 font-medium">✨ Automatização Ativada</p>
                <p className="text-xs text-green-600 mt-1">
                  O sistema define automaticamente início e fim baseado na ordem cronológica das datas no período.
                </p>
              </AlertDescription>
            </Alert>

            <div className="pt-2">
              <Button
                onClick={handleAddDay}
                disabled={
                  !newDayForm.phase ||
                  !newDayForm.date ||
                  !newDayForm.selectedGroup
                }
                className="w-full h-11 text-base font-medium"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Dia
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {phases.map((phaseConfig) => {
          const phaseDays = eventDays.getDaysByPhase(phaseConfig.key);
          const displayFormat = eventDays.formatDatesForDisplay();
          const groupedPeriods = eventDays.getPeriodsGrouped(phaseConfig.key);

          return (
            <Card key={phaseConfig.key} className={phaseConfig.color}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {phaseConfig.title}
                  </CardTitle>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    {phaseDays.length} dia{phaseDays.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{phaseConfig.description}</p>
                {displayFormat[phaseConfig.key] && (
                  <div className="p-2 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-800">
                      {displayFormat[phaseConfig.key]}
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {phaseDays.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum dia adicionado</p>
                ) : (
                  <>
                    {/* Períodos Sincronizados */}
                    {Object.entries(groupedPeriods.synced).map(([idSync, syncedDays]) => (
                      <div key={idSync} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {idSync}
                          </h4>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                            {syncedDays.length} dia{syncedDays.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {syncedDays.map((day, dayIndex) => {
                            const originalIndex = phaseDays.findIndex(d => d === day);
                            return (
                              <div
                                key={dayIndex}
                                className="flex items-center justify-between p-2 bg-white rounded border"
                              >
                                <div className="flex-1">
                                  <span className="font-medium">{formatDateTimeDisplay(day.date)}</span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                      {day.period === 'diurno' ? 'Diurno' : 'Noturno'}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => eventDays.removeEventDay(phaseConfig.key, originalIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Alerta para dias sem período (não deveria acontecer mais) */}
                    {groupedPeriods.individual.length > 0 && (
                      <Alert variant="default" className="border-yellow-200 bg-yellow-50">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription>
                          <p className="text-sm text-yellow-800 font-medium">
                            ⚠️ Encontrados {groupedPeriods.individual.length} dia(s) sem período definido
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Estes dias foram criados antes da implementação dos períodos obrigatórios.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}

                {phaseDays.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => eventDays.clearPhase(phaseConfig.key)}
                    className="w-full text-red-600 hover:text-red-800"
                  >
                    Limpar Todos
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {eventDays.hasAnyDays() && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Resumo da Configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <span className="text-sm font-medium text-gray-700">Total de dias configurados</span>
                <span className="text-lg font-bold text-blue-600">{eventDays.getAllDays().length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <span className="text-sm font-medium text-gray-700">Status da configuração</span>
                <span className={`text-sm font-semibold ${validation.isValid ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {validation.isValid ? '✅ Válida' : '❌ Inválida'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}