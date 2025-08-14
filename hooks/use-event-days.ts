import { useState, useCallback, useMemo } from "react";
import {
  EventDay,
  EventPhase,
  EventDayRange,
  LegacyEventDates,
  EventWithFlexibleDays,
} from "@/public/types/event-days";
import { SimpleEventDay } from "@/public/types/simple-event-days";

export interface UseEventDaysReturn {
  // State
  montagem: SimpleEventDay[];
  evento: SimpleEventDay[];
  desmontagem: SimpleEventDay[];

  // Actions
  addEventDay: (phase: EventPhase, day: EventDay) => void;
  removeEventDay: (phase: EventPhase, index: number) => void;
  updateEventDay: (phase: EventPhase, index: number, day: EventDay) => void;
  clearPhase: (phase: EventPhase) => void;
  setAllDays: (days: {
    montagem: SimpleEventDay[];
    evento: SimpleEventDay[];
    desmontagem: SimpleEventDay[];
  }) => void;

  // Utilities
  getAllDays: () => SimpleEventDay[];
  getDaysByPhase: (phase: EventPhase) => SimpleEventDay[];
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

  // Sync utilities
  getSyncedPeriods: (phase: EventPhase) => {
    [idSync: string]: SimpleEventDay[];
  };
  getPeriodsGrouped: (phase: EventPhase) => {
    synced: { [idSync: string]: SimpleEventDay[] };
    individual: SimpleEventDay[];
  };
}

export function useEventDays(
  initialData?: Partial<EventWithFlexibleDays>
): UseEventDaysReturn {
  // Initialize state from props or empty arrays
  const [montagem, setMontagem] = useState<SimpleEventDay[]>(
    initialData?.montagem || []
  );
  const [evento, setEvento] = useState<SimpleEventDay[]>(
    initialData?.evento || []
  );
  const [desmontagem, setDesmontagem] = useState<SimpleEventDay[]>(
    initialData?.desmontagem || []
  );

  // Initialize from legacy data if new structure is empty
  const initializeFromLegacy = useCallback(() => {
    if (
      initialData &&
      montagem.length === 0 &&
      evento.length === 0 &&
      desmontagem.length === 0
    ) {
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
    // Convert EventDay to SimpleEventDay
    const simpleDay: SimpleEventDay = {
      date: day.date,
      period: 'diurno' as const
    };
    setter((prev) => [...prev, simpleDay]);
  }, []);

  const removeEventDay = useCallback((phase: EventPhase, index: number) => {
    const setter = getSetterForPhase(phase);
    setter((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateEventDay = useCallback(
    (phase: EventPhase, index: number, day: EventDay) => {
      const setter = getSetterForPhase(phase);
      // Convert EventDay to SimpleEventDay
      const simpleDay: SimpleEventDay = {
        date: day.date,
        period: 'diurno' as const
      };
      setter((prev) => prev.map((item, i) => (i === index ? simpleDay : item)));
    },
    []
  );

  const clearPhase = useCallback((phase: EventPhase) => {
    const setter = getSetterForPhase(phase);
    setter([]);
  }, []);

  const setAllDays = useCallback(
    (days: {
      montagem: SimpleEventDay[];
      evento: SimpleEventDay[];
      desmontagem: SimpleEventDay[];
    }) => {
      setMontagem(days.montagem);
      setEvento(days.evento);
      setDesmontagem(days.desmontagem);
    },
    []
  );

  // Helper function to get setter for phase
  const getSetterForPhase = (phase: EventPhase) => {
    switch (phase) {
      case "montagem":
        return setMontagem;
      case "evento":
        return setEvento;
      case "desmontagem":
        return setDesmontagem;
      default:
        throw new Error(`Invalid phase: ${phase}`);
    }
  };

  // Utility functions
  const getAllDays = useCallback((): SimpleEventDay[] => {
    return [...montagem, ...evento, ...desmontagem];
  }, [montagem, evento, desmontagem]);

  const getDaysByPhase = useCallback(
    (phase: EventPhase): SimpleEventDay[] => {
      switch (phase) {
        case "montagem":
          return montagem;
        case "evento":
          return evento;
        case "desmontagem":
          return desmontagem;
        default:
          return [];
      }
    },
    [montagem, evento, desmontagem]
  );

  const getDateRange = useCallback(
    (phase: EventPhase): EventDayRange | null => {
      const days = getDaysByPhase(phase);
      if (days.length === 0) return null;

      // Sort dates and get first and last
      const sortedDates = days
        .map((day) => parseDateTimeString(day.date))
        .sort((a, b) => a.getTime() - b.getTime());

      return {
        startDate: formatDateTimeForDisplay(sortedDates[0]),
        endDate: formatDateTimeForDisplay(sortedDates[sortedDates.length - 1]),
        phase,
      };
    },
    [getDaysByPhase]
  );

  const hasAnyDays = useCallback((): boolean => {
    return montagem.length > 0 || evento.length > 0 || desmontagem.length > 0;
  }, [montagem.length, evento.length, desmontagem.length]);

  const validateDays = useCallback((): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];

    // Check if at least one phase has days
    if (!hasAnyDays()) {
      errors.push("Pelo menos uma fase deve ter dias definidos");
    }

    // Check for duplicate dates within each phase
    [
      { phase: "montagem", days: montagem },
      { phase: "evento", days: evento },
      { phase: "desmontagem", days: desmontagem },
    ].forEach(({ phase, days }) => {
      const dates = days.map((day) => day.date);
      const duplicates = dates.filter(
        (date, index) => dates.indexOf(date) !== index
      );
      if (duplicates.length > 0) {
        errors.push(
          `Fase ${phase} tem datas duplicadas: ${duplicates.join(", ")}`
        );
      }
    });

    // Check for valid period values
    [
      { phase: "montagem", days: montagem },
      { phase: "evento", days: evento },
      { phase: "desmontagem", days: desmontagem },
    ].forEach(({ phase, days }) => {
      days.forEach((day, index) => {
        if (!day.period || (day.period !== 'diurno' && day.period !== 'noturno')) {
          errors.push(
            `Dia ${day.date} na fase ${phase} deve ter um período válido (diurno ou noturno)`
          );
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [montagem, evento, desmontagem, hasAnyDays]);

  // Legacy conversion functions
  const convertFromLegacy = useCallback(
    (legacyDates: LegacyEventDates) => {
      const converted = convertLegacyToEventDays(legacyDates);
      setAllDays(converted);
    },
    [setAllDays]
  );

  const convertToLegacy = useCallback((): LegacyEventDates => {
    const montagemRange = getDateRange("montagem");
    const eventoRange = getDateRange("evento");
    const desmontagemRange = getDateRange("desmontagem");

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
      if (days.length === 0) return "";

      if (days.length === 1) {
        // Format single datetime for display
        return formatDateTimeForDisplay(parseDateTimeString(days[0].date));
      }

      const range = getDateRange(phase);
      return range ? `${range.startDate} - ${range.endDate}` : "";
    };

    return {
      montagem: formatRange("montagem"),
      evento: formatRange("evento"),
      desmontagem: formatRange("desmontagem"),
    };
  }, [getDaysByPhase, getDateRange]);

  // Sync utilities
  const getSyncedPeriods = useCallback(
    (phase: EventPhase) => {
      const days = getDaysByPhase(phase);
      const syncedGroups: { [idSync: string]: SimpleEventDay[] } = {};

      days.forEach((day) => {
        if (day.idSync) {
          if (!syncedGroups[day.idSync]) {
            syncedGroups[day.idSync] = [];
          }
          syncedGroups[day.idSync].push(day);
        }
      });

      return syncedGroups;
    },
    [getDaysByPhase]
  );

  const getPeriodsGrouped = useCallback(
    (phase: EventPhase) => {
      const days = getDaysByPhase(phase);
      const synced: { [idSync: string]: SimpleEventDay[] } = {};
      const individual: SimpleEventDay[] = [];

      days.forEach((day) => {
        if (day.idSync) {
          if (!synced[day.idSync]) {
            synced[day.idSync] = [];
          }
          synced[day.idSync].push(day);
        } else {
          individual.push(day);
        }
      });

      return { synced, individual };
    },
    [getDaysByPhase]
  );

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

    // Sync utilities
    getSyncedPeriods,
    getPeriodsGrouped,
  };
}

// Helper functions
function parseDateTimeString(dateTimeStr: string): Date {
  // Handle ISO datetime format (primary format)
  if (dateTimeStr.includes("T") || dateTimeStr.includes("Z")) {
    return new Date(dateTimeStr);
  }

  // Handle DD/MM/YYYY format for backwards compatibility
  if (dateTimeStr.includes("/")) {
    const [day, month, year] = dateTimeStr.split("/");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Default fallback
  return new Date(dateTimeStr);
}

function formatDateTimeForDisplay(date: Date): string {
  // Format as DD/MM/YYYY HH:mm for display
  return (
    date.toLocaleDateString("pt-BR") +
    " " +
    date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

function convertLegacyToEventDays(legacy: LegacyEventDates): {
  montagem: SimpleEventDay[];
  evento: SimpleEventDay[];
  desmontagem: SimpleEventDay[];
} {
  const result = {
    montagem: [] as SimpleEventDay[],
    evento: [] as SimpleEventDay[],
    desmontagem: [] as SimpleEventDay[],
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
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      result.montagem.push({
        date: dateToISODateTime(date),
        period: 'diurno' as const,
      });
    }
  } else if (legacy.setupDate) {
    result.montagem.push({
      date: dateToISODateTime(new Date(legacy.setupDate)),
      period: 'diurno' as const,
    });
  }

  // Convert evento
  if (legacy.preparationStartDate && legacy.preparationEndDate) {
    const startDate = new Date(legacy.preparationStartDate);
    const endDate = new Date(legacy.preparationEndDate);
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      result.evento.push({
        date: dateToISODateTime(date),
        period: 'diurno' as const,
      });
    }
  } else if (legacy.preparationDate) {
    result.evento.push({
      date: dateToISODateTime(new Date(legacy.preparationDate)),
      period: 'diurno' as const,
    });
  }

  // Convert desmontagem
  if (legacy.finalizationStartDate && legacy.finalizationEndDate) {
    const startDate = new Date(legacy.finalizationStartDate);
    const endDate = new Date(legacy.finalizationEndDate);
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      result.desmontagem.push({
        date: dateToISODateTime(date),
        period: 'diurno' as const,
      });
    }
  } else if (legacy.finalizationDate) {
    result.desmontagem.push({
      date: dateToISODateTime(new Date(legacy.finalizationDate)),
      period: 'diurno' as const,
    });
  }

  return result;
}

export default useEventDays;
