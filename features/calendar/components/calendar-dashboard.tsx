import { CalendarIcon, Loader2, AlertCircle } from "lucide-react"
import { getYear } from "date-fns"

import { YearCalendar } from "@/features/calendar/components/year-calendar"
import { CalendarLegend } from "@/features/calendar/components/calendar-legend"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEventos } from "@/features/eventos/api/query/use-eventos"

const CalendarDashboard = () => {
    const { data: eventos, isLoading, error } = useEventos()
    const currentYear = getYear(new Date())

    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Erro ao carregar eventos: {error.message}</AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                    Calendário {currentYear}
                </h1>

                {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Carregando eventos...</span>
                    </div>
                )}
            </header>

            <CalendarLegend />

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground">Carregando calendário...</p>
                    </div>
                </div>
            ) : (
                <YearCalendar year={currentYear} eventos={eventos || []} />
            )}
        </div>
    )
}

export default CalendarDashboard
export { YearCalendar, CalendarLegend }
