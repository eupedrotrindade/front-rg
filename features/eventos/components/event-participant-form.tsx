import React from "react";
import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventParticipantSchema, EventParticipantSchema } from "@/features/eventos/schemas";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEventos } from "@/features/eventos/api/query/use-eventos";
import { useEventWristbandsByEvent } from "@/features/eventos/api/query/use-event-wristbands";
import { useEventParticipantsByEvent } from "@/features/eventos/api/query/use-event-participants-by-event";
import { useEventWristbandModels } from "@/features/eventos/api/query/use-event-wristband-models";
import { formatCpf, formatPhone } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { useCallback } from "react";

interface EventParticipantFormProps {
    defaultValues?: Partial<EventParticipantSchema> & { id?: string };
    onSubmit: (data: EventParticipantSchema) => void;
    loading?: boolean;
    isEditing?: boolean;
}

const EventParticipantForm = ({ defaultValues, onSubmit, loading, isEditing = false }: EventParticipantFormProps) => {
    const { data: eventos } = useEventos();
    const eventosArray = Array.isArray(eventos) ? eventos : [];
    const { data: wristbandModels } = useEventWristbandModels();
    const wristbandModelsArray = Array.isArray(wristbandModels) ? wristbandModels : [];

    const form = useForm<FieldValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(eventParticipantSchema) as any,
        defaultValues: {
            presenceConfirmed: false,
            certificateIssued: false,
            daysWork: [],
            ...defaultValues,
        },
    });

    // Observa o evento selecionado
    const selectedEventId = form.watch("eventId");
    const currentCpf = form.watch("cpf");
    const currentDaysWork = form.watch("daysWork");

    // Busca credenciais e participantes do evento selecionado
    const { data: wristbands } = useEventWristbandsByEvent(selectedEventId || "");
    const { data: participants } = useEventParticipantsByEvent(selectedEventId || "");

    const wristbandsArray = Array.isArray(wristbands) ? wristbands : [];
    const participantsArray = Array.isArray(participants) ? participants : [];

    // Função para buscar o modelo de pulseira correspondente
    const getWristbandModel = (wristbandModelId: string) =>
        wristbandModelsArray.find((model) => model.id === wristbandModelId);

    // Função para categorizar dias de trabalho
    const categorizeDaysWork = useCallback((daysWork: string[], eventId: string) => {
        const evento = eventosArray.find(e => e.id === eventId);
        if (!evento) return { setup: [], preparation: [], finalization: [] };

        const categorized = {
            setup: [] as string[],
            preparation: [] as string[],
            finalization: [] as string[]
        };

        daysWork.forEach(day => {
            // Normalizar a data do dia para o início do dia
            const dayDate = new Date(day.split('/').reverse().join('-'));
            dayDate.setHours(0, 0, 0, 0);

            // Verificar se o dia está no período de montagem
            if (evento.setupStartDate && evento.setupEndDate) {
                const startDate = new Date(evento.setupStartDate);
                const endDate = new Date(evento.setupEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.setup.push(day);
                    return;
                }
            }

            // Verificar se o dia está no período de preparação/evento
            if (evento.preparationStartDate && evento.preparationEndDate) {
                const startDate = new Date(evento.preparationStartDate);
                const endDate = new Date(evento.preparationEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.preparation.push(day);
                    return;
                }
            }

            // Verificar se o dia está no período de finalização
            if (evento.finalizationStartDate && evento.finalizationEndDate) {
                const startDate = new Date(evento.finalizationStartDate);
                const endDate = new Date(evento.finalizationEndDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (dayDate >= startDate && dayDate <= endDate) {
                    categorized.finalization.push(day);
                    return;
                }
            }
        });

        return categorized;
    }, [eventosArray]);

    // Função para gerar lista de datas disponíveis a partir dos períodos do evento
    const getAvailableDates = useCallback((phase?: string): string[] => {
        if (!selectedEventId) return [];

        const evento = eventosArray.find(e => e.id === selectedEventId);
        if (!evento) return [];

        const availableDates: string[] = [];

        // Se uma fase específica foi solicitada, retornar apenas as datas dessa fase
        if (phase) {
            let startDate: string | undefined;
            let endDate: string | undefined;

            switch (phase) {
                case "preparacao":
                    startDate = evento.preparationStartDate;
                    endDate = evento.preparationEndDate;
                    break;
                case "montagem":
                    startDate = evento.setupStartDate;
                    endDate = evento.setupEndDate;
                    break;
                case "finalizacao":
                    startDate = evento.finalizationStartDate;
                    endDate = evento.finalizationEndDate;
                    break;
                default:
                    return [];
            }

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                // Normalizar as datas para o início do dia
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                const currentDate = new Date(start);

                while (currentDate <= end) {
                    const formattedDate = currentDate.toLocaleDateString('pt-BR');
                    availableDates.push(formattedDate);
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            return availableDates.sort();
        }

        // Se nenhuma fase foi especificada, retornar todas as datas
        const periods = [];

        if (evento.setupStartDate && evento.setupEndDate) {
            periods.push({ start: evento.setupStartDate, end: evento.setupEndDate });
        }
        if (evento.preparationStartDate && evento.preparationEndDate) {
            periods.push({ start: evento.preparationStartDate, end: evento.preparationEndDate });
        }
        if (evento.finalizationStartDate && evento.finalizationEndDate) {
            periods.push({ start: evento.finalizationStartDate, end: evento.finalizationEndDate });
        }

        periods.forEach(period => {
            const startDate = new Date(period.start);
            const endDate = new Date(period.end);
            // Normalizar as datas para o início do dia
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const formattedDate = currentDate.toLocaleDateString('pt-BR');
                availableDates.push(formattedDate);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        return availableDates.sort();
    }, [selectedEventId, eventosArray]);

    // Função para verificar se há períodos definidos
    const hasDefinedPeriods = useCallback((): boolean => {
        if (!selectedEventId) return false;
        const evento = eventosArray.find(e => e.id === selectedEventId);
        if (!evento) return false;

        return !!(evento.setupStartDate && evento.setupEndDate) ||
            !!(evento.preparationStartDate && evento.preparationEndDate) ||
            !!(evento.finalizationStartDate && evento.finalizationEndDate);
    }, [selectedEventId, eventosArray]);

    // Função para alternar seleção de data
    const toggleDateSelection = useCallback((date: string) => {
        const currentDates = [...(currentDaysWork || [])];
        const dateIndex = currentDates.indexOf(date);
        if (dateIndex > -1) {
            currentDates.splice(dateIndex, 1);
        } else {
            currentDates.push(date);
        }
        form.setValue("daysWork", currentDates.sort());
    }, [currentDaysWork, form]);

    // Validação de CPF duplicado
    const isCpfDuplicate = () => {
        if (!selectedEventId || !currentCpf) return false;

        console.log("🔍 Verificando CPF duplicado:", {
            currentCpf,
            selectedEventId,
            totalParticipants: participantsArray.length,
            isEditing
        });

        const existingParticipant = participantsArray.find(
            participant => {
                const isSameCpf = participant.cpf === currentCpf;
                const isSameEvent = participant.eventId === selectedEventId;
                const isNotSelf = !isEditing || participant.id !== defaultValues?.id;

                console.log("🔍 Verificando participante:", {
                    participantId: participant.id,
                    participantCpf: participant.cpf,
                    participantEventId: participant.eventId,
                    isSameCpf,
                    isSameEvent,
                    isNotSelf,
                    isDuplicate: isSameCpf && isSameEvent && isNotSelf
                });

                return isSameCpf && isSameEvent && isNotSelf;
            }
        );

        const isDuplicate = !!existingParticipant;
        console.log("🔍 Resultado da validação:", isDuplicate);

        return isDuplicate;
    };

    const handleSubmit = (data: FieldValues) => {
        console.log("🚀 Tentando submeter formulário:", {
            cpf: data.cpf,
            eventId: data.eventId,
            isCpfDuplicate: isCpfDuplicate()
        });

        // Verificar CPF duplicado antes de submeter
        if (isCpfDuplicate()) {
            console.log("❌ CPF duplicado detectado, bloqueando submissão");
            form.setError("cpf", {
                type: "manual",
                message: "CPF já cadastrado para este evento"
            });
            return;
        }

        console.log("✅ Validação passou, enviando dados");
        onSubmit(data as EventParticipantSchema);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel>Evento *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione um evento" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {eventosArray.map((evento) => (
                                        <SelectItem key={evento.id} value={evento.id}>
                                            {evento.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="wristbandId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Credencial *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading || !selectedEventId}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={selectedEventId ? "Selecione uma credencial" : "Selecione um evento primeiro"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {wristbandsArray.map((wristband) => {
                                        const model = getWristbandModel(wristband.wristbandModelId);
                                        const event = model ? eventosArray.find(e => e.id === model.eventId) : undefined;
                                        return (
                                            <SelectItem key={wristband.id} value={wristband.id}>
                                                {wristband.code} - {model?.credentialType || '-'} - {model?.color || '-'} {event ? `(${event.name})` : ''}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome *</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="Nome completo" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CPF *</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        disabled={loading}
                                        placeholder="000.000.000-00"
                                        value={formatCpf(field.value || '')}
                                        onChange={(e) => {
                                            const formattedValue = formatCpf(e.target.value);
                                            field.onChange(formattedValue);
                                            // Limpar erro quando o usuário digitar
                                            if (form.formState.errors.cpf) {
                                                form.clearErrors("cpf");
                                            }
                                        }}
                                        className={isCpfDuplicate() ? "border-destructive" : ""}
                                    />
                                </FormControl>
                                <FormMessage />
                                {isCpfDuplicate() && (
                                    <p className="text-sm text-destructive font-medium">
                                        ⚠️ CPF já cadastrado para este evento
                                    </p>
                                )}
                                {currentCpf && selectedEventId && !isCpfDuplicate() && (
                                    <p className="text-sm text-green-600">
                                        ✅ CPF disponível para este evento
                                    </p>
                                )}
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" {...field} disabled={loading} placeholder="email@exemplo.com" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        disabled={loading}
                                        placeholder="(11) 99999-9999"
                                        value={formatPhone(field.value || '')}
                                        onChange={(e) => {
                                            const formattedValue = formatPhone(e.target.value);
                                            field.onChange(formattedValue);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cargo</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={loading} placeholder="Desenvolvedor, Designer, etc." />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Empresa *</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="Nome da empresa" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="shirtSize"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tamanho da Camiseta</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tamanho" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="PP">PP</SelectItem>
                                    <SelectItem value="P">P</SelectItem>
                                    <SelectItem value="M">M</SelectItem>
                                    <SelectItem value="G">G</SelectItem>
                                    <SelectItem value="GG">GG</SelectItem>
                                    <SelectItem value="XG">XG</SelectItem>
                                    <SelectItem value="XXG">XXG</SelectItem>
                                    <SelectItem value="EXG">EXG</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Dias de Trabalho */}
                <FormField
                    control={form.control}
                    name="daysWork"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Dias de Trabalho
                            </FormLabel>
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">

                                {selectedEventId && hasDefinedPeriods() ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                                            <strong>Selecione as datas dos períodos do evento:</strong>
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-48 overflow-y-auto border rounded-lg p-4 bg-white">
                                            {/* Preparação */}
                                            <div>
                                                <p className="text-xs font-semibold text-blue-700 mb-2">Preparação</p>
                                                <div className="flex flex-col gap-2">

                                                    {getAvailableDates("preparacao").map((date) => (
                                                        <Button
                                                            key={date}
                                                            type="button"
                                                            variant={field.value?.includes(date) ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => toggleDateSelection(date)}
                                                            disabled={loading}
                                                            className={`text-xs transition-all duration-200 ${field.value?.includes(date)
                                                                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                                                                : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                                                                }`}
                                                        >
                                                            {date}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Montagem */}
                                            <div>
                                                <p className="text-xs font-semibold text-green-700 mb-2">Montagem</p>
                                                <div className="flex flex-col gap-2">
                                                    {getAvailableDates("montagem").map((date) => (
                                                        <Button
                                                            key={date}
                                                            type="button"
                                                            variant={field.value?.includes(date) ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => toggleDateSelection(date)}
                                                            disabled={loading}
                                                            className={`text-xs transition-all duration-200 ${field.value?.includes(date)
                                                                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                                                                : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                                                                }`}
                                                        >
                                                            {date}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Finalização */}
                                            <div>
                                                <p className="text-xs font-semibold text-purple-700 mb-2">Finalização</p>
                                                <div className="flex flex-col gap-2">
                                                    {getAvailableDates("finalizacao").map((date) => (
                                                        <Button
                                                            key={date}
                                                            type="button"
                                                            variant={field.value?.includes(date) ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => toggleDateSelection(date)}
                                                            disabled={loading}
                                                            className={`text-xs transition-all duration-200 ${field.value?.includes(date)
                                                                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md"
                                                                : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300 shadow-sm"
                                                                }`}
                                                        >
                                                            {date}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {field.value && field.value.length > 0 && (
                                            <div className="bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 rounded-lg p-4">
                                                <p className="text-sm text-purple-800 font-medium">
                                                    <strong>Datas selecionadas:</strong> {field.value.join(', ')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : selectedEventId ? (
                                    <div className="space-y-3">
                                        <Input
                                            type="text"
                                            value={field.value?.join(', ') || ''}
                                            onChange={(e) => {
                                                const dates = e.target.value.split(',').map(d => d.trim()).filter(d => d);
                                                field.onChange(dates);
                                            }}
                                            placeholder="Datas de trabalho (formato: DD/MM/AAAA, separadas por vírgula)"
                                            disabled={loading}
                                            className="bg-white border-blue-300 focus:border-purple-500 focus:ring-purple-500"
                                        />
                                        <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                                            <strong>Períodos permitidos:</strong> Selecione um evento primeiro para ver os períodos disponíveis
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                                        Selecione um evento primeiro para configurar os dias de trabalho
                                    </div>
                                )}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                                <Textarea {...field} disabled={loading} placeholder="Observações adicionais" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="presenceConfirmed"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Presença Confirmada</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                        Marque se a presença foi confirmada
                                    </div>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={loading}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="certificateIssued"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Certificado Emitido</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                        Marque se o certificado foi emitido
                                    </div>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={loading}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button
                        type="submit"
                        disabled={loading || isCpfDuplicate()}
                        className={`${isCpfDuplicate() ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#610e5c]'} text-white`}
                    >
                        {loading ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar Participante" : "Criar Participante")}
                    </Button>
                    {isCpfDuplicate() && (
                        <p className="text-sm text-destructive self-center">
                            Não é possível criar participante com CPF duplicado
                        </p>
                    )}
                </div>
            </form>
        </Form>
    );
};

export { EventParticipantForm }; 