import { useCallback, useMemo } from 'react'
import { formatEventDate } from '@/lib/utils'

export interface EventDay {
    id: string
    label: string
    date: string
    type: string
    period?: 'diurno' | 'noturno' | 'dia_inteiro'
}

export interface EventData {
    montagem?: any
    evento?: any
    desmontagem?: any
    setupStartDate?: string
    setupEndDate?: string
    preparationStartDate?: string
    preparationEndDate?: string
    finalizationStartDate?: string
    finalizationEndDate?: string
}

export function useEventDays(evento: EventData | undefined) {
    // Função helper para garantir que os dados sejam arrays válidos
    const ensureArray = useCallback((data: any): any[] => {
        if (!data) return []

        // Se for string, tentar fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data)
                return Array.isArray(parsed) ? parsed : []
            } catch (error) {
                console.warn('⚠️ Dados não são JSON válido:', data)
                return []
            }
        }

        // Se já for array, retornar como está
        if (Array.isArray(data)) {
            return data
        }

        // Se for objeto, tentar extrair dados
        if (typeof data === 'object' && data !== null) {
            console.warn('⚠️ Dados inesperados para dias do evento:', data)
            return []
        }

        return []
    }, [])

    // Função para extrair informações do shift ID
    const parseShiftId = useCallback((shiftId: string) => {
        const parts = shiftId.split('-')
        if (parts.length >= 5) {
            const year = parts[0]
            const month = parts[1]
            const day = parts[2]
            const stage = parts[3]
            const period = parts[4] as 'diurno' | 'noturno'

            return {
                dateISO: `${year}-${month}-${day}`,
                dateFormatted: formatEventDate(`${year}-${month}-${day}T00:00:00`),
                stage,
                period
            }
        }

        // Fallback para formato simples
        try {
            const dateFormatted = formatEventDate(shiftId.includes('T') ? shiftId : shiftId + 'T00:00:00')
            return {
                dateISO: shiftId,
                dateFormatted,
                stage: 'unknown',
                period: 'diurno' as 'diurno'
            }
        } catch (error) {
            return {
                dateISO: shiftId,
                dateFormatted: shiftId,
                stage: 'unknown',
                period: 'diurno' as 'diurno'
            }
        }
    }, [])

    // Função para gerar tabs dos dias do evento com suporte a turnos
    const getEventDays = useCallback((): EventDay[] => {
        console.log('🔧 getEventDays chamada, evento:', evento)

        if (!evento) {
            console.log('❌ Evento não encontrado')
            return []
        }

        const days: EventDay[] = []

        // Usar a nova estrutura SimpleEventDay se disponível com suporte a turnos
        const montagemData = ensureArray(evento.montagem)
        console.log('🔧 Processando montagem:', montagemData)
        if (montagemData.length > 0) {
            montagemData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        // ✅ CORREÇÃO: Extrair dateISO diretamente da string para evitar problemas de fuso horário
                        const dateISO = day.date.match(/^\d{4}-\d{2}-\d{2}/)
                            ? day.date.split('T')[0]
                            : new Date(day.date + 'T12:00:00').toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : 
                                           day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando montagem: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-montagem-${day.period}`,
                            label: `${dateStr} (MONTAGEM - ${periodLabel})`,
                            date: dateStr,
                            type: 'montagem',
                            period: day.period
                        })
                    } catch (error) {
                        console.error('❌ Erro ao processar data da montagem:', day, error)
                    }
                }
            })
        } else if (evento.setupStartDate && evento.setupEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.setupStartDate)
            const endDate = new Date(evento.setupEndDate)
            for (
                let date = new Date(startDate);
                date <= endDate;
                date.setDate(date.getDate() + 1)
            ) {
                // ✅ CORREÇÃO: Usar UTC para evitar problemas de fuso horário
                const year = date.getUTCFullYear()
                const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
                const day = date.getUTCDate().toString().padStart(2, '0')
                const dateISO = `${year}-${month}-${day}`
                const dateStr = `${day}/${month}/${year}`;

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                (['diurno', 'noturno'] as Array<'diurno' | 'noturno'>).forEach((period) => {
                    const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'
                    const periodTyped = period as 'diurno' | 'noturno'
                    days.push({
                        id: `${dateISO}-montagem-${periodTyped}`,
                        label: `${dateStr} (MONTAGEM - ${periodLabel})`,
                        date: dateStr,
                        type: 'montagem',
                        period: periodTyped
                    })
                })
            }
        }

        // Adicionar dias de Evento com suporte a turnos
        const eventoData = ensureArray(evento.evento)
        console.log('🔧 Processando evento:', eventoData)
        if (eventoData.length > 0) {
            eventoData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        // ✅ CORREÇÃO: Extrair dateISO diretamente da string para evitar problemas de fuso horário
                        const dateISO = day.date.match(/^\d{4}-\d{2}-\d{2}/)
                            ? day.date.split('T')[0]
                            : new Date(day.date + 'T12:00:00').toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : 
                                           day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando evento: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-evento-${day.period}`,
                            label: `${dateStr} (EVENTO - ${periodLabel})`,
                            date: dateStr,
                            type: 'evento',
                            period: day.period
                        })
                    } catch (error) {
                        console.error('❌ Erro ao processar data do evento:', day, error)
                    }
                }
            })
        } else if (evento.preparationStartDate && evento.preparationEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.preparationStartDate)
            const endDate = new Date(evento.preparationEndDate)
            for (
                let date = new Date(startDate);
                date <= endDate;
                date.setDate(date.getDate() + 1)
            ) {
                // ✅ CORREÇÃO: Usar UTC para evitar problemas de fuso horário
                const year = date.getUTCFullYear()
                const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
                const day = date.getUTCDate().toString().padStart(2, '0')
                const dateISO = `${year}-${month}-${day}`
                const dateStr = `${day}/${month}/${year}`;

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                (['diurno', 'noturno'] as Array<'diurno' | 'noturno'>).forEach(period => {
                    const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'

                    const periodTyped = period as 'diurno' | 'noturno'
                    days.push({
                        id: `${dateISO}-evento-${periodTyped}`,
                        label: `${dateStr} (EVENTO - ${periodTyped === 'diurno' ? 'Diurno' : 'Noturno'})`,
                        date: dateStr,
                        type: 'evento',
                        period: periodTyped
                    })
                })
            }
        }

        // Adicionar dias de finalização com suporte a turnos
        const desmontagemData = ensureArray(evento.desmontagem)
        console.log('🔧 Processando desmontagem:', desmontagemData)
        if (desmontagemData.length > 0) {
            desmontagemData.forEach(day => {
                if (day && day.date && day.period) {
                    try {
                        const dateStr = formatEventDate(day.date)
                        // ✅ CORREÇÃO: Extrair dateISO diretamente da string para evitar problemas de fuso horário
                        const dateISO = day.date.match(/^\d{4}-\d{2}-\d{2}/)
                            ? day.date.split('T')[0]
                            : new Date(day.date + 'T12:00:00').toISOString().split('T')[0]
                        const periodLabel = day.period === 'diurno' ? 'Diurno' : 
                                           day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'

                        console.log(`✅ Adicionando desmontagem: ${dateStr} - ${periodLabel}`)
                        days.push({
                            id: `${dateISO}-desmontagem-${day.period}`,
                            label: `${dateStr} (DESMONTAGEM - ${periodLabel})`,
                            date: dateStr,
                            type: 'desmontagem',
                            period: day.period
                        })
                    } catch (error) {
                        console.error('❌ Erro ao processar data da desmontagem:', day, error)
                    }
                }
            })
        } else if (evento.finalizationStartDate && evento.finalizationEndDate) {
            // Fallback para estrutura antiga com suporte a turnos
            const startDate = new Date(evento.finalizationStartDate)
            const endDate = new Date(evento.finalizationEndDate)
            for (
                let date = new Date(startDate);
                date <= endDate;
                date.setDate(date.getDate() + 1)
            ) {
                // ✅ CORREÇÃO: Usar UTC para evitar problemas de fuso horário
                const year = date.getUTCFullYear()
                const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
                const day = date.getUTCDate().toString().padStart(2, '0')
                const dateISO = `${year}-${month}-${day}`
                const dateStr = `${day}/${month}/${year}`;

                // Adicionar ambos os períodos (diurno e noturno) para cada data
                (['diurno', 'noturno'] as const).forEach((period) => {
                    const periodLabel = period === 'diurno' ? 'Diurno' : 'Noturno'

                    days.push({
                        id: `${dateISO}-finalizacao-${period}`,
                        label: `${dateStr} (FINALIZAÇÃO - ${periodLabel})`,
                        date: dateStr,
                        type: 'finalizacao',
                        period: period
                    })
                })
            }
        }

        console.log('🎯 Dias finais gerados:', days)
        return days.sort((a, b) => a.id.localeCompare(b.id))
    }, [evento, ensureArray])

    // Memoizar dias do evento
    const eventDays = useMemo(() => getEventDays(), [getEventDays])

    return {
        eventDays,
        parseShiftId,
        ensureArray
    }
}