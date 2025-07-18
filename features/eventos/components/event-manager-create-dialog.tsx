"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventManagerForm } from "./event-manager-form";
import { useCreateEventManager } from "@/features/eventos/api/mutation/use-create-event-manager";
import { EventManagerSchema } from "@/features/eventos/schemas";
import { useState } from "react";
import { toast } from "sonner";

const EventManagerCreateDialog = () => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useCreateEventManager();

    const handleSubmit = (data: EventManagerSchema) => {
        mutate(data, {
            onSuccess: () => {
                toast.success("Coordenadores criado com sucesso!");
                setOpen(false);
            },
            onError: (error) => {
                console.error("Erro ao criar gerente:", error);
                toast.error("Erro ao criar gerente. Tente novamente.");
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#610e5c] text-white">Novo Coordenadores</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Coordenadores</DialogTitle>
                </DialogHeader>
                <EventManagerForm onSubmit={handleSubmit} loading={isPending} isEditing={false} />
            </DialogContent>
        </Dialog>
    );
};

export default EventManagerCreateDialog; 