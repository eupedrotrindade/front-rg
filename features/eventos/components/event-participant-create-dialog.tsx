"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventParticipantForm } from "./event-participant-form";
import { useCreateEventParticipant } from "@/features/eventos/api/mutation/use-create-event-participant";
import { EventParticipantSchema } from "@/features/eventos/schemas";
import { useState } from "react";
import { toast } from "sonner";

const EventParticipantCreateDialog = () => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useCreateEventParticipant();

    const handleSubmit = (data: EventParticipantSchema) => {
        mutate(data, {
            onSuccess: () => {
                toast.success("Staff Geral criado com sucesso!");
                setOpen(false);
            },
            onError: (error) => {
                console.error("Erro ao criar participante:", error);
                toast.error("Erro ao criar participante. Tente novamente.");
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#610e5c] text-white">Novo Staff Geral</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Staff Geral</DialogTitle>
                </DialogHeader>
                <EventParticipantForm onSubmit={handleSubmit} loading={isPending} isEditing={false} />
            </DialogContent>
        </Dialog>
    );
};

export default EventParticipantCreateDialog; 