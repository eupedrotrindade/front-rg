/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
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
  Loader2,
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
  UserX,
  Eye
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
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf"

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isQuickInsertModalOpen, setIsQuickInsertModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [editingBadge, setEditingBadge] = useState<BadgePickup | null>(null)
  const [selectedBadgeForPickup, setSelectedBadgeForPickup] = useState<BadgePickup | null>(null)
  const [selectedBadgeForView, setSelectedBadgeForView] = useState<BadgePickup | null>(null)
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

  // Estados para importação
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<any[]>([])
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para inserção rápida
  const [quickInsertText, setQuickInsertText] = useState('')
  const [quickInsertShift, setQuickInsertShift] = useState('')
  const [isProcessingQuickInsert, setIsProcessingQuickInsert] = useState(false)

  // Hooks para dados
  const { data: eventos = [] } = useEventos()
  const { data: badges = [], isLoading: isLoadingBadges, refetch } = useBadgePickupsByEvent(eventId)
  const { data: apiStats, isLoading: isLoadingStats } = useBadgePickupStats(eventId)

  // Mutations
  const createBadgePickupMutation = useCreateBadgePickup()
  const updateBadgePickupMutation = useUpdateBadgePickup()
  const deleteBadgePickupMutation = useDeleteBadgePickup()
  const processBadgePickupMutation = useProcessBadgePickup()
  const exportPDFMutation = useExportPDF()

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

            // Corrigir timezone usando T12:00:00.000Z para evitar datas invertidas
            const formattedDate = new Date(item.date + 'T12:00:00.000Z').toISOString().split('T')[0]
            const period = item.period || 'dia_inteiro'

            const periodLabel = period === 'diurno' ? '☀️ Diurno' :
              period === 'noturno' ? '🌙 Noturno' : '🌞 Dia Inteiro'

            const shiftId = `${formattedDate}-${stage}-${period}`

            days.push({
              id: shiftId,
              // Formatar data em DD/MM/YYYY para exibição
              label: `${stageName} - ${new Date(item.date + 'T12:00:00.000Z').toLocaleDateString('pt-BR')} (${periodLabel})`,
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

  const openViewModal = (badge: BadgePickup) => {
    setSelectedBadgeForView(badge)
    setIsViewModalOpen(true)
  }

  // Função para baixar template Excel
  const downloadTemplate = () => {
    const templateData = [
      {
        'Nome': 'João Silva',
        'CPF': '123.456.789-00',
        'Empresa': 'Empresa ABC'
      },
      {
        'Nome': 'Maria Santos',
        'CPF': '',
        'Empresa': 'Empresa XYZ'
      },
      {
        'Nome': 'Pedro Costa',
        'CPF': '555.666.777-88',
        'Empresa': ''
      },
      {
        'Nome': 'Ana Oliveira',
        'CPF': '',
        'Empresa': ''
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')

    // Adicionar instruções como comentário
    const instructions = `
INSTRUÇÕES PARA PREENCHIMENTO:
- Nome: Nome completo da pessoa (obrigatório)
- CPF: CPF da pessoa (opcional, formato: 000.000.000-00)
- Empresa: Nome da empresa (opcional)

OBSERVAÇÕES:
- Mantenha os cabeçalhos na primeira linha
- Remova as linhas de exemplo antes de importar
- Os turnos serão selecionados na próxima etapa
    `.trim()

    // Adicionar uma planilha com instruções
    const instructionWs = XLSX.utils.aoa_to_sheet([
      ['INSTRUÇÕES PARA IMPORTAÇÃO'],
      [''],
      ['1. Preencha a planilha "Template" com os dados dos participantes'],
      ['2. Nome é obrigatório, CPF e Empresa são opcionais (podem ficar vazios)'],
      ['3. Mantenha os cabeçalhos na primeira linha'],
      ['4. Remova as linhas de exemplo antes de importar'],
      ['5. Salve o arquivo e faça o upload'],
      ['6. Selecione os turnos para associar aos participantes'],
      [''],
      ['COLUNAS:'],
      ['- Nome: Nome completo (OBRIGATÓRIO - não pode ficar vazio)'],
      ['- CPF: CPF no formato 000.000.000-00 (OPCIONAL - pode ficar vazio)'],
      ['- Empresa: Nome da empresa (OPCIONAL - pode ficar vazio)'],
      [''],
      ['EXEMPLOS NO TEMPLATE:'],
      ['- João Silva: tem CPF e Empresa'],
      ['- Maria Santos: só tem Empresa (CPF vazio)'],
      ['- Pedro Costa: só tem CPF (Empresa vazia)'],
      ['- Ana Oliveira: só tem Nome (CPF e Empresa vazios)']
    ])
    XLSX.utils.book_append_sheet(wb, instructionWs, 'Instruções')

    XLSX.writeFile(wb, `template-crachas-${evento?.name || 'evento'}.xlsx`)
    toast.success('Template baixado com sucesso!')
  }

  // Função para processar arquivo Excel
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
      return
    }

    setImportFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) {
          toast.error('Arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados')
          return
        }

        // Assumir que a primeira linha são os cabeçalhos
        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]

        // Mapear dados
        const mappedData = rows
          .filter(row => row && row.length > 0 && row[0]) // Filtrar linhas vazias
          .map(row => {
            const obj: any = {}
            headers.forEach((header, index) => {
              const normalizedHeader = header.toLowerCase().trim()
              if (normalizedHeader.includes('nome')) {
                obj.nome = row[index]?.toString().trim() || ''
              } else if (normalizedHeader.includes('cpf')) {
                // CPF pode ficar vazio
                const cpfValue = row[index]?.toString().trim()
                obj.cpf = cpfValue || null
              } else if (normalizedHeader.includes('empresa')) {
                // Empresa pode ficar vazia
                const empresaValue = row[index]?.toString().trim()
                obj.empresa = empresaValue || null
              }
            })
            return obj
          })
          .filter(item => item.nome && item.nome.trim() !== '') // Apenas itens com nome não vazio

        if (mappedData.length === 0) {
          toast.error('Nenhum dado válido encontrado no arquivo')
          return
        }

        setImportData(mappedData)
        toast.success(`${mappedData.length} registros carregados. Agora selecione os turnos.`)
      } catch (error) {
        console.error('Erro ao processar arquivo:', error)
        toast.error('Erro ao processar arquivo. Verifique se é um arquivo Excel válido.')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // Função para processar importação
  const handleImport = async () => {
    if (!importData.length) {
      toast.error('Nenhum dado para importar')
      return
    }

    if (selectedShifts.length === 0) {
      toast.error('Selecione pelo menos um turno')
      return
    }

    setIsProcessingImport(true)

    try {
      let successCount = 0
      let errorCount = 0

      for (const person of importData) {
        for (const shiftId of selectedShifts) {
          // Extrair informações do shift
          const parts = shiftId.split('-')
          const workDate = `${parts[0]}-${parts[1]}-${parts[2]}`
          const workStage = parts[3] as 'montagem' | 'evento' | 'desmontagem'
          const workPeriod = parts[4] as 'diurno' | 'noturno' | 'dia_inteiro'

          const badgeData = {
            eventId,
            nome: person.nome,
            cpf: person.cpf && person.cpf.trim() !== '' ? person.cpf : undefined,
            empresa: person.empresa && person.empresa.trim() !== '' ? person.empresa : undefined,
            status: 'pendente' as const,
            shiftId,
            workDate,
            workStage,
            workPeriod,
          }

          try {
            await createBadgePickupMutation.mutateAsync(badgeData)
            successCount++
          } catch (error) {
            errorCount++
            console.error('Erro ao criar entrada:', error)
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} entradas criadas com sucesso!`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} entradas falharam ao serem criadas`)
      }

      // Limpar estados
      setImportData([])
      setImportFile(null)
      setSelectedShifts([])
      setIsImportModalOpen(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Recarregar dados
      refetch()
    } catch (error) {
      toast.error('Erro durante a importação')
    } finally {
      setIsProcessingImport(false)
    }
  }

  // Função para alternar seleção de turno
  const toggleShiftSelection = (shiftId: string) => {
    setSelectedShifts(prev =>
      prev.includes(shiftId)
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    )
  }

  // Função para processar inserção rápida
  const handleQuickInsert = async () => {
    if (!quickInsertText.trim()) {
      toast.error('Digite pelo menos um nome')
      return
    }

    if (!quickInsertShift) {
      toast.error('Selecione um turno')
      return
    }

    setIsProcessingQuickInsert(true)

    try {
      // Processar texto: cada linha é uma entrada, separada por vírgula para nome,cpf,empresa
      const lines = quickInsertText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      if (lines.length === 0) {
        toast.error('Nenhuma entrada válida encontrada')
        return
      }

      // Extrair informações do shift
      const parts = quickInsertShift.split('-')
      const workDate = `${parts[0]}-${parts[1]}-${parts[2]}`
      const workStage = parts[3] as 'montagem' | 'evento' | 'desmontagem'
      const workPeriod = parts[4] as 'diurno' | 'noturno' | 'dia_inteiro'

      let successCount = 0
      let errorCount = 0

      for (const line of lines) {
        // Separar por vírgula: nome,cpf,empresa
        const parts = line.split(',').map(part => part.trim())
        const nome = parts[0] || ''
        const cpf = parts[1] || ''
        const empresa = parts[2] || ''

        if (!nome) {
          errorCount++
          continue
        }

        const badgeData = {
          eventId,
          nome,
          cpf: cpf || undefined,
          empresa: empresa || undefined,
          status: 'pendente' as const,
          shiftId: quickInsertShift,
          workDate,
          workStage,
          workPeriod,
        }

        try {
          await createBadgePickupMutation.mutateAsync(badgeData)
          successCount++
        } catch (error) {
          errorCount++
          console.error('Erro ao criar entrada:', error)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} entrada(s) criada(s) com sucesso!`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} entrada(s) falharam`)
      }

      // Limpar estados
      setQuickInsertText('')
      setQuickInsertShift('')
      setIsQuickInsertModalOpen(false)

      // Recarregar dados
      refetch()
    } catch (error) {
      toast.error('Erro durante a inserção rápida')
    } finally {
      setIsProcessingQuickInsert(false)
    }
  }

  // Função para selecionar/desselecionar todos os turnos
  const toggleAllShifts = () => {
    if (selectedShifts.length === eventDays.length) {
      setSelectedShifts([])
    } else {
      setSelectedShifts(eventDays.map(day => day.id))
    }
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

  // Função para exportar relatório PDF
  const handleExportPDF = () => {
    if (!evento || filteredBadges.length === 0) {
      toast.error('Não há dados para exportar')
      return
    }

    // Preparar dados para exportação
    const exportData = filteredBadges.map(badge => {
      const dayInfo = eventDays.find(day => day.id === badge.shiftId)
      return {
        nome: badge.nome || '',
        cpf: badge.cpf || '',
        empresa: badge.empresa || '',
        turno: dayInfo?.label || badge.shiftId || '',
        status: badge.status === 'pendente' ? 'Pendente' : 'Retirado',
        tipoRetirada: badge.status === 'retirada'
          ? (badge.isSelfPickup ? 'Próprio' : 'Terceiro')
          : '',
        quemRetirou: !badge.isSelfPickup && badge.status === 'retirada'
          ? (badge.pickedUpBy || '')
          : '',
        empresaRetirou: !badge.isSelfPickup && badge.status === 'retirada'
          ? (badge.pickerCompany || '')
          : '',
        dataRetirada: badge.updatedAt && badge.status === 'retirada'
          ? new Date(badge.updatedAt).toLocaleDateString('pt-BR')
          : '',
      }
    })

    const titulo = `Relatório de Retirada de Crachás - ${evento.name}`

    exportPDFMutation.mutate({
      titulo,
      tipo: "retiradaCrachas",
      dados: exportData
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
    <EventLayout eventId={eventId} eventName={evento?.name} >
      <div className="space-y-6 p-8">
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
            <Button variant="outline" size="sm" onClick={() => setIsQuickInsertModalOpen(true)}>
              <Package className="h-4 w-4 mr-2" />
              Inserção Rápida
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exportPDFMutation.isPending || filteredBadges.length === 0}
            >
              {exportPDFMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Pendentes</p>
                  <p className="text-3xl font-bold">{stats.pendentes}</p>
                </div>
                <AlertCircle className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Retirados</p>
                  <p className="text-3xl font-bold">{stats.retiradas}</p>
                </div>
                <CheckCircle className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Próprio</p>
                  <p className="text-3xl font-bold">{stats.selfPickups}</p>
                </div>
                <UserCheck className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Terceiros</p>
                  <p className="text-3xl font-bold">{stats.thirdPartyPickups}</p>
                </div>
                <UserX className="h-8 w-8 opacity-80" />
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
                <SelectContent className="max-w-lg">
                  <SelectItem value="all">Todos os turnos</SelectItem>
                  {eventDays.map(day => {
                    const stageColors = {
                      montagem: { text: 'text-blue-800', badge: 'bg-blue-100' },
                      evento: { text: 'text-green-800', badge: 'bg-green-100' },
                      desmontagem: { text: 'text-orange-800', badge: 'bg-orange-100' }
                    }
                    const colors = stageColors[day.type as keyof typeof stageColors] || stageColors.evento

                    return (
                      <SelectItem key={day.id} value={day.id}>
                        <div className="flex items-center gap-2 w-full">
                          {/* Badge da etapa */}
                          <span className={`${colors.badge} ${colors.text} px-2 py-1 rounded-full text-xs font-medium uppercase`}>
                            {day.type}
                          </span>
                          {/* Ícone do período */}
                          <div className="flex items-center gap-1">
                            {day.period === 'diurno' && <Sun className="h-3 w-3 text-yellow-500" />}
                            {day.period === 'noturno' && <Moon className="h-3 w-3 text-blue-600" />}
                            {day.period === 'dia_inteiro' && (
                              <div className="flex gap-0.5">
                                <Sun className="h-2.5 w-2.5 text-yellow-500" />
                                <Moon className="h-2.5 w-2.5 text-blue-600" />
                              </div>
                            )}
                            <span className="text-xs text-gray-600">
                              {day.period === 'diurno' ? 'Diurno' :
                                day.period === 'noturno' ? 'Noturno' :
                                  'Dia Inteiro'}
                            </span>
                          </div>
                          {/* Data formatada */}
                          <span className="text-sm font-medium text-gray-900 ml-auto">
                            {new Date(day.date + 'T12:00:00.000Z').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
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

        {/* Tabela de badges */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    CPF
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Turno
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoadingBadges ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p>Carregando crachás...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredBadges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <BadgeIcon className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-lg font-semibold text-gray-700 mb-2">
                          {badges.length === 0 ? 'Nenhuma entrada de crachá cadastrada' : 'Nenhuma entrada encontrada com os filtros aplicados'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {badges.length === 0 ? 'Crie a primeira entrada de crachá para este evento' : 'Tente ajustar os filtros ou termos de busca'}
                        </p>
                        {badges.length === 0 && (
                          <Button onClick={() => setIsModalOpen(true)} className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Criar primeira entrada
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBadges.map((badge) => (
                    <tr key={badge.id} className="hover:bg-gray-50">
                      {/* Nome */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {badge.nome}
                        </div>
                      </td>

                      {/* CPF */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {badge.cpf || '-'}
                      </td>

                      {/* Empresa */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {badge.empresa ? (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3 text-gray-400" />
                              {badge.empresa}
                            </div>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(badge.status, badge.isSelfPickup)}
                      </td>

                      {/* Turno */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {badge.shiftId ? (
                          <div className="text-xs">
                            {eventDays.find(day => day.id === badge.shiftId)?.label || badge.shiftId}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {badge.status === 'pendente' && (
                            <Button
                              size="sm"
                              onClick={() => openPickupModal(badge)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Retirar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewModal(badge)}
                            className="text-gray-600 border-gray-200 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBadge(badge)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBadge(badge)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para criar/editar entrada */}
        <Dialog open={isModalOpen} onOpenChange={closeModal}>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
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
                  <SelectContent className="max-w-lg">
                    {eventDays.map(day => {
                      const stageColors = {
                        montagem: { text: 'text-blue-800', badge: 'bg-blue-100' },
                        evento: { text: 'text-green-800', badge: 'bg-green-100' },
                        desmontagem: { text: 'text-orange-800', badge: 'bg-orange-100' }
                      }
                      const colors = stageColors[day.type as keyof typeof stageColors] || stageColors.evento

                      return (
                        <SelectItem key={day.id} value={day.id}>
                          <div className="flex items-center gap-2 w-full">
                            {/* Badge da etapa */}
                            <span className={`${colors.badge} ${colors.text} px-2 py-1 rounded-full text-xs font-medium uppercase`}>
                              {day.type}
                            </span>
                            {/* Ícone do período */}
                            <div className="flex items-center gap-1">
                              {day.period === 'diurno' && <Sun className="h-3 w-3 text-yellow-500" />}
                              {day.period === 'noturno' && <Moon className="h-3 w-3 text-blue-600" />}
                              {day.period === 'dia_inteiro' && (
                                <div className="flex gap-0.5">
                                  <Sun className="h-2.5 w-2.5 text-yellow-500" />
                                  <Moon className="h-2.5 w-2.5 text-blue-600" />
                                </div>
                              )}
                              <span className="text-xs text-gray-600">
                                {day.period === 'diurno' ? 'Diurno' :
                                  day.period === 'noturno' ? 'Noturno' :
                                    'Dia Inteiro'}
                              </span>
                            </div>
                            {/* Data formatada */}
                            <span className="text-sm font-medium text-gray-900 ml-auto">
                              {new Date(day.date + 'T12:00:00.000Z').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
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
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
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

        {/* Modal para inserção rápida */}
        <Dialog open={isQuickInsertModalOpen} onOpenChange={setIsQuickInsertModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Inserção Rápida de Crachás</DialogTitle>
              <DialogDescription>
                Adicione múltiplas entradas rapidamente. Uma linha por pessoa, separando dados por vírgula.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Instruções */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">📝 Como usar:</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Formato por linha:</strong> Nome,CPF,Empresa</p>
                  <p><strong>Exemplo:</strong></p>
                  <div className="bg-blue-100 rounded p-2 mt-2 font-mono text-xs">
                    Ryan Silva,123.456.789-00,Empresa ABC<br />
                    Ana Santos,,Empresa XYZ<br />
                    Pedro,987.654.321-00,<br />
                    Maria Silva
                  </div>
                  <p className="mt-2"><strong>Observações:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Apenas o <strong>Nome</strong> é obrigatório</li>
                    <li>CPF e Empresa são opcionais (podem ficar vazios)</li>
                    <li>Separe os campos por vírgula</li>
                    <li>Uma linha = uma pessoa</li>
                  </ul>
                </div>
              </div>

              {/* Seleção de turno */}
              <div className="space-y-2">
                <Label htmlFor="quick-shift">Turno *</Label>
                <Select value={quickInsertShift} onValueChange={setQuickInsertShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o turno para todas as entradas" />
                  </SelectTrigger>
                  <SelectContent className="max-w-lg">
                    {eventDays.map(day => {
                      const stageColors = {
                        montagem: { text: 'text-blue-800', badge: 'bg-blue-100' },
                        evento: { text: 'text-green-800', badge: 'bg-green-100' },
                        desmontagem: { text: 'text-orange-800', badge: 'bg-orange-100' }
                      }
                      const colors = stageColors[day.type as keyof typeof stageColors] || stageColors.evento

                      return (
                        <SelectItem key={day.id} value={day.id}>
                          <div className="flex items-center gap-2 w-full">
                            {/* Badge da etapa */}
                            <span className={`${colors.badge} ${colors.text} px-2 py-1 rounded-full text-xs font-medium uppercase`}>
                              {day.type}
                            </span>
                            {/* Ícone do período */}
                            <div className="flex items-center gap-1">
                              {day.period === 'diurno' && <Sun className="h-3 w-3 text-yellow-500" />}
                              {day.period === 'noturno' && <Moon className="h-3 w-3 text-blue-600" />}
                              {day.period === 'dia_inteiro' && (
                                <div className="flex gap-0.5">
                                  <Sun className="h-2.5 w-2.5 text-yellow-500" />
                                  <Moon className="h-2.5 w-2.5 text-blue-600" />
                                </div>
                              )}
                              <span className="text-xs text-gray-600">
                                {day.period === 'diurno' ? 'Diurno' :
                                  day.period === 'noturno' ? 'Noturno' :
                                    'Dia Inteiro'}
                              </span>
                            </div>
                            {/* Data formatada */}
                            <span className="text-sm font-medium text-gray-900 ml-auto">
                              {new Date(day.date + 'T12:00:00.000Z').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Área de texto */}
              <div className="space-y-2">
                <Label htmlFor="quick-text">Dados dos Participantes *</Label>
                <Textarea
                  id="quick-text"
                  value={quickInsertText}
                  onChange={(e) => setQuickInsertText(e.target.value)}
                  placeholder={`Digite uma pessoa por linha:\n\nRyan Silva,123.456.789-00,Empresa ABC\nAna Santos,,Empresa XYZ\nPedro,987.654.321-00,\nMaria Silva`}
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="text-xs text-gray-500">
                  {quickInsertText.split('\n').filter(line => line.trim()).length} linha(s) digitada(s)
                </div>
              </div>

              {/* Preview */}
              {quickInsertText.trim() && (
                <div className="space-y-2">
                  <Label>Preview das Entradas</Label>
                  <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">CPF</th>
                          <th className="px-3 py-2 text-left">Empresa</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {quickInsertText
                          .split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0)
                          .slice(0, 10)
                          .map((line, index) => {
                            const parts = line.split(',').map(part => part.trim())
                            const nome = parts[0] || ''
                            const cpf = parts[1] || ''
                            const empresa = parts[2] || ''
                            const isValid = nome.length > 0

                            return (
                              <tr key={index} className={isValid ? '' : 'bg-red-50'}>
                                <td className="px-3 py-2">
                                  {nome || <span className="text-red-500 italic">Nome obrigatório</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {cpf || <span className="text-gray-400 italic">vazio</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {empresa || <span className="text-gray-400 italic">vazio</span>}
                                </td>
                                <td className="px-3 py-2">
                                  {isValid ? (
                                    <span className="text-green-600 text-xs">✓ Válido</span>
                                  ) : (
                                    <span className="text-red-600 text-xs">✗ Inválido</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                    {quickInsertText.split('\n').filter(line => line.trim()).length > 10 && (
                      <div className="px-3 py-2 text-center text-gray-500 text-sm bg-gray-50">
                        ... e mais {quickInsertText.split('\n').filter(line => line.trim()).length - 10} linhas
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsQuickInsertModalOpen(false)
                    setQuickInsertText('')
                    setQuickInsertShift('')
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleQuickInsert}
                  disabled={!quickInsertText.trim() || !quickInsertShift || isProcessingQuickInsert}
                  className="flex-1"
                >
                  {isProcessingQuickInsert ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Criar Entradas
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para importação Excel */}
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Importar Crachás via Excel</DialogTitle>
              <DialogDescription>
                Faça o upload de um arquivo Excel com os dados dos participantes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">Baixar Template</h3>
                    <p className="text-sm text-blue-700">
                      Baixe o modelo Excel com as colunas corretas
                    </p>
                  </div>
                  <Button onClick={downloadTemplate} variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Baixar Template
                  </Button>
                </div>
              </div>

              {/* Upload File */}
              <div className="space-y-2">
                <Label>Arquivo Excel</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {importFile ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {importFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {importData.length} registros carregados
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                      >
                        Escolher outro arquivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                      >
                        Escolher arquivo Excel
                      </Button>
                      <p className="text-xs text-gray-500">
                        Formatos aceitos: .xlsx, .xls
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seleção de turnos */}
              {importData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Selecionar Turnos</Label>
                    <Button
                      onClick={toggleAllShifts}
                      variant="outline"
                      size="sm"
                    >
                      {selectedShifts.length === eventDays.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {eventDays.map((day) => {
                      const isSelected = selectedShifts.includes(day.id)
                      const stageColors = {
                        montagem: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100' },
                        evento: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100' },
                        desmontagem: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100' }
                      }
                      const colors = stageColors[day.type as keyof typeof stageColors] || stageColors.evento

                      return (
                        <div
                          key={day.id}
                          className={`border rounded-lg p-3 transition-all cursor-pointer hover:shadow-sm ${isSelected
                            ? `${colors.bg} ${colors.border} ring-2 ring-offset-1 ring-opacity-50`
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                          onClick={() => toggleShiftSelection(day.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`shift-${day.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleShiftSelection(day.id)}
                              className="pointer-events-none"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {/* Badge da etapa */}
                                <span
                                  className={`${colors.badge} ${colors.text} px-2 py-1 rounded-full text-xs font-medium uppercase`}
                                >
                                  {day.type}
                                </span>
                                {/* Ícone do período */}
                                <div className="flex items-center gap-1">
                                  {day.period === 'diurno' && <Sun className="h-4 w-4 text-yellow-500" />}
                                  {day.period === 'noturno' && <Moon className="h-4 w-4 text-blue-600" />}
                                  {day.period === 'dia_inteiro' && (
                                    <div className="flex gap-0.5">
                                      <Sun className="h-3 w-3 text-yellow-500" />
                                      <Moon className="h-3 w-3 text-blue-600" />
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-600 ml-1">
                                    {day.period === 'diurno' ? 'Diurno' :
                                      day.period === 'noturno' ? 'Noturno' :
                                        'Dia Inteiro'}
                                  </span>
                                </div>
                              </div>
                              {/* Data formatada */}
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(day.date + 'T12:00:00.000Z').toLocaleDateString('pt-BR', {
                                  weekday: 'long',
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {selectedShifts.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>{selectedShifts.length}</strong> turno(s) selecionado(s) para{' '}
                        <strong>{importData.length}</strong> pessoa(s) = {' '}
                        <strong>{selectedShifts.length * importData.length}</strong> entradas serão criadas
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview dos dados */}
              {importData.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview dos Dados ({importData.length} registros)</Label>
                  <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">CPF</th>
                          <th className="px-3 py-2 text-left">Empresa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importData.slice(0, 5).map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 font-medium">{item.nome}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.cpf && item.cpf.trim() !== '' ? item.cpf : (
                                <span className="text-gray-400 italic">vazio</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.empresa && item.empresa.trim() !== '' ? item.empresa : (
                                <span className="text-gray-400 italic">vazio</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {importData.length > 5 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-center text-gray-500">
                              ... e mais {importData.length - 5} registros
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportModalOpen(false)
                    setImportFile(null)
                    setImportData([])
                    setSelectedShifts([])
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importData.length || selectedShifts.length === 0 || isProcessingImport}
                  className="flex-1"
                >
                  {isProcessingImport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {importData.length > 0 && selectedShifts.length > 0 && `(${selectedShifts.length * importData.length} entradas)`}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para visualizar detalhes */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes do Crachá
              </DialogTitle>
              <DialogDescription>
                Informações completas da entrada
              </DialogDescription>
            </DialogHeader>
            {selectedBadgeForView && (
              <div className="space-y-4">
                {/* Informações básicas */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Nome</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedBadgeForView.nome}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">CPF</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedBadgeForView.cpf || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Empresa</Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedBadgeForView.empresa || 'Não informada'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedBadgeForView.status, selectedBadgeForView.isSelfPickup)}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Turno</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedBadgeForView.shiftId ? (
                        eventDays.find(day => day.id === selectedBadgeForView.shiftId)?.label || selectedBadgeForView.shiftId
                      ) : (
                        'Não informado'
                      )}
                    </p>
                  </div>

                  {/* Informações de trabalho */}
                  {(selectedBadgeForView.workDate || selectedBadgeForView.workStage || selectedBadgeForView.workPeriod) && (
                    <div className="border-t pt-3">
                      <Label className="text-sm font-medium text-gray-600">Informações de Trabalho</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {selectedBadgeForView.workDate && (
                          <div>
                            <Label className="text-xs text-gray-500">Data</Label>
                            <p className="text-sm text-gray-900">
                              {new Date(selectedBadgeForView.workDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                        {selectedBadgeForView.workStage && (
                          <div>
                            <Label className="text-xs text-gray-500">Etapa</Label>
                            <p className="text-sm text-gray-900 capitalize">
                              {selectedBadgeForView.workStage}
                            </p>
                          </div>
                        )}
                        {selectedBadgeForView.workPeriod && (
                          <div>
                            <Label className="text-xs text-gray-500">Período</Label>
                            <p className="text-sm text-gray-900 flex items-center gap-1">
                              {selectedBadgeForView.workPeriod === 'diurno' && <Sun className="h-3 w-3 text-yellow-500" />}
                              {selectedBadgeForView.workPeriod === 'noturno' && <Moon className="h-3 w-3 text-blue-500" />}
                              {selectedBadgeForView.workPeriod === 'diurno' ? 'Diurno' :
                                selectedBadgeForView.workPeriod === 'noturno' ? 'Noturno' : 'Dia Inteiro'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informações de retirada */}
                  {selectedBadgeForView.status === 'retirada' && (
                    <div className="border-t pt-3">
                      <Label className="text-sm font-medium text-gray-600">Informações de Retirada</Label>
                      <div className="space-y-2 mt-2">
                        <div>
                          <Label className="text-xs text-gray-500">Tipo de Retirada</Label>
                          <p className="text-sm text-gray-900 flex items-center gap-1">
                            {selectedBadgeForView.isSelfPickup ? (
                              <>
                                <UserCheck className="h-3 w-3 text-green-600" />
                                Retirada pela própria pessoa
                              </>
                            ) : (
                              <>
                                <UserX className="h-3 w-3 text-orange-600" />
                                Retirada por terceiro
                              </>
                            )}
                          </p>
                        </div>

                        {!selectedBadgeForView.isSelfPickup && (
                          <>
                            {selectedBadgeForView.pickedUpBy && (
                              <div>
                                <Label className="text-xs text-gray-500">Quem retirou</Label>
                                <p className="text-sm text-gray-900">{selectedBadgeForView.pickedUpBy}</p>
                              </div>
                            )}
                            {selectedBadgeForView.pickerCompany && (
                              <div>
                                <Label className="text-xs text-gray-500">Empresa de quem retirou</Label>
                                <p className="text-sm text-gray-900">{selectedBadgeForView.pickerCompany}</p>
                              </div>
                            )}
                          </>
                        )}


                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="border-t pt-3">
                    <Label className="text-sm font-medium text-gray-600">Informações do Sistema</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {selectedBadgeForView.createdAt && (
                        <div>
                          <Label className="text-xs text-gray-500">Criado em</Label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedBadgeForView.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      )}
                      {selectedBadgeForView.updatedAt && selectedBadgeForView.updatedAt !== selectedBadgeForView.createdAt && (
                        <div>
                          <Label className="text-xs text-gray-500">Atualizado em</Label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedBadgeForView.updatedAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botão de fechar */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => setIsViewModalOpen(false)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </EventLayout>
  )
}