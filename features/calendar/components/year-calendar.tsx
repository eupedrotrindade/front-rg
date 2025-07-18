"use client"

import { useMemo, useState, useCallback } from "react"
import { startOfYear, endOfYear, eachMonthOfInterval } from "date-fns"
import type { Event, EventInterval } from "../types/event"
import { getEventIntervals } from "@/features/calendar/utils/event-utils"
import { MonthCalendar } from "@/features/calendar/components/month-calendar"
import { EventDialog } from "@/features/calendar/components/event-dialog"

interface YearCalendarProps {
    year: number
    eventos: Event[]
}

export const YearCalendar = ({ year, eventos }: YearCalendarProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)
    const [selectedEvents, setSelectedEvents] = useState<EventInterval[]>([])

    const { allIntervals, months, today } = useMemo(() => {
        const intervals = (eventos || []).flatMap(getEventIntervals)
        const yearMonths = eachMonthOfInterval({
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 11, 31)),
        })
        const currentDate = new Date()

        return {
            allIntervals: intervals,
            months: yearMonths,
            today: currentDate,
        }
    }, [eventos, year])

    const handleDayClick = useCallback((day: Date, events: EventInterval[]) => {
        setSelectedDay(day)
        setSelectedEvents(events)
        setDialogOpen(true)
    }, [])

    const handleDialogClose = useCallback((open: boolean) => {
        setDialogOpen(open)
        if (!open) {
            setSelectedDay(null)
            setSelectedEvents([])
        }
    }, [])

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                {months.map((monthDate, idx) => {
                    const isCurrentMonth =
                        monthDate.getFullYear() === today.getFullYear() && monthDate.getMonth() === today.getMonth()

                    return (
                        <MonthCalendar
                            key={idx}
                            monthDate={monthDate}
                            allIntervals={allIntervals}
                            today={today}
                            isCurrentMonth={isCurrentMonth}
                            onDayClick={handleDayClick}
                        />
                    )
                })}
            </div>

            <EventDialog
                open={dialogOpen}
                onOpenChange={handleDialogClose}
                selectedDay={selectedDay}
                selectedEvents={selectedEvents}
            />
        </>
    )
}
