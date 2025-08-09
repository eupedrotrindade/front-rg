import { useCallback } from "react"
import type { EventDay } from "../types"

interface DayTabsProps {
    eventDays: EventDay[]
    selectedDay: string
    onDaySelect: (day: string) => void
    getParticipantesPorDia: (day: string) => any[]
}

export function DayTabs({ eventDays, selectedDay, onDaySelect, getParticipantesPorDia }: DayTabsProps) {
    const getTabColor = useCallback((type: string, isActive: boolean) => {
        if (isActive) {
            switch (type) {
                case 'setup':
                    return 'border-yellow-500 text-yellow-600 bg-yellow-50'
                case 'preparation':
                    return 'border-blue-500 text-blue-600 bg-blue-50'
                case 'finalization':
                    return 'border-purple-500 text-purple-600 bg-purple-50'
                default:
                    return 'border-purple-500 text-purple-600 bg-purple-50'
            }
        } else {
            switch (type) {
                case 'setup':
                    return 'hover:text-yellow-700 hover:border-yellow-300'
                case 'preparation':
                    return 'hover:text-blue-700 hover:border-blue-300'
                case 'finalization':
                    return 'hover:text-purple-700 hover:border-purple-300'
                default:
                    return 'hover:text-gray-700 hover:border-gray-300'
            }
        }
    }, [])

    return (
        <div className="mb-8">
            <div className="border-b border-gray-200 bg-white rounded-t-lg">
                <nav className="-mb-px flex space-x-2 px-6 overflow-x-auto">
                    {eventDays.map((day) => {
                        const participantesNoDia = getParticipantesPorDia(day.id).length
                        const isActive = selectedDay === day.id

                        return (
                            <button
                                key={day.id}
                                onClick={() => onDaySelect(day.id)}
                                className={`border-b-2 py-3 px-3 text-xs font-medium transition-colors duration-200 whitespace-nowrap rounded-t-lg flex-shrink-0 ${
                                    isActive
                                        ? getTabColor(day.type, true)
                                        : `border-transparent text-gray-500 ${getTabColor(day.type, false)}`
                                }`}
                            >
                                {day.label} ({participantesNoDia})
                            </button>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}