'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Calendar, AlertCircle, Sun, Moon } from 'lucide-react';
import { SimpleEventDay, EventPhase } from '@/types/simple-event-days';

interface SimpleEventDaysManagerProps {
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
    color: 'border-purple-200 bg-purple-50',
    description: 'Dias de execução do evento principal'
  },
  {
    key: 'desmontagem',
    title: 'Desmontagem',
    color: 'border-orange-200 bg-orange-50',
    description: 'Dias de desmontagem e finalização'
  }
];

export default function SimpleEventDaysManager({ initialData, onChange, className = '' }: SimpleEventDaysManagerProps) {
  const [eventDays, setEventDays] = useState({
    montagem: initialData?.montagem || [],
    evento: initialData?.evento || [],
    desmontagem: initialData?.desmontagem || []
  });

  // Form state for adding new days
  const [newDayForm, setNewDayForm] = useState<{
    phase: EventPhase | '';
    date: string;
    period: 'diurno' | 'noturno' | '';
  }>({
    phase: '',
    date: '',
    period: ''
  });

  // Call onChange when data changes
  const prevDataRef = React.useRef<string>('');
  React.useEffect(() => {
    if (onChange) {
      const currentDataString = JSON.stringify(eventDays);
      
      // Only call onChange if data actually changed
      if (prevDataRef.current !== currentDataString) {
        prevDataRef.current = currentDataString;
        onChange(eventDays);
      }
    }
  }, [eventDays, onChange]);

  const handleAddDay = () => {
    if (!newDayForm.phase || !newDayForm.date || !newDayForm.period) {
      return;
    }

    const newDay: SimpleEventDay = {
      date: newDayForm.date,
      period: newDayForm.period as 'diurno' | 'noturno'
    };

    setEventDays(prev => ({
      ...prev,
      [newDayForm.phase]: [...prev[newDayForm.phase as EventPhase], newDay]
    }));

    // Reset form
    setNewDayForm({
      phase: '',
      date: '',
      period: ''
    });
  };

  const handleRemoveDay = (phase: EventPhase, index: number) => {
    setEventDays(prev => ({
      ...prev,
      [phase]: prev[phase].filter((_, i) => i !== index)
    }));
  };

  const handleClearPhase = (phase: EventPhase) => {
    setEventDays(prev => ({
      ...prev,
      [phase]: []
    }));
  };

  const formatDateDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getPeriodIcon = (period: 'diurno' | 'noturno') => {
    return period === 'diurno' ?
      <Sun className="w-4 h-4 text-yellow-500" /> :
      <Moon className="w-4 h-4 text-blue-500" />;
  };

  const getPeriodColor = (period: 'diurno' | 'noturno') => {
    return period === 'diurno' ?
      'bg-yellow-100 text-yellow-800 border-yellow-200' :
      'bg-blue-100 text-blue-800 border-blue-200';
  };

  const hasAnyDays = () => {
    return eventDays.montagem.length > 0 || eventDays.evento.length > 0 || eventDays.desmontagem.length > 0;
  };

  const getTotalDays = () => {
    return eventDays.montagem.length + eventDays.evento.length + eventDays.desmontagem.length;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Calendar className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Gerenciar Dias do Evento</h3>
          <p className="text-sm text-gray-600">Configure as datas e períodos das diferentes fases do evento</p>
        </div>
      </div>

      {/* Add New Day Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" />
            Adicionar Novo Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fase */}
            <div>
              <Label htmlFor="phase">Fase</Label>
              <Select
                value={newDayForm.phase}
                onValueChange={(value) => setNewDayForm(prev => ({ ...prev, phase: value as EventPhase }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fase" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map(phase => (
                    <SelectItem key={phase.key} value={phase.key}>
                      {phase.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newDayForm.date}
                onChange={(e) => setNewDayForm(prev => ({ ...prev, date: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Período */}
            <div>
              <Label htmlFor="period">Período</Label>
              <Select
                value={newDayForm.period}
                onValueChange={(value) => setNewDayForm(prev => ({ ...prev, period: value as 'diurno' | 'noturno' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diurno">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-yellow-500" />
                      Diurno
                    </div>
                  </SelectItem>
                  <SelectItem value="noturno">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-blue-500" />
                      Noturno
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleAddDay}
              disabled={!newDayForm.phase || !newDayForm.date || !newDayForm.period}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {phases.map((phaseConfig) => {
          const phaseDays = eventDays[phaseConfig.key];

          return (
            <Card key={phaseConfig.key} className={phaseConfig.color}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {phaseConfig.title}
                  </CardTitle>
                  <span className="px-2 py-1 text-xs font-medium bg-white bg-opacity-80 text-gray-700 rounded-full">
                    {phaseDays.length} dia{phaseDays.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{phaseConfig.description}</p>
              </CardHeader>

              <CardContent className="space-y-3">
                {phaseDays.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">Nenhum dia adicionado</p>
                ) : (
                  <>
                    {phaseDays.map((day, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm"
                      >
                        <div className="flex items-center space-x-3">
                          {getPeriodIcon(day.period)}
                          <div>
                            <div className="font-medium text-gray-900">
                              {formatDateDisplay(day.date)}
                            </div>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getPeriodColor(day.period)}`}>
                              {day.period}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDay(phaseConfig.key, index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearPhase(phaseConfig.key)}
                      className="w-full text-red-600 hover:text-red-800 mt-3"
                    >
                      Limpar Todos
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {hasAnyDays() && (
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-purple-800">Resumo</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{getTotalDays()} dias configurados</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">Dica:</span> Configure pelo menos um dia de evento para continuar com a criação.
        </AlertDescription>
      </Alert>
    </div>
  );
}