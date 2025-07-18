"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventWristbandForm } from "./event-wristband-form";
import { useUpdateEventWristband } from "@/features/eventos/api/mutation/use-update-event-wristband";
import { EventWristbandSchema } from "@/features/eventos/schemas";
import { EventWristband } from "@/features/eventos/types";
import { useState } from "react";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface EventWristbandEditDialogProps {
    wristband: EventWristband;
}

const EventWristbandEditDialog = ({ wristband }: EventWristbandEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useUpdateEventWristband();

    const handleSubmit = (data: EventWristbandSchema) => {
        mutate(
            {
                id: wristband.id,
                ...data
            },
            {
                onSuccess: () => {
                    toast.success("Credencial atualizada com sucesso!");
                    setOpen(false);
                },
                onError: (error) => {
                    console.error("Erro ao atualizar credencial:", error);
                    toast.error("Erro ao atualizar credencial. Tente novamente.");
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
                    <DialogTitle>Editar Credencial</DialogTitle>
                </DialogHeader>
                <EventWristbandForm
                    defaultValues={wristband}
                    onSubmit={handleSubmit}
                    loading={isPending}
                    isEditing={true}
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventWristbandEditDialog; 