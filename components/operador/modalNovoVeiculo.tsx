"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { EventVehicle } from "@/features/eventos/actions/create-event-vehicle"
import { toast } from "sonner"
import { Building2, Car, Hash, CreditCard, Calendar, CheckCircle, Clock, Copy, Plus } from "lucide-react"

interface ModalNovoVeiculoProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<EventVehicle, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => Promise<void>
  veiculo?: EventVehicle | null
  isEditing?: boolean
  eventDays?: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }>
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
    shiftId: selectedDay || (eventDays.length > 0 ? eventDays[0].id : "")
  })
  const [isLoading, setIsLoading] = useState(false)
  const [hasCopies, setHasCopies] = useState(false)
  const [copiesCount, setCopiesCount] = useState(1)

  // Função para converter shift ID para data ISO (compatibilidade com novo sistema)
  const parseShiftIdToDate = (shiftId: string): string => {
    if (shiftId && shiftId.includes('-')) {
      const parts = shiftId.split('-');
      // Se tem 5 ou mais partes, é um shift ID (YYYY-MM-DD-stage-period)
      if (parts.length >= 5) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
      // Se tem 3 partes, já é uma data ISO (YYYY-MM-DD)
      if (parts.length === 3) {
        return shiftId;
      }
    }
    // Se já é uma data normal ou string simples, retornar como está
    return shiftId;
  }

  useEffect(() => {
    if (veiculo && isEditing) {
      setFormData({
        empresa: veiculo.empresa || "",
        modelo: veiculo.modelo || "",
        placa: veiculo.placa || "",
        tipo_de_credencial: veiculo.tipo_de_credencial || "",
        retirada: veiculo.retirada,
        shiftId: veiculo.shiftId || ""
      })
    } else {
      setFormData({
        empresa: "",
        modelo: "",
        placa: "",
        tipo_de_credencial: "",
        retirada: "pendente" as const,
        shiftId: selectedDay || (eventDays.length > 0 ? eventDays[0].id : "")
      })
    }

    // Resetar campos de cópias
    setHasCopies(false)
    setCopiesCount(1)
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

    if (!formData.shiftId) {
      toast.error("Por favor, selecione um turno do evento")
      return
    }

    if (!formData.empresa?.trim()) {
      toast.error("Por favor, informe o nome da empresa")
      return
    }

    setIsLoading(true)

    try {
      // Se há cópias, criar múltiplos registros
      if (hasCopies && copiesCount > 1) {
        const promises = []
        for (let i = 0; i < copiesCount; i++) {
          const copyData = {
            ...formData,
            empresa: `${formData.empresa}${i > 0 ? ` (Cópia ${i + 1})` : ''}`,
            placa: formData.placa ? `${formData.placa}${i > 0 ? `-${i + 1}` : ''}` : formData.placa
          }
          promises.push(onSave(copyData))
        }
        await Promise.all(promises)
        toast.success(`${copiesCount} veículos registrados com sucesso!`)
      } else {
        await onSave(formData)
        toast.success(isEditing ? "Veículo atualizado com sucesso!" : "Veículo registrado com sucesso!")
      }
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
      <AlertDialogContent className="max-w-4xl bg-white text-gray-800 max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{isEditing ? "Editar Veículo" : "Nova Retirada de Veículo"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isEditing ? "Editar informações do veículo" : "Registrar nova retirada de veículo"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Layout em 2 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
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
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              {/* Turno - Obrigatório */}
              <div>
                <Label htmlFor="shiftId" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-2" />
                  Turno do Evento * <span className="text-red-500">(Obrigatório)</span>
                </Label>
                <select
                  id="shiftId"
                  value={formData.shiftId}
                  onChange={(e) => handleInputChange("shiftId", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 max-h-48 overflow-y-auto"
                  disabled={isLoading}
                  size={eventDays.length > 8 ? 8 : 1}
                >
                  <option value="">Selecione um turno do evento</option>
                  {eventDays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {new Date(day.date + 'T12:00:00.000Z').toLocaleDateString('pt-BR')} - {day.type === 'montagem' || day.type === 'setup' ? 'MONTAGEM' :
                        day.type === 'evento' || day.type === 'event' || day.type === 'preparation' ? 'EVENTO' :
                        day.type === 'desmontagem' || day.type === 'teardown' || day.type === 'finalization' ? 'DESMONTAGEM' : 'EVENTO'} - {day.period === 'diurno' ? 'Diurno' : day.period === 'noturno' ? 'Noturno' : 'Dia Inteiro'}
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

              {/* Seção de Cópias */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="hasCopies"
                    checked={hasCopies}
                    onCheckedChange={(checked) => setHasCopies(checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="hasCopies" className="text-sm font-medium text-gray-700 flex items-center">
                    <Copy className="w-4 h-4 mr-2" />
                    Criar múltiplas cópias
                  </Label>
                </div>

                {hasCopies && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="copiesCount" className="block text-sm font-medium text-gray-700 mb-2">
                        Quantidade de cópias
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCopiesCount(Math.max(1, copiesCount - 1))}
                          disabled={copiesCount <= 1 || isLoading}
                          className="w-8 h-8 p-0"
                        >
                          -
                        </Button>
                        <Input
                          id="copiesCount"
                          type="number"
                          min="1"
                          max="50"
                          value={copiesCount}
                          onChange={(e) => setCopiesCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCopiesCount(Math.min(50, copiesCount + 1))}
                          disabled={copiesCount >= 50 || isLoading}
                          className="w-8 h-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Serão criados {copiesCount} registros similares
                      </p>
                    </div>
                  </div>
                )}
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
            </div>
          </div>
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? "Salvando..." : (isEditing ? "Atualizar" : hasCopies && copiesCount > 1 ? `Salvar ${copiesCount} Veículos` : "Salvar")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}