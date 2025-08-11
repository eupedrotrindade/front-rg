import { useState, useCallback, useMemo } from 'react';
import { EventDay, EventPhase, EventDayRange, LegacyEventDates, EventWithFlexibleDays } from '@/types/event-days';

export interface UseEventDaysReturn {
  // State
  montagem: EventDay[];
  evento: EventDay[];
  desmontagem: EventDay[];
  
  // Actions
  addEventDay: (phase: EventPhase, day: EventDay) => void;
  removeEventDay: (phase: EventPhase, index: number) => void;
  updateEventDay: (phase: EventPhase, index: number, day: EventDay) => void;
  clearPhase: (phase: EventPhase) => void;
  setAllDays: (days: { montagem: EventDay[]; evento: EventDay[]; desmontagem: EventDay[] }) => void;
  
  // Utilities
  getAllDays: () => EventDay[];
  getDaysByPhase: (phase: EventPhase) => EventDay[];
  getDateRange: (phase: EventPhase) => EventDayRange | null;
  hasAnyDays: () => boolean;
  validateDays: () => { isValid: boolean; errors: string[] };
  
  // Legacy compatibility
  convertFromLegacy: (legacyDates: LegacyEventDates) => void;
  convertToLegacy: () => LegacyEventDates;
  
  // Formatting utilities
  formatDatesForDisplay: () => {
    montagem: string;
    evento: string;
    desmontagem: string;
  };
}

export function useEventDays(initialData?: Partial<EventWithFlexibleDays>): UseEventDaysReturn {
  // Initialize state from props or empty arrays
  const [montagem, setMontagem] = useState<EventDay[]>(initialData?.montagem || []);
  const [evento, setEvento] = useState<EventDay[]>(initialData?.evento || []);
  const [desmontagem, setDesmontagem] = useState<EventDay[]>(initialData?.desmontagem || []);

  // Initialize from legacy data if new structure is empty
  const initializeFromLegacy = useCallback(() => {
    if (initialData && (montagem.length === 0 && evento.length === 0 && desmontagem.length === 0)) {
      const legacyConverted = convertLegacyToEventDays(initialData);
      setMontagem(legacyConverted.montagem);
      setEvento(legacyConverted.evento);
      setDesmontagem(legacyConverted.desmontagem);
    }
  }, [initialData, montagem.length, evento.length, desmontagem.length]);

  // Run legacy conversion on mount if needed
  useState(() => {
    initializeFromLegacy();
  });

  // Action creators
  const addEventDay = useCallback((phase: EventPhase, day: EventDay) => {
    const setter = getSetterForPhase(phase);
    setter(prev => [...prev, day]);
  }, []);

  const removeEventDay = useCallback((phase: EventPhase, index: number) => {
    const setter = getSetterForPhase(phase);
    setter(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateEventDay = useCallback((phase: EventPhase, index: number, day: EventDay) => {
    const setter = getSetterForPhase(phase);
    setter(prev => prev.map((item, i) => i === index ? day : item));
  }, []);

  const clearPhase = useCallback((phase: EventPhase) => {
    const setter = getSetterForPhase(phase);
    setter([]);
  }, []);

  const setAllDays = useCallback((days: { montagem: EventDay[]; evento: EventDay[]; desmontagem: EventDay[] }) => {
    setMontagem(days.montagem);
    setEvento(days.evento);
    setDesmontagem(days.desmontagem);
  }, []);

  // Helper function to get setter for phase
  const getSetterForPhase = (phase: EventPhase) => {
    switch (phase) {
      case 'montagem': return setMontagem;
      case 'evento': return setEvento;
      case 'desmontagem': return setDesmontagem;
      default: throw new Error(`Invalid phase: ${phase}`);
    }
  };

  // Utility functions
  const getAllDays = useCallback((): EventDay[] => {
    return [...montagem, ...evento, ...desmontagem];
  }, [montagem, evento, desmontagem]);

  const getDaysByPhase = useCallback((phase: EventPhase): EventDay[] => {
    switch (phase) {
      case 'montagem': return montagem;
      case 'evento': return evento;
      case 'desmontagem': return desmontagem;
      default: return [];
    }
  }, [montagem, evento, desmontagem]);

  const getDateRange = useCallback((phase: EventPhase): EventDayRange | null => {
    const days = getDaysByPhase(phase);
    if (days.length === 0) return null;

    // Sort dates and get first and last
    const sortedDates = days
      .map(day => parseDateTimeString(day.date))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      startDate: formatDateTimeForDisplay(sortedDates[0]),
      endDate: formatDateTimeForDisplay(sortedDates[sortedDates.length - 1]),
      phase
    };
  }, [getDaysByPhase]);

  const hasAnyDays = useCallback((): boolean => {
    return montagem.length > 0 || evento.length > 0 || desmontagem.length > 0;
  }, [montagem.length, evento.length, desmontagem.length]);

  const validateDays = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check if at least one phase has days
    if (!hasAnyDays()) {
      errors.push('Pelo menos uma fase deve ter dias definidos');
    }

    // Check for duplicate dates within each phase
    [
      { phase: 'montagem', days: montagem },
      { phase: 'evento', days: evento },
      { phase: 'desmontagem', days: desmontagem }
    ].forEach(({ phase, days }) => {
      const dates = days.map(day => day.date);
      const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index);
      if (duplicates.length > 0) {
        errors.push(`Fase ${phase} tem datas duplicadas: ${duplicates.join(', ')}`);
      }
    });

    // Check for logical start/end combinations
    [
      { phase: 'montagem', days: montagem },
      { phase: 'evento', days: evento },
      { phase: 'desmontagem', days: desmontagem }
    ].forEach(({ phase, days }) => {
      days.forEach((day, index) => {
        if (!day.start && !day.end) {
          errors.push(`Dia ${day.date} na fase ${phase} deve ser marcado como início ou fim (ou ambos)`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [montagem, evento, desmontagem, hasAnyDays]);

  // Legacy conversion functions
  const convertFromLegacy = useCallback((legacyDates: LegacyEventDates) => {
    const converted = convertLegacyToEventDays(legacyDates);
    setAllDays(converted);
  }, [setAllDays]);

  const convertToLegacy = useCallback((): LegacyEventDates => {
    const montagemRange = getDateRange('montagem');
    const eventoRange = getDateRange('evento');
    const desmontagemRange = getDateRange('desmontagem');

    return {
      setupStartDate: montagemRange?.startDate,
      setupEndDate: montagemRange?.endDate,
      preparationStartDate: eventoRange?.startDate,
      preparationEndDate: eventoRange?.endDate,
      finalizationStartDate: desmontagemRange?.startDate,
      finalizationEndDate: desmontagemRange?.endDate,
    };
  }, [getDateRange]);

  // Formatting utilities
  const formatDatesForDisplay = useCallback(() => {
    const formatRange = (phase: EventPhase): string => {
      const days = getDaysByPhase(phase);
      if (days.length === 0) return '';
      
      if (days.length === 1) {
        // Format single datetime for display
        return formatDateTimeForDisplay(parseDateTimeString(days[0].date));
      }

      const range = getDateRange(phase);
      return range ? `${range.startDate} - ${range.endDate}` : '';
    };

    return {
      montagem: formatRange('montagem'),
      evento: formatRange('evento'),
      desmontagem: formatRange('desmontagem'),
    };
  }, [getDaysByPhase, getDateRange]);

  return {
    // State
    montagem,
    evento,
    desmontagem,
    
    // Actions
    addEventDay,
    removeEventDay,
    updateEventDay,
    clearPhase,
    setAllDays,
    
    // Utilities
    getAllDays,
    getDaysByPhase,
    getDateRange,
    hasAnyDays,
    validateDays,
    
    // Legacy compatibility
    convertFromLegacy,
    convertToLegacy,
    
    // Formatting
    formatDatesForDisplay,
  };
}

// Helper functions
function parseDateTimeString(dateTimeStr: string): Date {
  // Handle ISO datetime format (primary format)
  if (dateTimeStr.includes('T') || dateTimeStr.includes('Z')) {
    return new Date(dateTimeStr);
  }
  
  // Handle DD/MM/YYYY format for backwards compatibility
  if (dateTimeStr.includes('/')) {
    const [day, month, year] = dateTimeStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Default fallback
  return new Date(dateTimeStr);
}

function formatDateTimeForDisplay(date: Date): string {
  // Format as DD/MM/YYYY HH:mm for display
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function convertLegacyToEventDays(legacy: LegacyEventDates): { montagem: EventDay[]; evento: EventDay[]; desmontagem: EventDay[] } {
  const result = {
    montagem: [] as EventDay[],
    evento: [] as EventDay[],
    desmontagem: [] as EventDay[]
  };

  // Helper function to convert date to ISO datetime (assuming 9:00 AM default)
  const dateToISODateTime = (date: Date): string => {
    const dateTime = new Date(date);
    dateTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
    return dateTime.toISOString();
  };

  // Convert montagem
  if (legacy.setupStartDate && legacy.setupEndDate) {
    const startDate = new Date(legacy.setupStartDate);
    const endDate = new Date(legacy.setupEndDate);
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      result.montagem.push({
        date: dateToISODateTime(date),
        start: date.getTime() === startDate.getTime(),
        end: date.getTime() === endDate.getTime()
      });
    }
  } else if (legacy.setupDate) {
    result.montagem.push({
      date: dateToISODateTime(new Date(legacy.setupDate)),
      start: true,
      end: true
    });
  }

  // Convert evento
  if (legacy.preparationStartDate && legacy.preparationEndDate) {
    const startDate = new Date(legacy.preparationStartDate);
    const endDate = new Date(legacy.preparationEndDate);
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      result.evento.push({
        date: dateToISODateTime(date),
        start: date.getTime() === startDate.getTime(),
        end: date.getTime() === endDate.getTime()
      });
    }
  } else if (legacy.preparationDate) {
    result.evento.push({
      date: dateToISODateTime(new Date(legacy.preparationDate)),
      start: true,
      end: true
    });
  }

  // Convert desmontagem
  if (legacy.finalizationStartDate && legacy.finalizationEndDate) {
    const startDate = new Date(legacy.finalizationStartDate);
    const endDate = new Date(legacy.finalizationEndDate);
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      result.desmontagem.push({
        date: dateToISODateTime(date),
        start: date.getTime() === startDate.getTime(),
        end: date.getTime() === endDate.getTime()
      });
    }
  } else if (legacy.finalizationDate) {
    result.desmontagem.push({
      date: dateToISODateTime(new Date(legacy.finalizationDate)),
      start: true,
      end: true
    });
  }

  return result;
}

export default useEventDays;