import { EVENT_TYPES } from "@/features/calendar/constants/calendar"

export const CalendarLegend = () => (
    <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-muted/30 rounded-lg">
        <span className="text-sm font-medium text-muted-foreground">Legenda:</span>
        {Object.entries(EVENT_TYPES).map(([key, config]) => (
            <span key={key} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${config.color}`} aria-hidden="true" />
                <span className="text-sm">{config.label}</span>
            </span>
        ))}
    </div>
)
