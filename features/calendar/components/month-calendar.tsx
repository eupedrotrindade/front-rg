"use client"

import { useMemo } from "react"
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, getMonth, isWithinInterval } from "date-fns"
import type { EventInterval } from "../types/event"
import { MONTH_NAMES, WEEK_DAYS } from "../constants/calendar"

interface MonthCalendarProps {
    monthDate: Date
    allIntervals: EventInterval[]
    today: Date
    isCurrentMonth: boolean
    onDayClick: (day: Date, events: EventInterval[]) => void
}

export const MonthCalendar = ({ monthDate, allIntervals, today, isCurrentMonth, onDayClick }: MonthCalendarProps) => {
    const { days, blanks } = useMemo(() => {
        const monthDays = eachDayOfInterval({
            start: startOfMonth(monthDate),
            end: endOfMonth(monthDate),
        })

        const firstDayOfWeek = getDay(startOfMonth(monthDate))
        const monthBlanks = Array.from({ length: firstDayOfWeek }, (_, i) => i)

        return { days: monthDays, blanks: monthBlanks }
    }, [monthDate])

    const monthName = MONTH_NAMES[getMonth(monthDate)]

    return (
        <div
            className={`flex flex-col items-center transition-all duration-200 ${isCurrentMonth ? "ring-2 ring-primary rounded-lg bg-accent/30 p-2" : "hover:bg-accent/10 rounded-lg p-2"
                }`}
        >
            <h3 className="font-semibold mb-3 text-sm text-center">{monthName}</h3>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEK_DAYS.map((day, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground text-center block w-8 font-medium">
                        {day}
                    </span>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month start */}
                {blanks.map((blank) => (
                    <div key={`blank-${blank}`} className="w-8 h-8" />
                ))}

                {/* Month days */}
                {days.map((day, i) => {
                    const dayEvents = allIntervals.filter((interval) =>
                        isWithinInterval(day, { start: interval.start, end: interval.end }),
                    )

                    const isToday = day.toDateString() === today.toDateString()
                    const hasEvents = dayEvents.length > 0

                    return (
                        <button
                            key={i}
                            className={`
                w-8 h-8 flex flex-col items-center justify-center 
                border border-muted rounded transition-all duration-150
                bg-background hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-primary
                ${isToday ? "border-primary ring-1 ring-primary font-semibold" : ""}
                ${hasEvents ? "cursor-pointer" : "cursor-default"}
              `}
                            onClick={() => hasEvents && onDayClick(day, dayEvents)}
                            disabled={!hasEvents}
                            type="button"
                            aria-label={`${day.getDate()} de ${monthName}${hasEvents ? `, ${dayEvents.length} evento${dayEvents.length > 1 ? "s" : ""}` : ""}`}
                        >
                            <span className={`text-[11px] leading-none ${isToday ? "text-primary" : "text-foreground"}`}>
                                {day.getDate()}
                            </span>

                            {/* Event indicators */}
                            {hasEvents && (
                                <div className="flex gap-0.5 mt-0.5" aria-hidden="true">
                                    {dayEvents.slice(0, 3).map((event, j) => (
                                        <span
                                            key={j}
                                            className={`w-1.5 h-1.5 rounded-full ${event.color}`}
                                            title={`${event.title} - ${event.label}`}
                                        />
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <span className="text-[8px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
