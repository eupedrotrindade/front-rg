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
                <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 group">
                    <CardContent className="flex flex-col items-center justify-center p-8 min-h-[280px]">
                        <div className="rounded-full bg-purple-600 p-4 mb-6 group-hover:scale-110 transition-transform">
                            <Plus className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="font-bold text-xl mb-3 text-gray-800">Criar Novo Evento</h3>
                        <p className="text-sm text-gray-600 text-center leading-relaxed">
                            Comece um novo projeto e configure seu workspace personalizado
                        </p>
                    </CardContent>
                </Card>
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
