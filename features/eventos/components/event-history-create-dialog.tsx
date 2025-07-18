"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventHistoryForm } from "./event-history-form";
import { useCreateEventHistory } from "@/features/eventos/api/mutation/use-create-event-history";
import { EventHistorySchema } from "@/features/eventos/schemas";
import { useState } from "react";
import { toast } from "sonner";

const EventHistoryCreateDialog = () => {
    const [open, setOpen] = useState(false);
    const { mutate, isPending } = useCreateEventHistory();

    const handleSubmit = (data: EventHistorySchema) => {
        mutate(data, {
            onSuccess: () => {
                toast.success("Histórico criado com sucesso!");
                setOpen(false);
            },
            onError: (error) => {
                console.error("Erro ao criar histórico:", error);
                toast.error("Erro ao criar histórico. Tente novamente.");
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#610e5c] text-white">Novo Histórico</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Histórico</DialogTitle>
                </DialogHeader>
                <EventHistoryForm onSubmit={handleSubmit} loading={isPending} />
            </DialogContent>
        </Dialog>
    );
};

export default EventHistoryCreateDialog; 