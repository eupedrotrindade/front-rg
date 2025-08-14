'use client'

import React, { useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeft, Palette, Wrench, Calendar, Truck, Sun, Moon, Plus } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { toast } from "sonner"
import Link from "next/link"

import { useEventos } from "@/features/eventos/api/query/use-eventos"
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations"
import { useCredentialsByEvent } from "@/features/eventos/api/query/use-credentials-by-event"
import { credentialSchema } from "@/features/eventos/schemas"
import type { CreateCredentialRequest, Event, Credential } from "@/features/eventos/types"
import { formatEventDate, getCurrentDateBR } from "@/lib/utils"
import EventLayout from "@/components/dashboard/dashboard-layout"

// 🔧 **Shift Processing Utils**
const generateEventShifts = (event: Event): { [key: string]: string[] } => {
  const shiftsByStage: { [key: string]: string[] } = {
    montagem: [],
    evento: [],
    desmontagem: []
  }

  if (!event) return shiftsByStage

  const processEventArray = (eventData: unknown, stage: string) => {
    if (!eventData) return
    
    try {
      let dataArray: Array<{ date?: string; period?: string }> = []
      
      if (typeof eventData === 'string') {
        dataArray = JSON.parse(eventData)
      } else if (Array.isArray(eventData)) {
        dataArray = eventData
      } else {
        return
      }

      dataArray.forEach(item => {
        if (item && item.date && item.period) {
          // ✅ Usar exatamente o período definido no evento
          const shiftId = `${item.date}-${stage}-${item.period}`
          if (!shiftsByStage[stage].includes(shiftId)) {
            shiftsByStage[stage].push(shiftId)
          }
        }
      })
    } catch (error) {
      console.warn(`⚠️ Erro ao processar ${stage}:`, error)
    }
  }

  // 📊 Process event structure
  console.log('🔍 Processando estrutura do evento:', {
    montagem: event.montagem,
    evento: event.evento,
    desmontagem: event.desmontagem
  })
  
  processEventArray(event.montagem, 'montagem')
  processEventArray(event.evento, 'evento')  
  processEventArray(event.desmontagem, 'desmontagem')
  
  console.log('✅ Shifts gerados por stage:', shiftsByStage)

  // 🔄 Sort chronologically
  const sortShifts = (a: string, b: string) => {
    const parseShift = (shiftId: string) => {
      const parts = shiftId.split('-')
      const date = `${parts[0]}-${parts[1]}-${parts[2]}`
      const period = parts[4]
      return { date, period }
    }
    
    const shiftA = parseShift(a)
    const shiftB = parseShift(b)
    
    const dateComparison = shiftA.date.localeCompare(shiftB.date)
    if (dateComparison !== 0) return dateComparison
    
    if (shiftA.period === 'diurno' && shiftB.period === 'noturno') return -1
    if (shiftA.period === 'noturno' && shiftB.period === 'diurno') return 1
    
    return 0
  }

  Object.keys(shiftsByStage).forEach(stage => {
    shiftsByStage[stage].sort(sortShifts)
  })

  return shiftsByStage
}

const getStageInfo = (stage: string) => {
  switch (stage) {
    case 'montagem':
      return { name: 'Montagem', icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-50' }
    case 'evento':
      return { name: 'Evento', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' }
    case 'desmontagem':
      return { name: 'Desmontagem', icon: Truck, color: 'text-red-600', bgColor: 'bg-red-50' }
    default:
      return { name: stage, icon: Calendar, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  }
}

const parseShiftId = (shiftId: string) => {
  const parts = shiftId.split('-')
  if (parts.length >= 5) {
    return {
      workDate: `${parts[0]}-${parts[1]}-${parts[2]}`,
      workStage: parts[3] as 'montagem' | 'evento' | 'desmontagem',
      workPeriod: parts[4] as 'diurno' | 'noturno'
    }
  }
  const dateISO = shiftId.match(/\d{4}-\d{2}-\d{2}/) ? shiftId : getCurrentDateBR()
  return {
    workDate: dateISO,
    workStage: 'evento' as const,
    workPeriod: 'diurno' as const
  }
}

const getShiftDisplayInfo = (shiftId: string) => {
  const { workDate, workStage, workPeriod } = parseShiftId(shiftId)
  const formattedDate = formatEventDate(workDate + 'T00:00:00')
  const stageInfo = getStageInfo(workStage)
  const period = workPeriod === 'diurno' ? 'Dia' : 'Noite'
  
  return { date: formattedDate, stage: stageInfo.name, period, stageInfo }
}

// 🔍 **Duplicate Check Logic**
const checkDuplicateCredentials = (
  existingCredentials: Credential[],
  newCredential: CreateCredentialRequest
): { hasDuplicate: boolean; message: string } => {
  const newDays = newCredential.days_works || []
  const newName = newCredential.nome?.toLowerCase().trim()

  if (!newName || newDays.length === 0) {
    return { hasDuplicate: false, message: "" }
  }

  for (const credential of existingCredentials) {
    const existingName = credential.nome.toLowerCase().trim()
    const existingDays = credential.days_works || []

    if (existingName === newName) {
      const hasOverlappingDays = newDays.some(day => existingDays.includes(day))
      if (hasOverlappingDays) {
        return {
          hasDuplicate: true,
          message: `⚠️ Já existe uma credencial "${credential.nome}" com turnos sobrepostos.`
        }
      }
    }
  }

  return { hasDuplicate: false, message: "" }
}

export default function CreateCredentialPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])
  const [selectedColor, setSelectedColor] = useState("#3B82F6")
  const [duplicateError, setDuplicateError] = useState("")

  // 📡 **Data Fetching**
  const { data: eventData, isLoading: isLoadingEvent } = useEventos({ id: eventId })
  const { data: existingCredentials = [] } = useCredentialsByEvent(eventId)
  const createCredential = useCreateCredential()
  
  const event = Array.isArray(eventData) ? null : eventData as Event

  // 🎯 **Form Setup**
  type FormData = {
    nome: string;
    cor: string;
    id_events: string;
    days_works: string[];
    isActive?: boolean;
    isDistributed?: boolean;
  }
  
  const { register, handleSubmit, formState: { errors, isValid }, setValue, watch, trigger } = useForm<FormData>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      nome: "",
      cor: "#3B82F6", 
      id_events: eventId,
      days_works: [],
      isActive: true,
      isDistributed: false
    },
    mode: "onChange"
  })

  // 🔧 **Shift Processing**
  const availableShifts = useMemo(() => {
    return event ? generateEventShifts(event) : {}
  }, [event])

  const hasAvailableShifts = Object.values(availableShifts).flat().length > 0

  // 🎨 **Event Handlers**
  const handleShiftToggle = useCallback(async (shiftId: string) => {
    const newSelectedShifts = selectedShifts.includes(shiftId)
      ? selectedShifts.filter(id => id !== shiftId)
      : [...selectedShifts, shiftId]

    setSelectedShifts(newSelectedShifts)
    setValue("days_works", newSelectedShifts)
    await trigger("days_works")
  }, [selectedShifts, setValue, trigger])

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color)
    setValue("cor", color)
    trigger("cor")
  }, [setValue, trigger])

  // ✅ **Duplicate Validation**
  React.useEffect(() => {
    const watchedNome = watch("nome")
    if (watchedNome && selectedShifts.length > 0) {
      const formData: CreateCredentialRequest = {
        nome: watchedNome,
        days_works: selectedShifts,
        id_events: eventId,
        cor: selectedColor,
        isActive: true,
        isDistributed: false,
        // Add required fields for the type
        shiftId: '',
        workDate: '',
        workStage: 'evento',
        workPeriod: 'diurno'
      }

      const duplicateCheck = checkDuplicateCredentials(existingCredentials, formData)
      setDuplicateError(duplicateCheck.message)
    } else {
      setDuplicateError("")
    }
  }, [watch, selectedShifts, existingCredentials, eventId, selectedColor])

  // 🚀 **Form Submission**
  const handleFormSubmit = async (data: FormData) => {
    let shiftsToSubmit = selectedShifts.filter(shift => shift && shift.trim().length > 0)
    
    // Fallback for events without specific shifts
    if (shiftsToSubmit.length === 0 && !hasAvailableShifts) {
      const today = getCurrentDateBR()
      const todayISO = today.split('/').reverse().join('-')
      const defaultShift = `${todayISO}-evento-diurno`
      shiftsToSubmit = [defaultShift]
    }
    
    // Extract main shift info
    let mainShiftInfo: {
      shiftId: string;
      workDate: string;
      workStage: 'montagem' | 'evento' | 'desmontagem';
      workPeriod: 'diurno' | 'noturno';
    } = {
      shiftId: '',
      workDate: '',
      workStage: 'evento',
      workPeriod: 'diurno'
    }
    
    if (shiftsToSubmit.length > 0) {
      const firstShift = shiftsToSubmit[0]
      const shiftInfo = parseShiftId(firstShift)
      mainShiftInfo = {
        shiftId: firstShift,
        workDate: shiftInfo.workDate,
        workStage: shiftInfo.workStage,
        workPeriod: shiftInfo.workPeriod
      }
    }
    
    const formData = {
      ...data,
      days_works: shiftsToSubmit,
      cor: selectedColor,
      // Add shift properties directly
      shiftId: mainShiftInfo.shiftId,
      workDate: mainShiftInfo.workDate,
      workStage: mainShiftInfo.workStage,
      workPeriod: mainShiftInfo.workPeriod
    }

    // Final duplicate check
    if (shiftsToSubmit.length > 0) {
      const duplicateCheck = checkDuplicateCredentials(existingCredentials, formData)
      if (duplicateCheck.hasDuplicate) {
        setDuplicateError(duplicateCheck.message)
        return
      }
    }

    try {
      await createCredential.mutateAsync(formData)
      toast.success("✅ Credencial criada com sucesso!")
      router.push(`/eventos/${eventId}/credenciais`)
    } catch (error) {
      console.error("❌ Erro ao criar credencial:", error)
      toast.error("❌ Erro ao criar credencial")
    }
  }

  const validSelectedShifts = selectedShifts.filter(shift => shift && shift.trim().length > 0)
  const isFormValid = isValid && (!hasAvailableShifts || validSelectedShifts.length > 0) && !duplicateError

  if (isLoadingEvent) {
    return (
      <EventLayout eventId={eventId} eventName="">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados do evento...</p>
          </div>
        </div>
      </EventLayout>
    )
  }

  if (!event) {
    return (
      <EventLayout eventId={eventId} eventName="">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-600">❌ Erro ao carregar dados do evento</p>
          </div>
        </div>
      </EventLayout>
    )
  }

  const eventName = Array.isArray(event) ? "" : event?.name || ""

  return (
    <EventLayout eventId={eventId} eventName={eventName}>
      <div className="p-8 max-w-4xl mx-auto">
        {/* 🔙 Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/eventos/${eventId}/credenciais`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nova Credencial</h1>
            <p className="text-gray-600 mt-1">Crie uma nova credencial para o evento</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* 📝 Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Credencial</Label>
                  <Input
                    id="nome"
                    {...register("nome")}
                    placeholder="Ex: Organizador, Staff, VIP"
                    className="text-base"
                  />
                  {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
                  {duplicateError && <p className="text-sm text-red-500">{duplicateError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor">Cor da Credencial</Label>
                  <div className="flex items-center space-x-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-16 h-12 p-2 border-2"
                          style={{ backgroundColor: selectedColor }}
                        >
                          <Palette className="h-5 w-5 text-white" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4 bg-white">
                        <div className="space-y-4">
                          <HexColorPicker color={selectedColor} onChange={handleColorChange} />
                          <Input
                            value={selectedColor}
                            onChange={(e) => {
                              const value = e.target.value
                              if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                handleColorChange(value)
                              }
                            }}
                            placeholder="#000000"
                            className="font-mono text-sm"
                          />
                          <div className="grid grid-cols-8 gap-2">
                            {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"].map((color) => (
                              <button
                                key={color}
                                type="button"
                                className="w-8 h-8 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                onClick={() => handleColorChange(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      {...register("cor")}
                      value={selectedColor}
                      onChange={(e) => {
                        setSelectedColor(e.target.value)
                        setValue("cor", e.target.value)
                      }}
                      placeholder="#000000"
                      className="flex-1 font-mono"
                    />
                  </div>
                  {errors.cor && <p className="text-sm text-red-500">{errors.cor.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 🗓️ Shifts Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Turnos de Trabalho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(availableShifts).length === 0 || Object.values(availableShifts).flat().length === 0 ? (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <Calendar className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <p className="text-blue-800 font-medium mb-2">Nenhum turno configurado</p>
                  <p className="text-blue-600 text-sm">A credencial será criada com turno padrão.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(availableShifts).map(([stage, shifts]) => {
                    const stageInfo = getStageInfo(stage)
                    const IconComponent = stageInfo.icon

                    return (
                      <div key={stage} className={`p-6 rounded-xl border-2 ${stageInfo.bgColor} border-gray-200`}>
                        <div className="flex items-center gap-3 mb-4">
                          <IconComponent className={`h-6 w-6 ${stageInfo.color}`} />
                          <h3 className={`text-lg font-semibold ${stageInfo.color}`}>
                            {stageInfo.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {shifts.length} turno{shifts.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {shifts.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {shifts.map((shiftId) => {
                              const displayInfo = getShiftDisplayInfo(shiftId)
                              const isSelected = selectedShifts.includes(shiftId)
                              const { workPeriod } = parseShiftId(shiftId)
                              
                              return (
                                <div
                                  key={shiftId}
                                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                    isSelected 
                                      ? 'bg-blue-100 border-blue-400 shadow-md' 
                                      : 'bg-white border-gray-200 hover:border-gray-300'
                                  }`}
                                  onClick={() => handleShiftToggle(shiftId)}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium text-gray-900">
                                      {displayInfo.date}
                                    </div>
                                    {isSelected && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    {workPeriod === 'diurno' ? 
                                      <Sun className="h-3 w-3 text-yellow-500" /> : 
                                      <Moon className="h-3 w-3 text-blue-500" />
                                    }
                                    <span>{displayInfo.period}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Nenhum turno configurado</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              
              {errors.days_works && (
                <p className="text-sm text-red-500">{errors.days_works.message}</p>
              )}
              
              {selectedShifts.length === 0 && hasAvailableShifts && !errors.days_works && (
                <p className="text-sm text-amber-600">⚠️ Selecione pelo menos um turno</p>
              )}
              
              {selectedShifts.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium mb-2">
                    ✅ {selectedShifts.length} turno{selectedShifts.length !== 1 ? 's' : ''} selecionado{selectedShifts.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedShifts.slice(0, 5).map(shiftId => {
                      const info = getShiftDisplayInfo(shiftId)
                      return (
                        <Badge key={shiftId} variant="secondary" className="text-xs">
                          {info.date} - {info.period}
                        </Badge>
                      )
                    })}
                    {selectedShifts.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedShifts.length - 5} mais
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ⚡ Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Link href={`/eventos/${eventId}/credenciais`}>
              <Button type="button" variant="outline" size="lg">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createCredential.isPending || !isFormValid}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              size="lg"
            >
              {createCredential.isPending ? "Criando..." : "Criar Credencial"}
            </Button>
          </div>
        </form>
      </div>
    </EventLayout>
  )
}