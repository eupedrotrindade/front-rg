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
        // Validar dados antes de enviar
        if (!data.name || !data.cpf || !data.company) {
            toast.error("Por favor, preencha todos os campos obrigatórios");
            return;
        }

        // Garantir que o role tenha um valor padrão se estiver vazio
        const submitData = {
            ...data,
            role: data.role || "Participante"
        };

        mutate(
            {
                id: participant.id,
                ...submitData
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

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            // Limpar qualquer erro quando fechar o dialog
            toast.dismiss();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(true)}
                    disabled={isPending}
                >
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
                <DialogHeader>
                    <DialogTitle>Editar Participante</DialogTitle>
                </DialogHeader>
                <EventParticipantForm
                    defaultValues={{
                        ...participant,
                        role: participant.role || "Participante",
                        presenceConfirmed: participant.presenceConfirmed || false,
                        certificateIssued: participant.certificateIssued || false,
                        daysWork: participant.daysWork || []
                    }}
                    onSubmit={handleSubmit}
                    loading={isPending}
                    isEditing={true}
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventParticipantEditDialog; 