/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Calendar,
  Clock,
  User,
  Plus,
  Check,
  X,
  RotateCcw,
  Badge as BadgeIcon,
  Download,
  Upload,
  History,
  Package,
  Sun,
  Moon,
  FileDown,
  Search,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  AlertCircle,
  Building,
  UserCheck,
  UserX
} from 'lucide-react'
import EventLayout from '@/components/dashboard/dashboard-layout'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { formatEventDate } from '@/lib/utils'
import { useBadgePickupsByEvent } from '@/features/eventos/api/query/use-badge-pickups-by-event'
import { useBadgePickupStats } from '@/features/eventos/api/query/use-badge-pickup-stats'
import {
  useCreateBadgePickup,
  useUpdateBadgePickup,
  useDeleteBadgePickup,
  useProcessBadgePickup
} from '@/features/eventos/api/mutation/use-badge-pickup-mutations'
import { BadgePickup } from '@/features/eventos/actions/badge-pickup'

export default function RetiradaCrachaPage() {
  const params = useParams()
  const eventId = String(params.id)

  // Estados
  const [selectedDay, setSelectedDay] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyPending, setShowOnlyPending] = useState(false)

  // Estados para modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false)
  const [editingBadge, setEditingBadge] = useState<BadgePickup | null>(null)
  const [selectedBadgeForPickup, setSelectedBadgeForPickup] = useState<BadgePickup | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    empresa: '',
    shiftId: '',
    workDate: '',
    workStage: 'evento' as 'montagem' | 'evento' | 'desmontagem',
    workPeriod: 'dia_inteiro' as 'diurno' | 'noturno' | 'dia_inteiro'
  })

  // Estados do modal de retirada
  const [pickupData, setPickupData] = useState({
    isSelfPickup: true,
    pickerName: '',
    pickerCompany: ''
  })

  // Hooks para dados
  const { data: eventos = [] } = useEventos()
  const { data: badges = [], isLoading: isLoadingBadges, refetch } = useBadgePickupsByEvent(eventId)
  const { data: apiStats, isLoading: isLoadingStats } = useBadgePickupStats(eventId)

  // Mutations
  const createBadgePickupMutation = useCreateBadgePickup()
  const updateBadgePickupMutation = useUpdateBadgePickup()
  const deleteBadgePickupMutation = useDeleteBadgePickup()
  const processBadgePickupMutation = useProcessBadgePickup()

  // Buscar dados do evento
  const evento = useMemo(() => {
    return Array.isArray(eventos)
      ? eventos.find(e => String(e.id) === String(eventId))
      : undefined
  }, [eventos, eventId])

  // Função para gerar dias do evento
  const getEventDays = useCallback((): Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> => {
    if (!evento) return []

    const days: Array<{ id: string; label: string; date: string; type: string; period?: 'diurno' | 'noturno' | 'dia_inteiro' }> = []

    // Função helper para processar arrays de dados do evento
    const processEventArray = (eventData: any, stage: string, stageName: string) => {
      if (!eventData) return

      try {
        let dataArray: any[] = []

        if (typeof eventData === 'string') {
          dataArray = JSON.parse(eventData)
        } else if (Array.isArray(eventData)) {
          dataArray = eventData
        } else {
          return
        }

        dataArray.forEach(item => {
          if (item && item.date) {
            const dateObj = new Date(item.date)
            if (isNaN(dateObj.getTime())) {
              console.warn(`Data inválida encontrada: ${item.date}`)
              return
            }

            const formattedDate = dateObj.toISOString().split('T')[0]
            const period = item.period || 'dia_inteiro'

            const periodLabel = period === 'diurno' ? '☀️ Diurno' :
              period === 'noturno' ? '🌙 Noturno' : '🌞 Dia Inteiro'

            const shiftId = `${formattedDate}-${stage}-${period}`

            days.push({
              id: shiftId,
              label: `${stageName} - ${formattedDate} (${periodLabel})`,
              date: formattedDate,
              type: stage,
              period: period as 'diurno' | 'noturno' | 'dia_inteiro'
            })
          }
        })
      } catch (error) {
        console.error(`Erro ao processar ${stage}:`, error)
      }
    }

    // Processar cada fase do evento
    processEventArray(evento.montagem, 'montagem', 'Montagem')
    processEventArray(evento.evento, 'evento', 'Evento')
    processEventArray(evento.desmontagem, 'desmontagem', 'Desmontagem')

    return days.sort((a, b) => a.date.localeCompare(b.date))
  }, [evento])

  const eventDays = getEventDays()

  // Filtrar badges
  const filteredBadges = useMemo(() => {
    let filtered = badges

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(badge =>
        badge.nome.toLowerCase().includes(term) ||
        badge.cpf?.toLowerCase().includes(term) ||
        badge.empresa?.toLowerCase().includes(term)
      )
    }

    // Filtro por dia selecionado
    if (selectedDay && selectedDay !== 'all') {
      filtered = filtered.filter(badge => badge.shiftId === selectedDay)
    }

    // Filtro por status
    if (showOnlyPending) {
      filtered = filtered.filter(badge => badge.status === 'pendente')
    }

    return filtered
  }, [badges, searchTerm, selectedDay, showOnlyPending])

  // Usar estatísticas da API ou calcular localmente como fallback
  const stats = useMemo(() => {
    if (apiStats) {
      return apiStats
    }

    // Fallback: calcular estatísticas localmente
    const total = badges.length
    const pendentes = badges.filter(b => b.status === 'pendente').length
    const retiradas = badges.filter(b => b.status === 'retirada').length
    const selfPickups = badges.filter(b => b.isSelfPickup === true).length
    const thirdPartyPickups = badges.filter(b => b.isSelfPickup === false && b.status === 'retirada').length

    return {
      total,
      pendentes,
      retiradas,
      selfPickups,
      thirdPartyPickups,
      pickupRate: total > 0 ? (retiradas / total) * 100 : 0
    }
  }, [apiStats, badges])

  // Handlers
  const handleCreateBadge = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    const badgeData = {
      eventId,
      nome: formData.nome,
      cpf: formData.cpf || undefined,
      empresa: formData.empresa || undefined,
      status: 'pendente' as const,
      shiftId: formData.shiftId || undefined,
      workDate: formData.workDate || undefined,
      workStage: formData.workStage,
      workPeriod: formData.workPeriod,
    }

    try {
      await createBadgePickupMutation.mutateAsync(badgeData)
      setFormData({
        nome: '',
        cpf: '',
        empresa: '',
        shiftId: '',
        workDate: '',
        workStage: 'evento',
        workPeriod: 'dia_inteiro'
      })
      setIsModalOpen(false)
    } catch (error) {
      // Erro já tratado pela mutation
    }
  }

  const handleEditBadge = (badge: BadgePickup) => {
    setEditingBadge(badge)
    setFormData({
      nome: badge.nome,
      cpf: badge.cpf || '',
      empresa: badge.empresa || '',
      shiftId: badge.shiftId || '',
      workDate: badge.workDate || '',
      workStage: badge.workStage || 'evento',
      workPeriod: badge.workPeriod || 'dia_inteiro'
    })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleUpdateBadge = async () => {
    if (!editingBadge || !formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    const updateData = {
      nome: formData.nome,
      cpf: formData.cpf || undefined,
      empresa: formData.empresa || undefined,
      shiftId: formData.shiftId || undefined,
      workDate: formData.workDate || undefined,
      workStage: formData.workStage,
      workPeriod: formData.workPeriod,
    }

    try {
      await updateBadgePickupMutation.mutateAsync({
        id: editingBadge.id,
        data: updateData
      })
      setFormData({
        nome: '',
        cpf: '',
        empresa: '',
        shiftId: '',
        workDate: '',
        workStage: 'evento',
        workPeriod: 'dia_inteiro'
      })
      setEditingBadge(null)
      setIsEditing(false)
      setIsModalOpen(false)
    } catch (error) {
      // Erro já tratado pela mutation
    }
  }

  const handleDeleteBadge = async (badge: BadgePickup) => {
    try {
      await deleteBadgePickupMutation.mutateAsync({
        id: badge.id,
        eventId: badge.eventId
      })
    } catch (error) {
      // Erro já tratado pela mutation
    }
  }

  const handleProcessPickup = async () => {
    if (!selectedBadgeForPickup) return

    if (!pickupData.isSelfPickup && !pickupData.pickerName.trim()) {
      toast.error('Nome de quem está retirando é obrigatório')
      return
    }

    const retrieveData = {
      performedBy: 'system', // TODO: usar dados do usuário logado
      isSelfPickup: pickupData.isSelfPickup,
      pickerName: pickupData.isSelfPickup ? undefined : pickupData.pickerName,
      pickerCompany: pickupData.isSelfPickup ? undefined : pickupData.pickerCompany,
    }

    try {
      await processBadgePickupMutation.mutateAsync({
        id: selectedBadgeForPickup.id,
        data: retrieveData
      })

      setSelectedBadgeForPickup(null)
      setPickupData({
        isSelfPickup: true,
        pickerName: '',
        pickerCompany: ''
      })
      setIsPickupModalOpen(false)
    } catch (error) {
      // Erro já tratado pela mutation
    }
  }

  const openPickupModal = (badge: BadgePickup) => {
    setSelectedBadgeForPickup(badge)
    setPickupData({
      isSelfPickup: true,
      pickerName: '',
      pickerCompany: ''
    })
    setIsPickupModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setIsEditing(false)
    setEditingBadge(null)
    setFormData({
      nome: '',
      cpf: '',
      empresa: '',
      shiftId: '',
      workDate: '',
      workStage: 'evento',
      workPeriod: 'dia_inteiro'
    })
  }

  const getStatusBadge = (status: string, isSelfPickup?: boolean) => {
    if (status === 'pendente') {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      )
    }

    return (
      <div className="flex items-center gap-1">
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Retirado
        </Badge>
        {isSelfPickup !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {isSelfPickup ? (
              <>
                <UserCheck className="h-3 w-3 mr-1" />
                Próprio
              </>
            ) : (
              <>
                <UserX className="h-3 w-3 mr-1" />
                Terceiro
              </>
            )}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <EventLayout eventId={eventId} >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BadgeIcon className="h-6 w-6 text-blue-600" />
              Retirada de Crachás
            </h1>
            <p className="text-gray-600 mt-1">
              {evento?.name || 'Carregando...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Retirados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.retiradas}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Próprio</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.selfPickups}</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Terceiros</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.thirdPartyPickups}</p>
                </div>
                <UserX className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, CPF ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Todos os turnos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os turnos</SelectItem>
                  {eventDays.map(day => (
                    <SelectItem key={day.id} value={day.id}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-only-pending"
                  checked={showOnlyPending}
                  onCheckedChange={checked => setShowOnlyPending(checked === true)}
                />
                <Label htmlFor="show-only-pending" className="text-sm">
                  Apenas pendentes
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Crachás ({filteredBadges.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredBadges.map(badge => (
                <div
                  key={badge.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-medium">{badge.nome}</p>
                      {badge.cpf && <p className="text-sm text-gray-500">{badge.cpf}</p>}
                    </div>
                    <div>
                      {badge.empresa && (
                        <p className="text-sm flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {badge.empresa}
                        </p>
                      )}
                    </div>
                    <div>
                      {getStatusBadge(badge.status, badge.isSelfPickup)}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {badge.status === 'pendente' && (
                        <Button
                          size="sm"
                          onClick={() => openPickupModal(badge)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Retirar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditBadge(badge)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteBadge(badge)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredBadges.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {badges.length === 0 ? (
                    <div>
                      <BadgeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhuma entrada de crachá cadastrada</p>
                      <Button onClick={() => setIsModalOpen(true)} className="mt-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeira entrada
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhuma entrada encontrada com os filtros aplicados</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal para criar/editar entrada */}
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Editar Entrada' : 'Nova Entrada de Crachá'}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? 'Atualize os dados da entrada' : 'Crie uma nova entrada para retirada de crachá'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="turno">Turno</Label>
                <Select value={formData.shiftId} onValueChange={(value) => setFormData(prev => ({ ...prev, shiftId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventDays.map(day => (
                      <SelectItem key={day.id} value={day.id}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={closeModal} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={isEditing ? handleUpdateBadge : handleCreateBadge}
                  className="flex-1"
                >
                  {isEditing ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para processar retirada */}
        <Dialog open={isPickupModalOpen} onOpenChange={setIsPickupModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Processar Retirada</DialogTitle>
              <DialogDescription>
                {selectedBadgeForPickup && (
                  <>Processando retirada do crachá de <strong>{selectedBadgeForPickup.nome}</strong></>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-self-pickup"
                  checked={pickupData.isSelfPickup}
                  onCheckedChange={(checked) => setPickupData(prev => ({
                    ...prev,
                    isSelfPickup: !!checked,
                    pickerName: !!checked ? '' : prev.pickerName,
                    pickerCompany: !!checked ? '' : prev.pickerCompany
                  }))}
                />
                <Label htmlFor="is-self-pickup">A própria pessoa está retirando?</Label>
              </div>

              {!pickupData.isSelfPickup && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-md">
                  <div>
                    <Label htmlFor="picker-name">Nome de quem está retirando *</Label>
                    <Input
                      id="picker-name"
                      value={pickupData.pickerName}
                      onChange={(e) => setPickupData(prev => ({ ...prev, pickerName: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="picker-company">Empresa de quem está retirando</Label>
                    <Input
                      id="picker-company"
                      value={pickupData.pickerCompany}
                      onChange={(e) => setPickupData(prev => ({ ...prev, pickerCompany: e.target.value }))}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPickupModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcessPickup}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Retirada
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </EventLayout>
  )
}