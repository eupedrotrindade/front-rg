'use client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEventos } from '@/features/eventos/api/query/use-eventos';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';
import type { Event as EventType } from '@/features/eventos/types';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'active': return 'Ativo';
        case 'closed': return 'Encerrado';
        case 'canceled': return 'Cancelado';
        case 'draft': return 'Rascunho';
        default: return status;
    }
};

const getEtapaEvents = (evento: EventType) => {
    const etapas = [];
    if (evento.setupStartDate && evento.setupEndDate) {
        const start = evento.setupStartDate;
        const end = new Date(evento.setupEndDate);
        end.setDate(end.getDate() + 1);
        etapas.push({
            id: `${evento.id}-montagem`,
            title: `${evento.name} (Montagem)`,
            start,
            end: end.toISOString().slice(0, 10),
            backgroundColor: '#fbbf24', // amarelo
            borderColor: '#f59e0b',
            textColor: '#fff',
            extendedProps: { ...evento, etapa: 'Montagem' },
        });
    }
    if (evento.preparationStartDate && evento.preparationEndDate) {
        const start = evento.preparationStartDate;
        const end = new Date(evento.preparationEndDate);
        end.setDate(end.getDate() + 1);
        etapas.push({
            id: `${evento.id}-preparacao`,
            title: `${evento.name} (Evento)`,
            start,
            end: end.toISOString().slice(0, 10),
            backgroundColor: '#3b82f6', // azul
            borderColor: '#2563eb',
            textColor: '#fff',
            extendedProps: { ...evento, etapa: 'Evento' },
        });
    }
    if (evento.finalizationStartDate && evento.finalizationEndDate) {
        const start = evento.finalizationStartDate;
        const end = new Date(evento.finalizationEndDate);
        end.setDate(end.getDate() + 1);
        etapas.push({
            id: `${evento.id}-finalizacao`,
            title: `${evento.name} (Finalização)`,
            start,
            end: end.toISOString().slice(0, 10),
            backgroundColor: '#a21caf', // roxo
            borderColor: '#7c3aed',
            textColor: '#fff',
            extendedProps: { ...evento, etapa: 'Finalização' },
        });
    }
    return etapas;
};

const Legend = () => (
    <div className="flex gap-4 items-center mb-4">
        <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
            <span className="text-xs">Montagem</span>
        </span>
        <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span className="text-xs">Evento</span>
        </span>
        <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
            <span className="text-xs">Finalização</span>
        </span>
    </div>
);

const AgendaDashboard = () => {
    const { data: eventos } = useEventos();
    const [selectedEvent, setSelectedEvent] = useState<(EventType & { etapa?: string }) | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const events = Array.isArray(eventos) ? eventos.flatMap(getEtapaEvents) : [];

    const hasEventOnDate = (date: Date) => {
        return events.some(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const normalizedStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
            const normalizedEnd = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
            return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
        });
    };

    return (
        <Card className="p-4">
            <Legend />
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                locale="pt-br"
                events={events}
                height="auto"
                eventDisplay="block"
                eventClick={(info) => {
                    setSelectedEvent(info.event.extendedProps as EventType);
                    setDialogOpen(true);
                }}
                dayCellDidMount={(arg) => {
                    const hasEvent = hasEventOnDate(arg.date);

                    if (hasEvent) {
                        arg.el.style.backgroundColor = '#fef3c7'; // yellow-100
                        arg.el.style.borderColor = '#f59e0b'; // yellow-500
                    } else {
                        arg.el.style.backgroundColor = '#0000'; // gray-50
                    }

                    // Adiciona hover effect
                    arg.el.addEventListener('mouseenter', () => {
                        if (hasEvent) {
                            arg.el.style.backgroundColor = '#fde68a'; // yellow-200
                        } else {
                            arg.el.style.backgroundColor = '#0000'; // gray-100
                        }
                    });

                    arg.el.addEventListener('mouseleave', () => {
                        if (hasEvent) {
                            arg.el.style.backgroundColor = '#fef3c7'; // yellow-100
                        } else {
                            arg.el.style.backgroundColor = '#0000'; // gray-50
                        }
                    });
                }}
                eventClassNames="rounded-md shadow-sm"
                dayMaxEvents={3}
                moreLinkClick="popover"
                titleFormat={{ year: 'numeric', month: 'long' }}
            />
            <style jsx global>{`
                .fc .fc-toolbar.fc-header-toolbar {
                    background: #111;
                    color: #fff;
                    border-radius: 0.5rem;
                    padding: 0.5rem 1rem;
                }
                .fc .fc-toolbar-title {
                    color: #fff;
                }
                .fc .fc-button {
                    background: #222;
                    color: #fff;
                    border: none;
                }
                .fc .fc-button-active, .fc .fc-button-primary:not(:disabled).fc-button-active {
                    background: #333;
                    color: #fff;
                }
                .fc .fc-button:hover {
                    background: #333;
                    color: #fff;
                }
                .fc .fc-daygrid-day, .fc .fc-daygrid-day-frame {
                    background: #111 !important;
                }
                .fc .fc-daygrid-day.fc-day-today {
                    background: #222 !important;
                }
                .fc .fc-col-header-cell {
                    background: #111 !important;
                }
                .fc .fc-col-header-cell-cushion {
                    color: #fff !important;
                }
                .fc .fc-col-header-cell:nth-child(1), /* domingo */
                .fc .fc-col-header-cell:nth-child(7)  /* sábado */ {
                    background: #18181b !important;
                }
            `}</style>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    {selectedEvent && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-semibold">
                                    {selectedEvent.name}
                                </DialogTitle>
                                <DialogDescription className="space-y-3">
                                    {/* Resumo */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {selectedEvent.etapa === 'Montagem' && (
                                                <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" title="Montagem" />
                                            )}
                                            {selectedEvent.etapa === 'Evento' && (
                                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500" title="Evento" />
                                            )}
                                            {selectedEvent.etapa === 'Finalização' && (
                                                <span className="inline-block w-3 h-3 rounded-full bg-purple-500" title="Finalização" />
                                            )}
                                            <span className="text-xs font-medium">
                                                {selectedEvent.etapa ? `Etapa: ${selectedEvent.etapa}` : `Status: ${getStatusLabel(selectedEvent.status)}`}
                                            </span>
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <div><span className="font-medium">Nome:</span> {selectedEvent.name}</div>
                                            <div><span className="font-medium">Descrição:</span> {selectedEvent.description}</div>
                                            <div><span className="font-medium">Tipo:</span> {selectedEvent.type}</div>
                                            <div><span className="font-medium">Local:</span> {selectedEvent.venue}</div>
                                            <div><span className="font-medium">Início Montagem:</span> {selectedEvent.setupStartDate}</div>
                                            <div><span className="font-medium">Fim Montagem:</span> {selectedEvent.setupEndDate}</div>
                                            <div><span className="font-medium">Início Evento:</span> {selectedEvent.preparationStartDate}</div>
                                            <div><span className="font-medium">Fim Evento:</span> {selectedEvent.preparationEndDate}</div>
                                            <div><span className="font-medium">Início Desmontagem:</span> {selectedEvent.finalizationStartDate}</div>
                                            <div><span className="font-medium">Fim Desmontagem:</span> {selectedEvent.finalizationEndDate}</div>
                                        </div>
                                    </div>
                                    {/* Accordion para detalhes completos */}
                                    <Accordion type="single" collapsible className="mt-4">
                                        <AccordionItem value="detalhes">
                                            <AccordionTrigger>Ver todos os dados</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="text-xs space-y-1">
                                                    <div><span className="font-medium">ID:</span> {selectedEvent.id}</div>
                                                    <div><span className="font-medium">Slug:</span> {selectedEvent.slug}</div>
                                                    <div><span className="font-medium">Banner:</span> <a href={selectedEvent.bannerUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{selectedEvent.bannerUrl}</a></div>
                                                    <div><span className="font-medium">Total de Dias:</span> {selectedEvent.totalDays}</div>
                                                    <div><span className="font-medium">Início do Evento:</span> {selectedEvent.startDate}</div>
                                                    <div><span className="font-medium">Fim do Evento:</span> {selectedEvent.endDate}</div>
                                                    <div><span className="font-medium">Status:</span> {selectedEvent.status}</div>
                                                    <div><span className="font-medium">Visibilidade:</span> {selectedEvent.visibility}</div>
                                                    <div><span className="font-medium">Categorias:</span> {selectedEvent.categories && selectedEvent.categories.length > 0 ? selectedEvent.categories.join(', ') : '-'}</div>
                                                    <div><span className="font-medium">Capacidade:</span> {selected1000}</div>
                                                    <div><span className="font-medium">Link de Inscrição:</span> <a href={selectedEvent.registrationLink} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{selectedEvent.registrationLink}</a></div>
                                                    <div><span className="font-medium">Template QR Code:</span> {selectedEvent.qrCodeTemplate}</div>
                                                    <div><span className="font-medium">Ativo:</span> {selectedEvent.isActive ? 'Sim' : 'Não'}</div>
                                                    <div><span className="font-medium">Criado em:</span> {selectedEvent.createdAt}</div>
                                                    <div><span className="font-medium">Atualizado em:</span> {selectedEvent.updatedAt}</div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </DialogDescription>
                            </DialogHeader>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default AgendaDashboard;