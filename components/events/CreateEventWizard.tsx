/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCreateEvento } from '@/features/eventos/api/mutation/use-create-evento';
import { CreateEventRequest } from '@/features/eventos/types';
import { SimpleEventDay } from '@/public/types/simple-event-days';

// Step Components
import { BasicInfoStep } from './steps/BasicInfoStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { LocationStep } from './steps/LocationStep';
import { ReviewStep } from './steps/ReviewStep';

interface StepConfig {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  icon: React.ReactNode;
}

const steps: StepConfig[] = [
  {
    id: 'basic',
    title: 'Informações Básicas',
    description: 'Nome, tipo e descrição do evento',
    component: BasicInfoStep,
    icon: <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">1</div>
  },
  {
    id: 'datetime',
    title: 'Data e Horário',
    description: 'Configure montagem, evento e desmontagem',
    component: DateTimeStep,
    icon: <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">2</div>
  },
  {
    id: 'location',
    title: 'Local',
    description: 'Endereço e detalhes do local',
    component: LocationStep,
    icon: <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">3</div>
  },
  {
    id: 'review',
    title: 'Revisão',
    description: 'Confirme os dados e finalize',
    component: ReviewStep,
    icon: <CheckCircle2 className="w-6 h-6 text-green-500" />
  }
];

interface EventData {
  basic: {
    name: string;
    type: string;
    description: string;
    bannerUrl?: string;
    bannerPath?: string;
    isActive?: boolean;
  };
  datetime: {
    montagem: any[];
    evento: any[];
    desmontagem: any[];
  };
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    additionalInfo: string;
  };
}

const initialEventData: EventData = {
  basic: {
    name: '',
    type: '',
    description: '',
    bannerUrl: '',
    bannerPath: '',
    isActive: true
  },
  datetime: {
    montagem: [],
    evento: [],
    desmontagem: []
  },
  location: {
    address: '',
    city: '',
    state: '',
    zipCode: '',
    additionalInfo: ''
  }
};

export function CreateEventWizard() {
  const router = useRouter();
  const createEventMutation = useCreateEvento();

  const [currentStep, setCurrentStep] = useState(0);
  const [eventData, setEventData] = useState<EventData>(initialEventData);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const updateEventData = (stepKey: keyof EventData, data: any) => {
    setEventData(prev => {
      if (stepKey === 'datetime') {
        // Para datetime, substitui completamente em vez de merge
        return { ...prev, [stepKey]: data };
      }
      // Para outros steps, faz merge como antes
      return { ...prev, [stepKey]: { ...prev[stepKey], ...data } };
    });
  };

  // Function to get date boundaries from event days
  const getDateBoundaries = (days: SimpleEventDay[]) => {
    if (days.length === 0) return { start: null, end: null };

    const sortedDays = days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return {
      start: sortedDays[0].date,
      end: sortedDays[sortedDays.length - 1].date
    };
  };

  // Transform wizard data to backend format
  const transformEventData = (): CreateEventRequest => {
    const allEventDays = [
      ...eventData.datetime.montagem,
      ...eventData.datetime.evento,
      ...eventData.datetime.desmontagem
    ];

    // Calculate overall event boundaries
    const eventBoundaries = getDateBoundaries(eventData.datetime.evento);
    const montagemBoundaries = getDateBoundaries(eventData.datetime.montagem);
    const desmontagemBoundaries = getDateBoundaries(eventData.datetime.desmontagem);

    // Combine location address
    const fullAddress = [
      eventData.location.address,
      eventData.location.city,
      eventData.location.state,
      eventData.location.zipCode
    ].filter(Boolean).join(', ');

    return {
      name: eventData.basic.name,
      description: eventData.basic.description || undefined,
      type: eventData.basic.type || undefined,
      bannerUrl: eventData.basic.bannerUrl || undefined,

      // Main event dates
      startDate: eventBoundaries.start || new Date().toISOString().split('T')[0],
      endDate: eventBoundaries.end || new Date().toISOString().split('T')[0],

      // Setup dates (montagem)
      setupStartDate: montagemBoundaries.start || undefined,
      setupEndDate: montagemBoundaries.end || undefined,

      // Finalization dates (desmontagem)
      finalizationStartDate: desmontagemBoundaries.start || undefined,
      finalizationEndDate: desmontagemBoundaries.end || undefined,

      // Event days structure
      montagem: eventData.datetime.montagem,
      evento: eventData.datetime.evento,
      desmontagem: eventData.datetime.desmontagem,

      // Location
      venue: eventData.location.address || 'Local não especificado',
      address: fullAddress || undefined,

      // Metadata
      totalDays: allEventDays.length,
      status: 'active' as const,
      visibility: 'public' as const,
      isActive: eventData.basic.isActive ?? true
    };
  };

  // Handle form submission
  const handleCreateEvent = async () => {
    try {
      const transformedData = transformEventData();
      const result = await createEventMutation.mutateAsync(transformedData);

      if (result) {
        router.push('/eventos');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      // Error is already handled by the mutation hook (toast)
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Basic Info
        return !!(eventData.basic.name && eventData.basic.type);
      case 1: // DateTime
        return eventData.datetime.evento.length > 0;
      case 2: // Location
        return true; // Todos os campos de localização são opcionais
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to completed steps or next step
    if (completedSteps.has(stepIndex) || stepIndex === currentStep + 1) {
      setCurrentStep(stepIndex);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          onClick={() => router.push('/eventos')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar aos Eventos</span>
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Etapa {currentStep + 1} de {steps.length}</span>
          <span>{Math.round(progress)}% concluído</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => handleStepClick(index)}
              disabled={!completedSteps.has(index) && index !== currentStep}
              className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${index === currentStep
                ? 'bg-purple-100 text-purple-700 shadow-sm'
                : completedSteps.has(index)
                  ? 'bg-green-50 text-green-700 cursor-pointer hover:bg-green-100'
                  : 'text-gray-400 cursor-not-allowed'
                }`}
            >
              {completedSteps.has(index) ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                step.icon
              )}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs opacity-75">{step.description}</div>
              </div>
            </button>

            {index < steps.length - 1 && (
              <div className={`h-px w-8 mx-2 ${completedSteps.has(index) ? 'bg-green-300' : 'bg-gray-300'
                }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="min-h-[500px]">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {steps[currentStep].title}
                </h2>
                <p className="text-gray-600">
                  {steps[currentStep].description}
                </p>
              </div>

              <CurrentStepComponent
                data={eventData}
                updateData={updateEventData}
              />
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </Button>

        <div className="flex items-center space-x-2">
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleCreateEvent}
              disabled={!validateStep(currentStep) || createEventMutation.isPending}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              {createEventMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {createEventMutation.isPending ? 'Criando Evento...' : 'Criar Evento'}
              </span>
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex items-center space-x-2"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}