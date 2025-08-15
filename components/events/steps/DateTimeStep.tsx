'use client'

import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import SimpleEventDaysManager from '@/components/event-days/SimpleEventDaysManager';
import { SimpleEventDay } from '@/public/types/simple-event-days';

interface DateTimeStepProps {
  data: Record<string, unknown>;
  updateData: (stepKey: string, data: Record<string, unknown>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export function DateTimeStep({ data, updateData, onValidationChange }: DateTimeStepProps) {
  const datetimeData = (data.datetime as { montagem: SimpleEventDay[]; evento: SimpleEventDay[]; desmontagem: SimpleEventDay[] }) || { montagem: [], evento: [], desmontagem: [] };

  const handleEventDaysChange = useCallback((days: { montagem: SimpleEventDay[]; evento: SimpleEventDay[]; desmontagem: SimpleEventDay[] }) => {
    updateData('datetime', days);
  }, [updateData]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            Configuração de Datas e Períodos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">
                <strong>Montagem:</strong> Preparação (Diurno/Noturno)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-700">
                <strong>Evento:</strong> Execução (dia inteiro)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-gray-700">
                <strong>Desmontagem:</strong> Finalização (Diurno/Noturno)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Event Days Manager */}
      <SimpleEventDaysManager
        initialData={datetimeData}
        onChange={handleEventDaysChange}
      />

      {/* Summary */}
      {(datetimeData.montagem.length > 0 || datetimeData.evento.length > 0 || datetimeData.desmontagem.length > 0) && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">Resumo das Datas Configuradas</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Montagem:</span>
                <div className="text-green-700">
                  {datetimeData.montagem.length === 0 
                    ? 'Não configurada' 
                    : `${datetimeData.montagem.length} dia(s)`
                  }
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Evento:</span>
                <div className="text-purple-700">
                  {datetimeData.evento.length === 0 
                    ? 'Não configurado' 
                    : `${datetimeData.evento.length} dia(s)`
                  }
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Desmontagem:</span>
                <div className="text-orange-700">
                  {datetimeData.desmontagem.length === 0 
                    ? 'Não configurada' 
                    : `${datetimeData.desmontagem.length} dia(s)`
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Required Notice */}
      <div className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <span className="font-medium">Obrigatório:</span> Configure pelo menos um dia para a execução do evento
        </p>
      </div>
    </div>
  );
}