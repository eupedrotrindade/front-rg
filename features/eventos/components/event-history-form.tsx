import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventHistorySchema, EventHistorySchema } from "@/features/eventos/schemas";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface EventHistoryFormProps {
    defaultValues?: Partial<EventHistorySchema>;
    onSubmit: (data: EventHistorySchema) => void;
    loading?: boolean;
}

const EventHistoryForm = ({ defaultValues, onSubmit, loading }: EventHistoryFormProps) => {
    const form = useForm<EventHistorySchema>({
        resolver: zodResolver(eventHistorySchema),
        defaultValues,
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Entidade *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo de entidade" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="event">Evento</SelectItem>
                                    <SelectItem value="participant">Participante</SelectItem>
                                    <SelectItem value="manager">Gerente</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="wristband">Credencial</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="entityId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ID da Entidade *</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="ID da entidade" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ação *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a ação" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="created">Criado</SelectItem>
                                    <SelectItem value="updated">Atualizado</SelectItem>
                                    <SelectItem value="deleted">Deletado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="performedBy"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Executado Por *</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="Nome do usuário" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                                <Textarea {...field} disabled={loading} placeholder="Descrição da ação realizada" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="submit" disabled={loading} className="bg-[#610e5c] text-white">
                        {loading ? "Criando..." : "Criar Histórico"}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export { EventHistoryForm }; 