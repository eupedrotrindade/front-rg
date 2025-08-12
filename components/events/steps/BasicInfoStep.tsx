'use client'

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Type, Tag } from 'lucide-react';

interface BasicInfoStepProps {
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

export function BasicInfoStep({ data, updateData, onValidationChange }: BasicInfoStepProps) {
  const basicData = data.basic || {};

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...basicData, [field]: value };
    updateData('basic', updatedData);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nome do Evento */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Type className="w-5 h-5 text-purple-600" />
              <Label htmlFor="eventName" className="text-base font-medium">
                Nome do Evento *
              </Label>
            </div>
            <Input
              id="eventName"
              placeholder="Digite o nome do evento"
              value={basicData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este será o título principal do seu evento
            </p>
          </CardContent>
        </Card>

        {/* Tipo do Evento */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Tag className="w-5 h-5 text-purple-600" />
              <Label className="text-base font-medium">
                Tipo do Evento *
              </Label>
            </div>
            <Select
              value={basicData.type || ''}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Escolha a categoria que melhor descreve seu evento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Descrição */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="w-5 h-5 text-purple-600" />
            <Label htmlFor="eventDescription" className="text-base font-medium">
              Descrição do Evento
            </Label>
          </div>
          <Textarea
            id="eventDescription"
            placeholder="Descreva seu evento, objetivos, público-alvo e informações relevantes..."
            value={basicData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Uma boa descrição ajuda na organização e divulgação do evento
          </p>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {basicData.name && (
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-purple-800">Preview</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">{basicData.name}</h3>
              {basicData.type && (
                <span className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  {eventTypes.find(t => t.value === basicData.type)?.label}
                </span>
              )}
              {basicData.description && (
                <p className="text-sm text-gray-600 line-clamp-3">{basicData.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Required Fields Notice */}
      <div className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <span className="font-medium">Campos obrigatórios:</span> Nome do evento e tipo são necessários para continuar
        </p>
      </div>
    </div>
  );
}