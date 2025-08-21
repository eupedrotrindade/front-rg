'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import { EditEventWizard } from '@/components/events/EditEventWizard';
import { useEvento } from '@/features/eventos/api/query/use-evento';

export default function EditEventPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const { data: event, isLoading, error } = useEvento(eventId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
              <p className="text-lg text-muted-foreground">Carregando evento...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="rounded-full bg-red-100 p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <span className="text-red-600 text-2xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Evento não encontrado</h3>
              <p className="text-gray-600 mb-8">
                O evento que você está tentando editar não foi encontrado ou você não tem permissão para acessá-lo.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Evento</h1>
            <p className="text-gray-600">Atualize as informações do seu evento</p>
          </div>

          <EditEventWizard event={event} />
        </div>
      </div>
    </div>
  );
}