/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import type { EventInterval } from "@/features/calendar/types/event"
import { EVENT_TYPES } from "@/features/calendar/constants/calendar"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

interface EventDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDay: Date | null
    selectedEvents: EventInterval[]
}

type EventWithExtras = EventInterval & {
    venue?: string
    address?: string
    categories?: string[]
}

const hasExtras = (event: EventInterval): event is EventWithExtras =>
    'venue' in event || 'address' in event || 'categories' in event

export const EventDialog = ({ open, onOpenChange, selectedDay, selectedEvents }: EventDialogProps) => {
    const formatDate = (date: Date) => {
        return date.toLocaleDateString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {selectedDay && formatDate(selectedDay)}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                    {selectedEvents.length === 0 ? (
                        <div className="text-center py-8">
                            <Clock className="h-8 w-8 text-foreground mx-auto mb-2" />
                            <p className="text-foreground text-sm">Nenhum compromisso para este dia.</p>
                        </div>
                    ) : (
                        selectedEvents.map((event, idx) => {
                            const eventConfig = EVENT_TYPES[event.type]
                            return (
                                <Accordion type="single" collapsible key={`${event.eventId}-${event.type}-${idx}`}>
                                    <AccordionItem value="detalhes">
                                        <AccordionTrigger className="border rounded-lg p-4 w-full flex items-start justify-between gap-2 mb-2 bg-background">
                                            <div className="flex flex-col items-start">
                                                <h3 className="font-semibold text-sm leading-tight text-foreground">{event.title}</h3>
                                                <span className="text-xs text-muted-foreground">{event.label}</span>
                                            </div>
                                            <Badge variant="secondary" className={`${eventConfig.color} text-foreground text-xs`}>
                                                {event.label}
                                            </Badge>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="text-xs text-foreground space-y-1">
                                                {event.description && <div><span className="font-medium">Descrição:</span> {event.description}</div>}
                                                {event.start && <div><span className="font-medium">Início:</span> {String(event.start)}</div>}
                                                {event.end && <div><span className="font-medium">Fim:</span> {String(event.end)}</div>}
                                                {hasExtras(event) && event.venue && (
                                                    <div><span className="font-medium">Local:</span> {event.venue}</div>
                                                )}
                                                {hasExtras(event) && event.address && (
                                                    <div><span className="font-medium">Endereço:</span> {event.address}</div>
                                                )}
                                                {hasExtras(event) && Array.isArray(event.categories) && event.categories.length > 0 && (
                                                    <div><span className="font-medium">Categorias:</span> {event.categories.join(', ')}</div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            )
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
