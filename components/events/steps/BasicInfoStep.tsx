'use client'

import React from 'react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { BannerUpload } from '@/components/ui/banner-upload';
import { FileText, Type, Tag, CheckCircle } from 'lucide-react';

interface BasicInfoStepProps {
  data: Record<string, unknown>;
  updateData: (stepKey: string, data: Record<string, unknown>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const eventTypes = [
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'entretenimento', label: 'Entretenimento' },
  { value: 'esportivo', label: 'Esportivo' },
  { value: 'religioso', label: 'Religioso' },
  { value: 'show', label: 'Show' },
  { value: 'outros', label: 'Outros' }
];

export function BasicInfoStep({ data, updateData, onValidationChange }: BasicInfoStepProps) {
  const basicData = (data.basic as Record<string, unknown>) || {};

  const handleInputChange = (field: string, value: string | boolean) => {
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
              value={(basicData.name as string) || ''}
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
              value={(basicData.type as string) || ''}
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

        {/* Status do Evento */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <Label className="text-base font-medium">
                Status do Evento
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                checked={(basicData.isActive as boolean) ?? true}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <span className="text-sm text-gray-600">
                {(basicData.isActive as boolean) ?? true ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Eventos inativos não serão exibidos publicamente
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
            value={(basicData.description as string) || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Uma boa descrição ajuda na organização e divulgação do evento
          </p>
        </CardContent>
      </Card>

      {/* Banner Upload */}
      <Card>
        <CardContent className="p-4">
          <BannerUpload
            value={(basicData.bannerUrl as string) || ''}
            onChange={(url) => handleInputChange('bannerUrl', url)}
            onPathChange={(path) => handleInputChange('bannerPath', path)}
            eventId={(basicData.name as string)?.toLowerCase().replace(/\s+/g, '-')}
            maxSize={5}
          />
          <p className="text-xs text-gray-500 mt-2">
            O banner será exibido como imagem principal do evento
          </p>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {(basicData.name as string) && (
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-purple-800">Preview</span>
            </div>
            <div className="space-y-3">
              {/* Banner Preview */}
              {(basicData.bannerUrl as string) && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 mx-auto">
                  <Image
                    src={basicData.bannerUrl as string}
                    alt="Banner do evento"
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900">{basicData.name as string}</h3>
              {(basicData.type as string) && (
                <span className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  {eventTypes.find(t => t.value === (basicData.type as string))?.label}
                </span>
              )}
              {(basicData.description as string) && (
                <p className="text-sm text-gray-600 line-clamp-3">{basicData.description as string}</p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${(basicData.isActive as boolean) ?? true ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-xs font-medium ${(basicData.isActive as boolean) ?? true ? 'text-green-700' : 'text-gray-500'}`}>
                  {(basicData.isActive as boolean) ?? true ? 'Evento Ativo' : 'Evento Inativo'}
                </span>
              </div>
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