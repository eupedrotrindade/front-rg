"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventStaffForm } from "./event-staff-form";
import { useCreateEventStaff } from "@/features/eventos/api/mutation/use-create-event-staff";
import { EventStaffSchema } from "@/features/eventos/schemas";
import { useState } from "react";
import { toast } from "sonner";

const EventStaffCreateDialog = () => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useCreateEventStaff();

    const handleSubmit = (data: EventStaffSchema) => {
        mutate(data, {
            onSuccess: () => {
                toast.success("Staff criado com sucesso!");
                setOpen(false);
            },
            onError: (error) => {
                console.error("Erro ao criar staff:", error);
                toast.error("Erro ao criar staff. Tente novamente.");
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#610e5c] text-white">Novo Operador</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Operador</DialogTitle>
                </DialogHeader>
                <EventStaffForm onSubmit={handleSubmit} loading={isPending} />
            </DialogContent>
        </Dialog>
    );
};

export default EventStaffCreateDialog; 