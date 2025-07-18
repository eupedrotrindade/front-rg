"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventStaffForm } from "./event-staff-form";
import { useUpdateEventStaff } from "@/features/eventos/api/mutation/use-update-event-staff";
import { EventStaffSchema } from "@/features/eventos/schemas";
import { EventStaff } from "@/features/eventos/types";
import { useState } from "react";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface EventStaffEditDialogProps {
    staff: EventStaff;
}

const EventStaffEditDialog = ({ staff }: EventStaffEditDialogProps) => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useUpdateEventStaff();

    const handleSubmit = (data: EventStaffSchema) => {
        mutate(
            {
                id: staff.id,
                ...data
            },
            {
                onSuccess: () => {
                    toast.success("Operador atualizado com sucesso!");
                    setOpen(false);
                },
                onError: (error) => {
                    console.error("Erro ao atualizar operador:", error);
                    toast.error("Erro ao atualizar operador. Tente novamente.");
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
                    <DialogTitle>Editar Operador</DialogTitle>
                </DialogHeader>
                <EventStaffForm
                    defaultValues={staff}
                    onSubmit={handleSubmit}
                    loading={isPending}
                    isEditing={true}
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventStaffEditDialog; 