'use client'

import React from 'react';
import { CreateEventWizard } from '@/components/events/CreateEventWizard';

export default function CreateEventPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Novo Evento</h1>
            <p className="text-gray-600">Configure seu evento em etapas simples</p>
          </div>
          
          <CreateEventWizard />
        </div>
      </div>
    </div>
  );
}