"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EventVehicle } from "@/features/eventos/actions/create-event-vehicle"
import { toast } from "sonner"
import { Building2, Car, Hash, CreditCard, Calendar, CheckCircle, Clock } from "lucide-react"


interface ModalNovoVeiculoProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<EventVehicle, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => Promise<void>
  veiculo?: EventVehicle | null
  isEditing?: boolean
  eventDays?: Array<{ id: string; label: string; date: string; type: string }>
  selectedDay?: string
}

export default function ModalNovoVeiculo({
  isOpen,
  onClose,
  onSave,
  veiculo,
  isEditing = false,
  eventDays = [],
  selectedDay
}: ModalNovoVeiculoProps) {
  const [formData, setFormData] = useState<Omit<EventVehicle, 'id' | 'event_id' | 'created_at' | 'updated_at'>>({
    empresa: "",
    modelo: "",
    placa: "",
    tipo_de_credencial: "",
    retirada: "pendente" as const,
    dia: new Date().toISOString().split('T')[0]
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (veiculo && isEditing) {
      setFormData({
        empresa: veiculo.empresa || "",
        modelo: veiculo.modelo || "",
        placa: veiculo.placa || "",
        tipo_de_credencial: veiculo.tipo_de_credencial || "",
        retirada: veiculo.retirada,
        dia: veiculo.dia // Já está no formato YYYY-MM-DD
      })
    } else {
      setFormData({
        empresa: "",
        modelo: "",
        placa: "",
        tipo_de_credencial: "",
        retirada: "pendente" as const,
        dia: selectedDay || (eventDays.length > 0 ? eventDays[0].id : new Date().toISOString().split('T')[0])
      })
    }
  }, [veiculo, isEditing, isOpen, selectedDay, eventDays])

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação dos campos obrigatórios
    if (!formData.retirada) {
      toast.error("Por favor, selecione o status do veículo")
      return
    }

    if (!formData.dia) {
      toast.error("Por favor, selecione um dia do evento")
      return
    }

    if (!formData.empresa?.trim()) {
      toast.error("Por favor, informe o nome da empresa")
      return
    }

    setIsLoading(true)

    try {
      await onSave(formData)
      toast.success(isEditing ? "Veículo atualizado com sucesso!" : "Veículo registrado com sucesso!")
      onClose()
    } catch (error) {
      console.error("Erro ao salvar veículo:", error)
      toast.error("Erro ao salvar veículo. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md bg-white text-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle>{isEditing ? "Editar Veículo" : "Nova Retirada de Veículo"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isEditing ? "Editar informações do veículo" : "Registrar nova retirada de veículo"}
          </AlertDialogDescription>
        </AlertDialogHeader>

                 <form onSubmit={handleSubmit} className="space-y-4 py-4">
           {/* Empresa - Obrigatório */}
           <div>
             <Label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-2">
               <Building2 className="inline w-4 h-4 mr-2" />
               Nome da Empresa * <span className="text-red-500">(Obrigatório)</span>
             </Label>
             <Input
               id="empresa"
               value={formData.empresa}
               onChange={(e) => handleInputChange("empresa", e.target.value)}
               placeholder="Digite o nome da empresa"
               disabled={isLoading}
               className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
             />
           </div>

           {/* Modelo - Opcional */}
           <div>
             <Label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-2">
               <Car className="inline w-4 h-4 mr-2" />
               Modelo do Veículo
             </Label>
             <Input
               id="modelo"
               value={formData.modelo}
               onChange={(e) => handleInputChange("modelo", e.target.value)}
               placeholder="Ex: Fiat Strada, Chevrolet Onix"
               disabled={isLoading}
               className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
             />
           </div>

           {/* Placa - Opcional */}
           <div>
             <Label htmlFor="placa" className="block text-sm font-medium text-gray-700 mb-2">
               <Hash className="inline w-4 h-4 mr-2" />
               Placa
             </Label>
             <Input
               id="placa"
               value={formData.placa}
               onChange={(e) => handleInputChange("placa", e.target.value.toUpperCase())}
               placeholder="ABC-1234 ou ABC1D23"
               disabled={isLoading}
               className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
             />
           </div>

           {/* Tipo de Credencial - Opcional */}
           <div>
             <Label htmlFor="tipo_de_credencial" className="block text-sm font-medium text-gray-700 mb-2">
               <CreditCard className="inline w-4 h-4 mr-2" />
               Tipo de Credencial
             </Label>
             <Input
               id="tipo_de_credencial"
               value={formData.tipo_de_credencial}
               onChange={(e) => handleInputChange("tipo_de_credencial", e.target.value)}
               placeholder="Ex: Credencial VIP, Credencial Imprensa"
               disabled={isLoading}
               className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
             />
           </div>

                     {/* Dia - Obrigatório */}
           <div>
             <Label htmlFor="dia" className="block text-sm font-medium text-gray-700 mb-2">
               <Calendar className="inline w-4 h-4 mr-2" />
               Dia do Evento * <span className="text-red-500">(Obrigatório)</span>
             </Label>
             <select
               id="dia"
               value={formData.dia}
               onChange={(e) => handleInputChange("dia", e.target.value)}
               className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
               disabled={isLoading}
             >
               <option value="">Selecione um dia do evento</option>
               {eventDays.map((day) => (
                 <option key={day.id} value={day.id}>
                   {day.label}
                 </option>
               ))}
             </select>
           </div>

           {/* Retirada - Obrigatório */}
           <div>
             <Label htmlFor="retirada" className="block text-sm font-medium text-gray-700 mb-2">
               Status do Veículo * <span className="text-red-500">(Obrigatório)</span>
             </Label>
             <select
               id="retirada"
               value={formData.retirada}
               onChange={(e) => handleInputChange("retirada", e.target.value as "pendente" | "retirada")}
               className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
               disabled={isLoading}
             >
               <option value="">Selecione o status</option>
               <option value="pendente">Pendente</option>
               <option value="retirada">Retirada</option>
             </select>
           </div>

           {/* Feedback visual do status */}
           <div className="p-3 rounded-lg border">
             {formData.retirada === "retirada" ? (
               <div className="flex items-center text-green-700">
                 <CheckCircle className="w-4 h-4 mr-2" />
                 <span className="text-sm font-medium">✓ Veículo Retirado</span>
               </div>
             ) : formData.retirada === "pendente" ? (
               <div className="flex items-center text-orange-600">
                 <Clock className="w-4 h-4 mr-2" />
                 <span className="text-sm font-medium">⏳ Aguardando Retirada</span>
               </div>
             ) : (
               <div className="flex items-center text-gray-500">
                 <Clock className="w-4 h-4 mr-2" />
                 <span className="text-sm">Selecione o status do veículo</span>
               </div>
             )}
           </div>

        </form>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? "Salvando..." : (isEditing ? "Atualizar" : "Salvar")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
