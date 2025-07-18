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
}

const EventoEditDialog = ({ evento }: EventoEditDialogProps) => {
    const [open, setOpen] = useState(false);

    const { mutate: updateEvento, isPending } = useUpdateEvento();

    const handleSubmit = (data: EventoSchema) => {
        updateEvento({ id: evento.id, ...data }, {
            onSuccess: () => {
                toast.success("Evento atualizado com sucesso!");
                setOpen(false);
            },
            onError: (error) => {
                console.error("Erro ao atualizar evento:", error);
                toast.error("Erro ao atualizar evento. Tente novamente.");
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Evento</DialogTitle>
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