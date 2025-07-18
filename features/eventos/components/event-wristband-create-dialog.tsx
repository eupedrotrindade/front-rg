"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventWristbandForm } from "./event-wristband-form";
import { useCreateEventWristband } from "@/features/eventos/api/mutation/use-create-event-wristband";
import { EventWristbandSchema } from "@/features/eventos/schemas";
import { useState } from "react";
import { toast } from "sonner";

const EventWristbandCreateDialog = () => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useCreateEventWristband();

    const handleSubmit = (data: EventWristbandSchema) => {
        mutate(data, {
            onSuccess: () => {
                toast.success("Credencial criada com sucesso!");
                setOpen(false);
            },
            onError: (error) => {
                console.error("Erro ao criar credencial:", error);
                toast.error("Erro ao criar credencial. Tente novamente.");
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#610e5c] text-white">Nova Credencial</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nova Credencial</DialogTitle>
                </DialogHeader>
                <EventWristbandForm onSubmit={handleSubmit} loading={isPending} />
            </DialogContent>
        </Dialog>
    );
};

export default EventWristbandCreateDialog; 