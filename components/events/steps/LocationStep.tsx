'use client'

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building, Info } from 'lucide-react';

interface LocationStepProps {
  data: Record<string, unknown>;
  updateData: (stepKey: string, data: Record<string, unknown>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export function LocationStep({ data, updateData, onValidationChange }: LocationStepProps) {
  const locationData = (data.location as Record<string, unknown>) || {};

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...locationData, [field]: value };
    updateData('location', updatedData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            Localização do Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Configure o endereço onde o evento será realizado. 
            Todas as informações são opcionais e podem ser adicionadas posteriormente.
          </p>
        </CardContent>
      </Card>

      {/* Address Fields */}
      <div className="grid grid-cols-1 gap-6">
        {/* Main Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Building className="w-5 h-5 text-purple-600" />
              <Label htmlFor="address" className="text-base font-medium">
                Endereço
              </Label>
            </div>
            <Input
              id="address"
              placeholder="Rua, número, bairro..."
              value={(locationData.address as string) || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-gray-500 mt-1">
              Endereço completo do local
            </p>
          </CardContent>
        </Card>

        {/* City, State, ZIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="city" className="text-sm font-medium mb-2 block">
                Cidade
              </Label>
              <Input
                id="city"
                placeholder="Nome da cidade"
                value={(locationData.city as string) || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="h-10"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Label htmlFor="state" className="text-sm font-medium mb-2 block">
                Estado
              </Label>
              <Input
                id="state"
                placeholder="UF"
                value={(locationData.state as string) || ''}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="h-10"
                maxLength={2}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Label htmlFor="zipCode" className="text-sm font-medium mb-2 block">
                CEP
              </Label>
              <Input
                id="zipCode"
                placeholder="00000-000"
                value={(locationData.zipCode as string) || ''}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                className="h-10"
                maxLength={9}
              />
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-5 h-5 text-purple-600" />
              <Label htmlFor="additionalInfo" className="text-base font-medium">
                Informações Adicionais
              </Label>
            </div>
            <Textarea
              id="additionalInfo"
              placeholder="Pontos de referência, instruções de acesso, estacionamento, transporte público..."
              value={(locationData.additionalInfo as string) || ''}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Detalhes que podem ajudar os participantes a encontrar e acessar o local
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Location Preview */}
      {((locationData.address as string) || (locationData.city as string)) && (
        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-purple-800">Preview do Endereço</span>
            </div>
            <div className="space-y-2">
              {(locationData.address as string) && (
                <div className="font-medium text-gray-900">{locationData.address as string}</div>
              )}
              <div className="flex items-center space-x-2 text-gray-700">
                {(locationData.city as string) && <span>{locationData.city as string}</span>}
                {(locationData.state as string) && <span>- {(locationData.state as string).toUpperCase()}</span>}
                {(locationData.zipCode as string) && <span>• {locationData.zipCode as string}</span>}
              </div>
              {(locationData.additionalInfo as string) && (
                <div className="text-sm text-gray-600 mt-2 p-2 bg-white rounded border-l-4 border-purple-200">
                  <strong>Informações adicionais:</strong> {locationData.additionalInfo as string}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optional Fields Notice */}
      <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Informação:</span> Todos os campos de localização são opcionais e podem ser preenchidos posteriormente
        </p>
      </div>
    </div>
  );
}