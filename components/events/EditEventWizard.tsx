/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUpdateEvento } from '@/features/eventos/api/mutation/use-update-evento';
import { Event } from '@/features/eventos/types';
import { SimpleEventDay } from '@/public/types/simple-event-days';

// Step Components - reutilizando os mesmos do CreateEventWizard
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

interface EditEventWizardProps {
  event: Event;
}

export function EditEventWizard({ event }: EditEventWizardProps) {
  const router = useRouter();
  const updateEventMutation = useUpdateEvento();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [eventData, setEventData] = useState<EventData>({
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
  });
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Pre-populate data from existing event
  useEffect(() => {
    if (event) {
      // Function to parse event days (handles JSON strings) with date normalization
      const parseEventDays = (data: any) => {
        let parsedDays: any[] = [];
        
        if (Array.isArray(data)) {
          parsedDays = data;
        } else if (typeof data === 'string' && data.trim().startsWith('[')) {
          try {
            parsedDays = JSON.parse(data);
          } catch {
            return [];
          }
        } else {
          return [];
        }

        // Normalize dates to avoid timezone issues
        return parsedDays.map(day => ({
          ...day,
          date: day.date ? (
            // If date includes time, extract only the date part
            day.date.includes('T') ? day.date.split('T')[0] : day.date
          ) : day.date
        }));
      };

      // Extract location parts from address or venue
      const extractLocationParts = (address?: string, venue?: string) => {
        const fullAddress = address || venue || '';
        const parts = fullAddress.split(',').map(part => part.trim());
        
        return {
          address: venue || parts[0] || '',
          city: parts[1] || '',
          state: parts[2] || '',
          zipCode: '', // CEP geralmente não está no address concatenado
          additionalInfo: ''
        };
      };

      const locationData = extractLocationParts(event.address, event.venue);

      setEventData({
        basic: {
          name: event.name || '',
          type: event.type || '',
          description: event.description || '',
          bannerUrl: event.bannerUrl || '',
          bannerPath: '', // Não temos esse campo no evento
          isActive: event.isActive ?? true
        },
        datetime: {
          montagem: parseEventDays((event as any).montagem),
          evento: parseEventDays((event as any).evento),
          desmontagem: parseEventDays((event as any).desmontagem)
        },
        location: locationData
      });

      // Mark all steps as completed since we're editing
      setCompletedSteps(new Set([0, 1, 2, 3]));
    }
  }, [event]);

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
    
    const sortedDays = days.sort((a, b) => {
      // Normalize dates for comparison
      const dateA = a.date.includes('T') ? a.date.split('T')[0] : a.date;
      const dateB = b.date.includes('T') ? b.date.split('T')[0] : b.date;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
    
    // Return normalized dates
    const startDate = sortedDays[0].date.includes('T') ? sortedDays[0].date.split('T')[0] : sortedDays[0].date;
    const endDate = sortedDays[sortedDays.length - 1].date.includes('T') ? sortedDays[sortedDays.length - 1].date.split('T')[0] : sortedDays[sortedDays.length - 1].date;
    
    return {
      start: startDate,
      end: endDate
    };
  };

  // Transform wizard data to backend format
  const transformEventData = () => {
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
      id: event.id, // Include the event ID for update
      name: eventData.basic.name,
      description: eventData.basic.description || undefined,
      type: eventData.basic.type || undefined,
      bannerUrl: eventData.basic.bannerUrl || undefined,
      
      // Main event dates
      startDate: eventBoundaries.start || event.startDate,
      endDate: eventBoundaries.end || event.endDate,
      
      // Setup dates (montagem)
      setupStartDate: montagemBoundaries.start || undefined,
      setupEndDate: montagemBoundaries.end || undefined,
      
      // Finalization dates (desmontagem)
      finalizationStartDate: desmontagemBoundaries.start || undefined,
      finalizationEndDate: desmontagemBoundaries.end || undefined,
      
      // Event days structure - normalize dates to ensure consistent format
      montagem: eventData.datetime.montagem.map(day => ({
        ...day,
        date: day.date.includes('T') ? day.date.split('T')[0] : day.date
      })),
      evento: eventData.datetime.evento.map(day => ({
        ...day,
        date: day.date.includes('T') ? day.date.split('T')[0] : day.date
      })),
      desmontagem: eventData.datetime.desmontagem.map(day => ({
        ...day,
        date: day.date.includes('T') ? day.date.split('T')[0] : day.date
      })),
      
      // Location
      venue: eventData.location.address || event.venue,
      address: fullAddress || undefined,
      
      // Metadata
      totalDays: allEventDays.length,
      status: event.status, // Keep existing status
      visibility: event.visibility, // Keep existing visibility
      isActive: event.isActive // Keep existing active state
    };
  };

  // Handle form submission
  const handleUpdateEvent = async () => {
    try {
      const transformedData = transformEventData();
      await updateEventMutation.mutateAsync(transformedData);
      
      // Navigate back to event dashboard
      router.push(`/eventos/${event.id}/dashboard`);
    } catch (error) {
      console.error('Error updating event:', error);
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
        return !!(eventData.location.address);
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
    // Allow navigation to any step in edit mode
    setCurrentStep(stepIndex);
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
              className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
                index === currentStep
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : completedSteps.has(index)
                    ? 'bg-green-50 text-green-700 cursor-pointer hover:bg-green-100'
                    : 'text-gray-400 cursor-pointer hover:text-gray-600'
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
              <div className={`h-px w-8 mx-2 ${
                completedSteps.has(index) ? 'bg-green-300' : 'bg-gray-300'
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
              onClick={handleUpdateEvent}
              disabled={!validateStep(currentStep) || updateEventMutation.isPending}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              {updateEventMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {updateEventMutation.isPending ? 'Salvando Alterações...' : 'Salvar Alterações'}
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