"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import EventoForm from "./evento-form"
import { useCreateEvento } from "@/features/eventos/api/mutation/use-create-evento"
import { EventoSchema } from "@/features/eventos/schemas"
import { useState } from "react"
import { toast } from "sonner"
import { Plus } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"

const EventoCreateDialog = () => {
    const [open, setOpen] = useState(false)
    const { mutate: createEvento, isPending } = useCreateEvento()

    const handleSubmit = (data: EventoSchema) => {
        createEvento(data, {
            onSuccess: () => {
                toast.success("Evento criado com sucesso!")
                setOpen(false)
            },
            onError: (error) => {
                console.error("Erro ao criar evento:", error)
                toast.error("Erro ao criar evento. Tente novamente.")
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>

            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-gray-800">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-2xl font-bold text-purple-800">Criar Novo Evento</DialogTitle>
                    <p className="text-gray-600 mt-2">Preencha as informações abaixo para criar seu evento</p>
                </DialogHeader>
                <EventoForm onSubmit={handleSubmit} loading={isPending} />
            </DialogContent>
        </Dialog>
    )
}

export default EventoCreateDialog
