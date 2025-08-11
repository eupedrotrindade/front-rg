'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';
import { EventDay, EventPhase } from '@/types/event-days';
import { useEventDays } from '@/hooks/use-event-days';

interface EventDaysManagerProps {
  initialData?: {
    montagem: EventDay[];
    evento: EventDay[];
    desmontagem: EventDay[];
  };
  onChange?: (days: { montagem: EventDay[]; evento: EventDay[]; desmontagem: EventDay[] }) => void;
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
    start: boolean;
    end: boolean;
  }>({
    phase: '',
    date: '',
    start: true,
    end: false
  });

  // Call onChange when data changes
  React.useEffect(() => {
    if (onChange) {
      onChange({
        montagem: eventDays.montagem,
        evento: eventDays.evento,
        desmontagem: eventDays.desmontagem
      });
    }
  }, [eventDays.montagem, eventDays.evento, eventDays.desmontagem, onChange]);

  const handleAddDay = () => {
    if (!newDayForm.phase || !newDayForm.date) {
      return;
    }

    const newDay: EventDay = {
      date: newDayForm.date,
      start: newDayForm.start,
      end: newDayForm.end
    };

    eventDays.addEventDay(newDayForm.phase as EventPhase, newDay);

    // Reset form
    setNewDayForm({
      phase: '',
      date: '',
      start: true,
      end: false
    });
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
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Gerenciar Dias do Evento</h3>
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-800">Erros de Validação</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Add New Day Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Novo Dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1  gap-4">
            <div>
              <Label htmlFor="phase">Fase</Label>
              <select
                id="phase"
                value={newDayForm.phase}
                onChange={(e) => setNewDayForm(prev => ({ ...prev, phase: e.target.value as EventPhase }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma fase</option>
                {phases.map(phase => (
                  <option key={phase.key} value={phase.key}>
                    {phase.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="date">Data e Hora</Label>
              <Input
                id="date"
                type="datetime-local"
                value={formatDateTimeForInput(newDayForm.date)}
                onChange={(e) => setNewDayForm(prev => ({ ...prev, date: formatDateTimeFromInput(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="start"
                  checked={newDayForm.start}
                  onCheckedChange={(checked) => setNewDayForm(prev => ({ ...prev, start: !!checked }))}
                />
                <Label htmlFor="start">Dia de início</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="end"
                  checked={newDayForm.end}
                  onCheckedChange={(checked) => setNewDayForm(prev => ({ ...prev, end: !!checked }))}
                />
                <Label htmlFor="end">Dia de fim</Label>
              </div>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAddDay}
                disabled={!newDayForm.phase || !newDayForm.date}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {phases.map((phaseConfig) => {
          const phaseDays = eventDays.getDaysByPhase(phaseConfig.key);
          const displayFormat = eventDays.formatDatesForDisplay();

          return (
            <Card key={phaseConfig.key} className={phaseConfig.color}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {phaseConfig.title}
                  <span className="text-sm font-normal text-gray-600">
                    ({phaseDays.length} dia{phaseDays.length !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
                <p className="text-xs text-gray-600">{phaseConfig.description}</p>
                {displayFormat[phaseConfig.key] && (
                  <p className="text-sm font-medium text-gray-800">
                    {displayFormat[phaseConfig.key]}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-2">
                {phaseDays.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum dia adicionado</p>
                ) : (
                  phaseDays.map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <div>
                        <span className="font-medium">{formatDateTimeDisplay(day.date)}</span>
                        <div className="flex gap-2 mt-1">
                          {day.start && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Início
                            </span>
                          )}
                          {day.end && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                              Fim
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eventDays.removeEventDay(phaseConfig.key, index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>Total de dias configurados: {eventDays.getAllDays().length}</p>
              <p>Status: {validation.isValid ? '✅ Configuração válida' : '❌ Configuração inválida'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}