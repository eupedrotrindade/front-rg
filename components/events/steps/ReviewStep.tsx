/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, MapPin, FileText, Clock, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewStepProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const eventTypes = [
  { value: 'conference', label: 'Conferência' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminário' },
  { value: 'concert', label: 'Concerto' },
  { value: 'exhibition', label: 'Exposição' },
  { value: 'corporate', label: 'Evento Corporativo' },
  { value: 'wedding', label: 'Casamento' },
  { value: 'party', label: 'Festa' },
  { value: 'sports', label: 'Evento Esportivo' },
  { value: 'other', label: 'Outro' }
];

export function ReviewStep({ data, updateData, onValidationChange }: ReviewStepProps) {
  const { basic, datetime, location } = data;

  const formatEventDays = (days: any[] | null | undefined) => {
    if (!days || !Array.isArray(days) || days.length === 0) return 'Não configurado';

    return days.map(day => {
      const date = new Date(day.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const period = day.period === 'diurno' ? '☀️ Diurno' : '🌙 Noturno';
      return `${date} (${period})`;
    }).join(', ');
  };

  const getEventTypeLabel = (type: string) => {
    return eventTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            Revisão Final do Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Revise todas as informações antes de criar o evento.
            Você poderá editar essas informações posteriormente se necessário.
          </p>
        </CardContent>
      </Card>

      {/* Event Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Informações Básicas
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
              <Edit className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{basic?.name || 'Nome não definido'}</h3>
              {basic?.type && (
                <Badge variant="secondary" className="mt-2">
                  {getEventTypeLabel(basic.type)}
                </Badge>
              )}
            </div>
            {basic?.description && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Descrição:</p>
                <p className="text-sm text-gray-600 leading-relaxed">{basic.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Localização
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
              <Edit className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">{location?.address || 'Endereço não definido'}</p>
              <div className="flex items-center space-x-2 text-gray-700 mt-1">
                {location?.city && <span>{location.city}</span>}
                {location?.state && <span>- {location.state.toUpperCase()}</span>}
                {location?.zipCode && <span>• {location.zipCode}</span>}
              </div>
            </div>
            {location?.additionalInfo && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Informações adicionais:</p>
                <p className="text-sm text-gray-600">{location.additionalInfo}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DateTime Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Datas e Horários
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800">
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">Montagem</span>
              </div>
              <p className="text-sm text-green-700">
                {formatEventDays(datetime?.montagem)}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-medium text-purple-800">Evento</span>
              </div>
              <p className="text-sm text-purple-700">
                {formatEventDays(datetime?.evento)}
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium text-orange-800">Desmontagem</span>
              </div>
              <p className="text-sm text-orange-700">
                {formatEventDays(datetime?.desmontagem)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-800">Status de Validação</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Informações básicas completas</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Datas configuradas</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Localização definida</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Notice */}
      <div className="flex items-center justify-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
        <div className="text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
          <p className="text-lg font-medium text-green-800">Pronto para Criar!</p>
          <p className="text-sm text-green-700">
            Todas as informações necessárias foram configuradas.
            Clique em &quot;Criar Evento&quot;para finalizar.
          </p>
        </div>
      </div>
    </div>
  );
}