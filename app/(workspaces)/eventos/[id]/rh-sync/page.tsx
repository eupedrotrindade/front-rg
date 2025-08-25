/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, RefreshCcw, Database, Users, Clock, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEvento } from '@/features/eventos/api/query/use-evento'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventAttendanceByEvent } from '@/features/eventos/api/query/use-event-attendance'
import { useEventStaff, useEventStaffByEvent } from '@/features/eventos/api/query/use-event-staff'
import { useEventVehiclesByEvent } from '@/features/eventos/api/query/use-event-vehicles-by-event'
import EventLayout from '@/components/dashboard/dashboard-layout'

interface SimpleEventDay {
  date: string // formato: "2025-08-12" (apenas data, sem horário)
  period: "diurno" | "noturno" | "dia_inteiro" // Período do dia
  idSync?: string // ID opcional para sincronizar período
}

interface SyncData {
  event: {
    id: string
    name: string
    description?: string
    startDate: string | Date
    endDate: string | Date
    venue: string
    address?: string
    status: string
    montagem: SimpleEventDay[]
    evento: SimpleEventDay[]
    desmontagem: SimpleEventDay[]
  }
  participants: any[]
}

export default function RHSyncPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = String(params.id)

  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Buscar dados do evento
  const { data: evento, isLoading: eventoLoading } = useEvento(eventId)
  const { data: participants = [], isLoading: participantsLoading } = useEventParticipantsByEvent({ eventId })
  const { data: attendance = [], isLoading: attendanceLoading } = useEventAttendanceByEvent(eventId)
  const { data: staff = [], isLoading: staffLoading } = useEventStaffByEvent(eventId)
  const { data: vehicles = [], isLoading: vehiclesLoading } = useEventVehiclesByEvent({ eventId })

  const isLoading = eventoLoading || participantsLoading || attendanceLoading || staffLoading || vehiclesLoading

  // Calcular tempo de trabalho baseado nos check-ins/check-outs
  const calculateWorkTime = () => {
    if (!Array.isArray(attendance)) return []
    const workTimeData = attendance.map((record: any) => {
      const checkIn = new Date(record.checkIn)
      const checkOut = new Date(record.checkOut)
      const workHours = checkOut.getTime() - checkIn.getTime()

      return {
        participantId: record.participantId,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        workHours: workHours / (1000 * 60 * 60), // converter para horas
        participantName: participants.find((p: any) => p.id === record.participantId)?.name || 'N/A'
      }
    })

    return workTimeData
  }

  // Preparar dados para sincronização
  const prepareSyncData = (): SyncData => {
    // Criar um mapa de attendance por participantId para facilitar a busca
    const attendanceMap = new Map()
    if (Array.isArray(attendance)) {
      attendance.forEach((record: any) => {
        attendanceMap.set(record.participantId, record)
      })
    }

    return {
      event: {
        id: evento?.id ?? '',
        name: evento?.name ?? '',
        description: evento?.description,
        startDate: evento?.startDate ?? '',
        endDate: evento?.endDate ?? '',
        venue: evento?.venue ?? '',
        address: evento?.address ?? '',
        status: evento?.status ?? '',
        montagem: evento?.montagem ?? [],
        evento: evento?.evento ?? [],
        desmontagem: evento?.desmontagem ?? []
      },
      participants: participants.map((p: any) => {
        // Buscar dados de attendance correspondente a este participante
        const attendanceRecord = attendanceMap.get(p.id)

        return {
          id: p.id,
          name: p.name,
          cpf: p.cpf,
          email: p.email,
          phone: p.phone,
          role: p.role,
          company: p.company,
          // Substituir checkIn e checkOut pelos dados do attendance se disponível
          checkIn: attendanceRecord?.checkIn || p.checkIn,
          checkOut: attendanceRecord?.checkOut || p.checkOut,
          presenceConfirmed: p.presenceConfirmed,
          shiftId: p.shiftId,
          workDate: p.workDate,
          workStage: p.workStage,
          workPeriod: p.workPeriod,
          shirtSize: p.shirtSize,
          notes: p.notes,
          photo: p.photo,
          documentPhoto: p.documentPhoto,
          validatedBy: p.validatedBy,
          participantHash: p.participantHash,
          // Adicionar informações adicionais do attendance se disponível
          attendanceDate: attendanceRecord?.date,
          attendanceStatus: attendanceRecord?.status
        }
      })
    }
  }
  // Função para sincronizar com sistema RH
  const handleSync = async () => {
    setSyncing(true)
    setSyncStatus('idle')

    try {
      const syncData = prepareSyncData()

      // Aqui você implementaria a chamada para sua API/webhook do sistema RH
      const response = await fetch(`http://localhost:3334/colaborador/import/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncData)
      })

      if (response.ok) {
        setSyncStatus('success')
      } else {
        setSyncStatus('error')
      }
    } catch (error) {
      console.error('Erro na sincronização:', error)
      setSyncStatus('error')
    } finally {
      setSyncing(false)
    }
  }

  const stats = {
    totalParticipants: Array.isArray(participants) ? participants.length : 0,
    totalAttendance: Array.isArray(attendance) ? attendance.length : 0,
    totalStaff: Array.isArray(staff) ? staff.length : 0,
    totalVehicles: Array.isArray(vehicles) ? vehicles.length : 0,
    workHoursTotal: Array.isArray(calculateWorkTime())
      ? calculateWorkTime().reduce((total, record) => total + record.workHours, 0)
      : 0
  }

  return (
    <EventLayout eventId={evento?.id} eventName={evento?.name}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sincronização RH</h1>
            <p className="text-muted-foreground">
              {evento?.name} - Enviar dados para sistema RH
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p>Carregando dados do evento...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Participantes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                  <p className="text-xs text-muted-foreground">
                    Total de staff geral
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Check-ins/Outs</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAttendance}</div>
                  <p className="text-xs text-muted-foreground">
                    Registros de presença
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Operadores</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStaff}</div>
                  <p className="text-xs text-muted-foreground">
                    Staff operacional
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(stats.workHoursTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total de horas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Card Principal de Sincronização */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Sincronização com Sistema RH
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Os seguintes dados serão enviados para o sistema RH:</p>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• Dados do evento (nome, datas, local, fases)</li>
                    <li>• Participantes com check-ins/outs integrados ({stats.totalParticipants} registros)</li>
                  </ul>
                  <p className="mt-3 text-xs text-blue-600">
                    ℹ️ Os dados de check-in e check-out foram integrados diretamente aos participantes correspondentes.
                  </p>
                  <p className="mt-2 text-xs text-gray-600">
                    Inclui informações completas do evento e fases (montagem, evento, desmontagem) com todos os participantes.
                  </p>
                </div>

                {syncStatus === 'success' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">✓ Sincronização realizada com sucesso!</p>
                  </div>
                )}

                {syncStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">✗ Erro na sincronização. Tente novamente.</p>
                  </div>
                )}

                <Button
                  onClick={handleSync}
                  disabled={syncing || isLoading}
                  className="w-full"
                  size="lg"
                >
                  {syncing ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Sincronizar com RH
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </EventLayout>
  )
}