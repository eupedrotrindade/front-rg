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
            ...defaultValues,
        },
    });

    // Observa o evento selecionado
    const selectedEventId = form.watch("eventId");
    const currentCpf = form.watch("cpf");

    // Busca credenciais e participantes do evento selecionado
    const { data: wristbands } = useEventWristbandsByEvent(selectedEventId || "");
    const { data: participants } = useEventParticipantsByEvent(selectedEventId || "");

    const wristbandsArray = Array.isArray(wristbands) ? wristbands : [];
    const participantsArray = Array.isArray(participants) ? participants : [];

    // Função para buscar o modelo de pulseira correspondente
    const getWristbandModel = (wristbandModelId: string) =>
        wristbandModelsArray.find((model) => model.id === wristbandModelId);

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