"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EventoForm from "./evento-form";
import { useUpdateEvento } from "@/features/eventos/api/mutation/use-update-evento";
import { EventoSchema } from "@/features/eventos/schemas";
import { Event } from "@/features/eventos/types";
import { useState } from "react";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface EventoEditDialogProps {
    evento: Event;
    children?: React.ReactNode;
    onClose?: () => void;
}

const EventoEditDialog = ({ evento, children, onClose }: EventoEditDialogProps) => {
    console.log(evento)
    const [open, setOpen] = useState(true);
    const { mutate: updateEvento, isPending } = useUpdateEvento();

    const handleSubmit = (data: EventoSchema) => {
        updateEvento({ id: evento.id, ...data }, {
            onSuccess: () => {
                toast.success("Evento atualizado com sucesso!");
                setOpen(false);
                onClose?.();
            },
            onError: (error) => {
                console.error("Erro ao atualizar evento:", error);
                toast.error("Erro ao atualizar evento. Tente novamente.");
            },
        });
    };

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            onClose?.();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white text-black border-0"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-black">
                <DialogHeader>
                    <DialogTitle>Editar Evento: {evento.name}</DialogTitle>
                </DialogHeader>
                <EventoForm
                    onSubmit={handleSubmit}
                    loading={isPending}
                    isEditing={true}
                    defaultValues={evento}
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventoEditDialog; 