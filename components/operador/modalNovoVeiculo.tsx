"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { EventVehicle } from "@/features/eventos/actions/create-event-vehicle"


interface ModalNovoVeiculoProps {
  isOpen: boolean

  veiculo?: EventVehicle | null
  isEditing?: boolean
}

export default function ModalNovoVeiculo({
  isOpen,

  veiculo,
  isEditing = false
}: ModalNovoVeiculoProps) {
  const [formData, setFormData] = useState<Omit<EventVehicle, 'id' | 'event_id' | 'created_at' | 'updated_at'>>({
    empresa: "",
    placa: "",
    modelo: "",
    status: false,
    credencial: ""
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (veiculo && isEditing) {
      setFormData({
        empresa: veiculo.empresa,
        placa: veiculo.placa,
        modelo: veiculo.modelo,
        status: veiculo.status,
        credencial: veiculo.credencial
      })
    } else {
      setFormData({
        empresa: "",
        placa: "",
        modelo: "",
        status: false,
        credencial: ""
      })
    }
  }, [veiculo, isEditing, isOpen])

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)

    try {
      // await onSave(veiculoToSave)
      // onClose()
    } catch (error) {
      console.error("Erro ao salvar veículo:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      // onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Veículo" : "Nova Retirada de Veículo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empresa - Opcional */}
          <div className="space-y-2">
            <Label htmlFor="empresa" className="text-sm font-medium">
              Empresa
            </Label>
            <Input
              id="empresa"
              value={formData.empresa}
              onChange={(e) => handleInputChange("empresa", e.target.value)}
              placeholder="Nome da empresa"
              disabled={isLoading}
            />
          </div>

          {/* Placa - Opcional */}
          <div className="space-y-2">
            <Label htmlFor="placa" className="text-sm font-medium">
              Placa
            </Label>
            <Input
              id="placa"
              value={formData.placa}
              onChange={(e) => handleInputChange("placa", e.target.value.toUpperCase())}
              placeholder="ABC-1234"
              disabled={isLoading}
            />
          </div>

          {/* Modelo - Opcional */}
          <div className="space-y-2">
            <Label htmlFor="modelo" className="text-sm font-medium">
              Modelo
            </Label>
            <Input
              id="modelo"
              value={formData.modelo}
              onChange={(e) => handleInputChange("modelo", e.target.value)}
              placeholder="Modelo do veículo"
              disabled={isLoading}
            />
          </div>

          {/* Credencial - Opcional */}
          <div className="space-y-2">
            <Label htmlFor="credencial" className="text-sm font-medium">
              Credencial
            </Label>
            <Input
              id="credencial"
              value={formData.credencial}
              onChange={(e) => handleInputChange("credencial", e.target.value)}
              placeholder="Número da credencial"
              disabled={isLoading}
            />
          </div>

          {/* Status - Obrigatório */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="status"
              checked={formData.status}
              onCheckedChange={(checked) => handleInputChange("status", checked as boolean)}
              disabled={isLoading}
            />
            <Label
              htmlFor="status"
              className="text-sm font-medium cursor-pointer"
            >
              Status * <span className="text-red-500">(Obrigatório)</span>
            </Label>
          </div>

          <div className="text-sm text-gray-600 ml-6">
            {formData.status ? (
              <span className="text-green-600">✓ Retirada - Veículo foi retirado</span>
            ) : (
              <span className="text-red-600">✗ Pendente - Aguardando retirada</span>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#6f0a5e] hover:bg-[#58084b]"
            >
              {isLoading ? "Salvando..." : (isEditing ? "Atualizar" : "Salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
