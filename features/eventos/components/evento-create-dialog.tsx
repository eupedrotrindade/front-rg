"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EventoForm from "./evento-form";
import { useCreateEvento } from "@/features/eventos/api/mutation/use-create-evento";
import { EventoSchema } from "@/features/eventos/schemas";
import { useState } from "react";
import { toast } from "sonner";

const EventoCreateDialog = () => {
    const [open, setOpen] = useState(false);

    const { mutate: createEvento, isPending } = useCreateEvento();

    const handleSubmit = (data: EventoSchema) => {
        createEvento(data, {
            onSuccess: () => {
                toast.success("Evento criado com sucesso!");
                setOpen(false);
            },
            onError: (error) => {
                console.error("Erro ao criar evento:", error);
                toast.error("Erro ao criar evento. Tente novamente.");
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#610e5c] text-white">Novo Evento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Evento</DialogTitle>
                </DialogHeader>
                <EventoForm onSubmit={handleSubmit} loading={isPending} />
            </DialogContent>
        </Dialog>
    );
};

export default EventoCreateDialog;