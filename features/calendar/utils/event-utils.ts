import type { Event, EventInterval, EventType } from "../types/event";
import { EVENT_TYPES } from "../constants/calendar";

interface DateRange {
  startDate?: string;
  endDate?: string;
}

const createEventInterval = (
  evento: Event,
  dateRange: DateRange,
  type: EventType
): EventInterval | null => {
  if (!dateRange.startDate || !dateRange.endDate) return null;

  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  end.setDate(end.getDate() + 1);

  const eventTypeConfig = EVENT_TYPES[type];

  return {
    start,
    end,
    label: eventTypeConfig.label,
    color: eventTypeConfig.color,
    title: `${evento.name} (${eventTypeConfig.label})`,
    type,
    description: evento.description,
    eventId: evento.id,
  };
};

export const getEventIntervals = (evento: Event): EventInterval[] => {
  const intervals: EventInterval[] = [];

  const dateRanges: Array<{ range: DateRange; type: EventType }> = [
    {
      range: {
        startDate: evento.setupStartDate,
        endDate: evento.setupEndDate,
      },
      type: "montagem",
    },
    {
      range: {
        startDate: evento.preparationStartDate,
        endDate: evento.preparationEndDate,
      },
      type: "preparacao",
    },
    {
      range: {
        startDate: evento.finalizationStartDate,
        endDate: evento.finalizationEndDate,
      },
      type: "finalizacao",
    },
  ];

  dateRanges.forEach(({ range, type }) => {
    const interval = createEventInterval(evento, range, type);
    if (interval) {
      intervals.push(interval);
    }
  });

  return intervals;
};
