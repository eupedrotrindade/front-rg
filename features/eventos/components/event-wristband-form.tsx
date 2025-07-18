import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventWristbandSchema, EventWristbandSchema } from "@/features/eventos/schemas";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEventWristbandModels } from "@/features/eventos/api/query/use-event-wristband-models";
import { useEventos } from "@/features/eventos/api/query/use-eventos";

interface EventWristbandFormProps {
    defaultValues?: Partial<EventWristbandSchema>;
    onSubmit: (data: EventWristbandSchema) => void;
    loading?: boolean;
    isEditing?: boolean;
}

const EventWristbandForm = ({ defaultValues, onSubmit, loading, isEditing = false }: EventWristbandFormProps) => {
    const { data: wristbandModels } = useEventWristbandModels();
    const { data: eventos } = useEventos();
    const wristbandModelsArray = Array.isArray(wristbandModels) ? wristbandModels : [];
    const eventosArray = Array.isArray(eventos) ? eventos : [];

    const form = useForm<EventWristbandSchema>({
        resolver: zodResolver(eventWristbandSchema),
        defaultValues: {
            isActive: true,
            isDistributed: false,
            ...defaultValues,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="wristbandModelId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Modelo de Pulseira *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o modelo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {wristbandModelsArray.map((model) => {
                                        const event = eventosArray.find(e => e.id === model.eventId);
                                        return (
                                            <SelectItem key={model.id} value={model.id}>
                                                {model.credentialType} - {model.color} {event ? `(${event.name})` : ''}
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
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código *</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="Código da credencial" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Credencial Ativa</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                        Marque se a credencial está ativa
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
                        name="isDistributed"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Distribuída</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                        Marque se a credencial foi distribuída
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
                    <Button type="submit" disabled={loading} className="bg-[#610e5c] text-white">
                        {loading ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar Credencial" : "Criar Credencial")}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export { EventWristbandForm }; 