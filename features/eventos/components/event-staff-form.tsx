import React from "react";
import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventStaffSchema, EventStaffSchema } from "@/features/eventos/schemas";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEventos } from "@/features/eventos/api/query/use-eventos";
import { formatCpf, formatPhone } from "@/lib/utils";

interface EventStaffFormProps {
    defaultValues?: Partial<EventStaffSchema>;
    onSubmit: (data: EventStaffSchema) => void;
    loading?: boolean;
    isEditing?: boolean;
}

const EventStaffForm = ({ defaultValues, onSubmit, loading, isEditing = false }: EventStaffFormProps) => {
    const { data: eventos } = useEventos();
    const eventosArray = Array.isArray(eventos) ? eventos : [];

    const form = useForm<FieldValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(eventStaffSchema) as any,
        defaultValues: {
            permissions: 'viewer',
            ...defaultValues,
        },
    });

    const handleSubmit = (data: FieldValues) => {
        // Se estiver editando e não houver senha, remove o campo
        if (isEditing && !data.password) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...dataWithoutPassword } = data;
            onSubmit(dataWithoutPassword as EventStaffSchema);
        } else {
            onSubmit(data as EventStaffSchema);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Evento *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
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
                </div>

                <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    disabled={loading}
                                    placeholder="000.000.000-00"
                                    value={formatCpf(field.value || '')}
                                    onChange={(e) => {
                                        const formattedValue = formatCpf(e.target.value);
                                        field.onChange(formattedValue);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Foto de Perfil</FormLabel>
                            <FormControl>
                                <Input {...field} disabled={loading} placeholder="URL da foto" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                /> */}

                {!isEditing && (
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Senha *</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} disabled={loading} placeholder="Mínimo 6 caracteres" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="permissions"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Permissões</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione as permissões" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                    <SelectItem value="manager">Gerente</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Visualizador</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="supervisorName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Supervisor</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled={loading} placeholder="Nome do supervisor" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="supervisorCpf"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CPF do Supervisor</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        disabled={loading}
                                        placeholder="000.000.000-00"
                                        value={formatCpf(field.value || '')}
                                        onChange={(e) => {
                                            const formattedValue = formatCpf(e.target.value);
                                            field.onChange(formattedValue);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="submit" disabled={loading} className="bg-[#610e5c] text-white">
                        {loading ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar Staff" : "Criar Staff")}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export { EventStaffForm }; 