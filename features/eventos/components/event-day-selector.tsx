'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronDown, Sun, Moon, Clock } from 'lucide-react'

export interface EventDay {
    id: string
    label: string
    date: string
    type: string
    period?: 'diurno' | 'noturno' | 'dia_inteiro'
}

interface EventDaySelector {
    eventDays: EventDay[]
    selectedDay: string
    onSelectDay: (dayId: string) => void
    placeholder?: string
    label?: string
    disabled?: boolean
    participantCount?: number
    showParticipantCount?: boolean
}

export function EventDaySelector({
    eventDays,
    selectedDay,
    onSelectDay,
    placeholder = "Selecionar turno",
    label,
    disabled = false,
    participantCount,
    showParticipantCount = false
}: EventDaySelector) {
    const [popoverOpen, setPopoverOpen] = useState(false)

    // Função para obter ícone do período
    const getPeriodIcon = (period?: 'diurno' | 'noturno' | 'dia_inteiro') => {
        if (period === 'diurno') {
            return <Sun className="h-3 w-3 text-yellow-500" />
        } else if (period === 'noturno') {
            return <Moon className="h-3 w-3 text-blue-500" />
        } else if (period === 'dia_inteiro') {
            return <Clock className="h-3 w-3 text-purple-500" />
        }
        return null
    }

    // Função para obter cor da badge baseada no tipo
    const getTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (type) {
            case 'montagem':
                return 'default'
            case 'evento':
                return 'secondary'
            case 'desmontagem':
            case 'finalizacao':
                return 'destructive'
            default:
                return 'outline'
        }
    }

    const selectedEventDay = eventDays.find(d => d.id === selectedDay)

    return (
        <div className="space-y-3">
            {label && (
                <label className="text-sm font-medium">{label}</label>
            )}

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen} >
                <PopoverTrigger asChild className='bg-white'>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        className="w-full justify-between"
                        disabled={disabled}
                    >
                        {selectedDay ? (
                            <div className="flex items-center gap-2">
                                {selectedEventDay && (
                                    <div className="flex items-center gap-2">
                                        {getPeriodIcon(selectedEventDay.period)}
                                        <span>{selectedEventDay.label}</span>
                                        <Badge variant={getTypeBadgeVariant(selectedEventDay.type)} className="text-xs">
                                            {selectedEventDay.type.toUpperCase()}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ) : (
                            placeholder
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-full p-0" align="start" >
                    <Command className='bg-white'>
                        <CommandInput placeholder="Buscar turno..." />
                        <CommandEmpty>Nenhum turno encontrado.</CommandEmpty>
                        <CommandList>
                            <CommandGroup>
                                {eventDays.map((day) => (
                                    <CommandItem
                                        key={day.id}
                                        value={day.id}
                                        onSelect={(value) => {
                                            onSelectDay(value)
                                            setPopoverOpen(false)
                                        }}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            {getPeriodIcon(day.period)}
                                            <span className="flex-1">{day.label}</span>
                                            <Badge variant={getTypeBadgeVariant(day.type)} className="text-xs">
                                                {day.type.toUpperCase()}
                                            </Badge>
                                            {selectedDay === day.id && (
                                                <Check className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {showParticipantCount && participantCount !== undefined && selectedDay && (
                <div className="text-sm text-muted-foreground">
                    {participantCount} participante(s) {participantCount === 0 ? 'encontrado(s)' : 'encontrado(s)'}
                </div>
            )}
        </div>
    )
}