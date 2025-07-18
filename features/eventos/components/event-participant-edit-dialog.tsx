"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventParticipantForm } from "./event-participant-form";
import { useUpdateEventParticipant } from "@/features/eventos/api/mutation/use-update-event-participant";
import { EventParticipantSchema } from "@/features/eventos/schemas";
import { EventParticipant } from "@/features/eventos/types";
import { useState } from "react";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface EventParticipantEditDialogProps {
    participant: EventParticipant;
}

const EventParticipantEditDialog = ({ participant }: EventParticipantEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useUpdateEventParticipant();

    const handleSubmit = (data: EventParticipantSchema) => {
        mutate(
            {
                id: participant.id,
                ...data
            },
            {
                onSuccess: () => {
                    toast.success("Participante atualizado com sucesso!");
                    setOpen(false);
                },
                onError: (error) => {
                    console.error("Erro ao atualizar participante:", error);
                    toast.error("Erro ao atualizar participante. Tente novamente.");
                },
            }
        );
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
                    <DialogTitle>Editar Participante</DialogTitle>
                </DialogHeader>
                <EventParticipantForm
                    defaultValues={participant}
                    onSubmit={handleSubmit}
                    loading={isPending}
                    isEditing={true}
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventParticipantEditDialog; 