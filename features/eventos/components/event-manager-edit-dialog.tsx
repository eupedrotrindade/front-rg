"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventManagerForm } from "./event-manager-form";
import { useUpdateEventManager } from "@/features/eventos/api/mutation/use-update-event-manager";
import { EventManagerSchema } from "@/features/eventos/schemas";
import { EventManager } from "@/features/eventos/types";
import { useState } from "react";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface EventManagerEditDialogProps {
    manager: EventManager;
}

const EventManagerEditDialog = ({ manager }: EventManagerEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useUpdateEventManager();

    const handleSubmit = (data: EventManagerSchema) => {
        mutate(
            {
                id: manager.id,
                ...data
            },
            {
                onSuccess: () => {
                    toast.success("Gerente atualizado com sucesso!");
                    setOpen(false);
                },
                onError: (error) => {
                    console.error("Erro ao atualizar gerente:", error);
                    toast.error("Erro ao atualizar gerente. Tente novamente.");
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
                    <DialogTitle>Editar Gerente</DialogTitle>
                </DialogHeader>
                <EventManagerForm
                    defaultValues={manager}
                    onSubmit={handleSubmit}
                    loading={isPending}
                    isEditing={true}
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventManagerEditDialog; 