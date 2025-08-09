/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload, FileSpreadsheet, Users, CheckCircle, XCircle,
  AlertTriangle, Loader2, Download, BarChart3, ArrowLeft,
  Play, Pause, Settings, Clock, Package, Calendar, FileDown
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { useEventParticipantsByEvent } from '@/features/eventos/api/query/use-event-participants-by-event'
import { useEventos } from '@/features/eventos/api/query/use-eventos'
import { createMovementCredential, changeCredentialCode } from '@/features/eventos/actions/movement-credentials'
import { getEventAttendanceByEventAndDate, getEventAttendanceByEvent, createEventAttendance } from '@/features/eventos/actions/event-attendance'
import { formatCpf } from '@/lib/utils'
import Link from 'next/link'

// 🎯 INTERFACE IMPORTAÇÃO PRESENÇAS
interface ImportedAttendance {
  nome: string
  cpf: string
  funcao: string
  empresa: string
  tipo_credencial_codigo: string
  pulseira_codigo: string
  checkin_timestamp: string
  status: 'checkin' | 'checkout' | 'ambos'
}

interface ProcessingResult {
  original: ImportedAttendance
  participant?: any
  status: 'success' | 'error' | 'warning' | 'skipped'
  message: string
  action?: 'checkin' | 'checkout' | 'both'
}

interface ImportStats {
  total: number
  processed: number
  success: number
  errors: number
  warnings: number
  skipped: number
}

interface ProcessingConfig {
  participantDelay: number // ms entre participantes
  batchSize: number        // participantes por lote
  batchDelay: number       // ms entre lotes
  eventDate: string        // data do evento (YYYY-MM-DD)
}

export default function ImportacaoPresencas() {
  const params = useParams()
  const eventId = params?.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 🚀 ESTADOS PRINCIPAIS
  const [importedData, setImportedData] = useState<ImportedAttendance[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([])
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'processing' | 'results'>('upload')
  const [stats, setStats] = useState<ImportStats>({
    total: 0, processed: 0, success: 0, errors: 0, warnings: 0, skipped: 0
  })
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    participantDelay: 500,  // 500ms entre participantes
    batchSize: 10,          // 10 participantes por lote
    batchDelay: 2000,       // 2s entre lotes
    eventDate: new Date().toISOString().split('T')[0] // data atual por padrão
  })
  const [isPaused, setIsPaused] = useState(false)
  const [currentBatch, setCurrentBatch] = useState(0)

  // 🔍 HOOKS DE DADOS
  const { data: evento, isLoading: loadingEvent } = useEventos({ id: eventId })
  const { data: participantsData = [], isLoading: loadingParticipants } = useEventParticipantsByEvent({ eventId })

  // 🎯 ALGORITMO DE BUSCA EXATA
  const findParticipantByExactMatch = useCallback((importRecord: ImportedAttendance) => {
    const normalizeString = (str: string) =>
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    const normalizeCPF = (cpf: string) =>
      cpf.replace(/\D/g, '')

    const searchName = normalizeString(importRecord.nome)
    const searchCPF = normalizeCPF(importRecord.cpf)
    const searchCompany = normalizeString(importRecord.empresa)

    return participantsData.find(p => {
      const participantName = normalizeString(p.name)
      const participantCPF = normalizeCPF(p.cpf || '')
      const participantCompany = normalizeString(p.company)

      return participantName === searchName &&
        participantCPF === searchCPF &&
        participantCompany === searchCompany
    })
  }, [participantsData])

  // 📥 FUNÇÃO DE EXPORTAR ERROS
  const exportErrorsToExcel = useCallback(() => {
    const errorResults = processingResults.filter(result => 
      result.status === 'error' || result.status === 'warning'
    )
    
    if (errorResults.length === 0) {
      toast.info('Nenhum erro encontrado para exportar')
      return
    }

    // 📝 PREPARAR DADOS PARA PLANILHA
    const exportData = errorResults.map((result, index) => ({
      '#': index + 1,
      nome: result.original.nome,
      cpf: result.original.cpf,
      funcao: result.original.funcao,
      empresa: result.original.empresa,
      tipo_credencial_codigo: result.original.tipo_credencial_codigo,
      pulseira_codigo: result.original.pulseira_codigo,
      checkin_timestamp: result.original.checkin_timestamp,
      status: result.original.status,
      tipo_erro: result.status === 'error' ? 'ERRO' : 'AVISO',
      motivo: result.message,
      data_processamento: new Date().toLocaleString('pt-BR'),
    }))

    // 🔥 CRIAR WORKBOOK
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    
    // 🎨 AJUSTAR LARGURA DAS COLUNAS
    const columnWidths = [
      { wch: 5 },   // #
      { wch: 30 },  // nome
      { wch: 15 },  // cpf
      { wch: 20 },  // funcao
      { wch: 25 },  // empresa
      { wch: 20 },  // tipo_credencial_codigo
      { wch: 15 },  // pulseira_codigo
      { wch: 20 },  // checkin_timestamp
      { wch: 10 },  // status
      { wch: 10 },  // tipo_erro
      { wch: 50 },  // motivo
      { wch: 20 },  // data_processamento
    ]
    worksheet['!cols'] = columnWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Erros_Importacao')
    
    // 📁 NOME DO ARQUIVO
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const fileName = `erros_importacao_${timestamp}.xlsx`
    
    // 💾 DOWNLOAD
    XLSX.writeFile(workbook, fileName)
    
    toast.success(`Planilha de erros exportada: ${fileName}`)
    console.log(`📥 Exportados ${errorResults.length} erros para ${fileName}`)
  }, [processingResults])

  // 📊 FUNÇÃO DE UPLOAD E PROCESSAMENTO DE ARQUIVO
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        const processedData: ImportedAttendance[] = jsonData.map(row => ({
          nome: row.nome || row.NOME || '',
          cpf: row.cpf || row.CPF || '',
          funcao: row.funcao || row.FUNCAO || '',
          empresa: row.empresa || row.EMPRESA || '',
          tipo_credencial_codigo: row.tipo_credencial_codigo || row.TIPO_CREDENCIAL_CODIGO || '',
          pulseira_codigo: row.pulseira_codigo || row.PULSEIRA_CODIGO || '',
          checkin_timestamp: row.checkin_timestamp || row.CHECKIN_TIMESTAMP || '',
          status: (() => {
            const rawStatus = (row.status || row.STATUS || 'checkin').toLowerCase().trim()
            // Mapear diferentes status para os aceitos
            switch (rawStatus) {
              case 'ativo':
              case 'presente':
              case 'checkin':
                return 'checkin'
              case 'checkout':
              case 'saida':
                return 'checkout'
              case 'ambos':
              case 'completo':
                return 'ambos'
              default:
                return 'checkin' // padrão
            }
          })() as 'checkin' | 'checkout' | 'ambos'
        })).filter(row => row.nome && row.cpf)

        setImportedData(processedData)
        setCurrentStep('preview')
        setStats({
          total: processedData.length,
          processed: 0,
          success: 0,
          errors: 0,
          warnings: 0,
          skipped: 0
        })

        toast.success(`Arquivo processado! ${processedData.length} registros encontrados`)
      } catch (error) {
        toast.error('Erro ao processar arquivo. Verifique o formato.')
        console.error('Erro no processamento:', error)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  // 🔄 PROCESSAMENTO PRINCIPAL
  // ⚡ NOVA LÓGICA: participants → event_attendance check → skip se existe | cria se não existe
  const processImport = useCallback(async () => {
    if (importedData.length === 0) return

    setIsProcessing(true)
    setCurrentStep('processing')
    const results: ProcessingResult[] = []
    let successCount = 0
    let errorCount = 0
    let warningCount = 0
    let skippedCount = 0

    // 🎯 BUSCAR TODOS PARTICIPANTS PRIMEIRO
    console.log(`📋 Iniciando processamento com ${participantsData.length} participants disponíveis`)

    // 📊 BUSCAR TODOS ATTENDANCE EXISTENTES DO EVENTO (QUALQUER DATA)
    let existingAttendance: any[] = []
    try {
      const attendanceResponse = await getEventAttendanceByEvent(eventId)
      existingAttendance = attendanceResponse.data || []
      console.log(`📊 Encontrados ${existingAttendance.length} attendance existentes no evento (todas as datas)`)
    } catch (error) {
      console.log('⚠️ Erro ao buscar attendance existente, continuando sem verificação:', error)
    }

    // 🔄 PROCESSAMENTO EM LOTES COM INTERVALOS
    const totalBatches = Math.ceil(importedData.length / processingConfig.batchSize)
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      setCurrentBatch(batchIndex + 1)
      
      const startIndex = batchIndex * processingConfig.batchSize
      const endIndex = Math.min(startIndex + processingConfig.batchSize, importedData.length)
      const batch = importedData.slice(startIndex, endIndex)
      
      console.log(`🔄 Processando lote ${batchIndex + 1}/${totalBatches} (${batch.length} participants)`)

      for (let i = 0; i < batch.length; i++) {
        const record = batch[i]
        const globalIndex = startIndex + i

        try {
          // ⏸️ VERIFICAR SE PAUSADO
          if (isPaused) {
            console.log('⏸️ Processamento pausado')
            setIsProcessing(false)
            return
          }

          // 🔍 BUSCA PARTICIPANT POR MATCH EXATO
          const participant = findParticipantByExactMatch(record)

          if (!participant) {
            results.push({
              original: record,
              status: 'error',
              message: `❌ Participant não encontrado: ${record.nome} (${formatCpf(record.cpf)}) - ${record.empresa}`
            })
            errorCount++
            continue
          }

          // ⚡ VERIFICAR SE PARTICIPANT JÁ TEM QUALQUER EVENT_ATTENDANCE NO EVENTO
          const hasExistingAttendance = existingAttendance.find(att => att.participantId === participant.id)
          
          console.log(`🔍 Verificando participant ${participant.name} (${participant.id}):`, {
            hasExistingAttendance: !!hasExistingAttendance,
            existingAttendanceId: hasExistingAttendance?.id,
            existingDate: hasExistingAttendance?.date
          })
          
          if (hasExistingAttendance) {
            // 🚫 PULAR COMPLETAMENTE - JÁ TEM ATTENDANCE
            results.push({
              original: record,
              participant,
              status: 'skipped',
              message: `⏭️ Participant já possui event_attendance (Data: ${hasExistingAttendance.date}). Pulando: ${participant.name}`
            })
            skippedCount++
            
            // ⏰ Atualizar progresso e continuar
            setStats(prev => ({
              ...prev,
              processed: globalIndex + 1,
              success: successCount,
              errors: errorCount,
              warnings: warningCount,
              skipped: skippedCount
            }))
            continue
          }

          // 🕒 PROCESSAR TIMESTAMP - USAR DATA SELECIONADA
          const selectedDate = processingConfig.eventDate
          let checkDateTime: string
          
          console.log(`🔍 Debug - Record status: "${record.status}", checkin_timestamp: "${record.checkin_timestamp}"`)
          
          if (record.checkin_timestamp && record.checkin_timestamp.trim()) {
            // Usar horário da planilha, mas com a data selecionada
            const originalTime = new Date(record.checkin_timestamp)
            const timeString = originalTime.toTimeString().split(' ')[0] // HH:MM:SS
            checkDateTime = new Date(`${selectedDate}T${timeString}`).toISOString()
            console.log(`⏰ Usando horário da planilha: ${checkDateTime}`)
          } else {
            // Usar horário atual, mas com a data selecionada
            const now = new Date()
            const timeString = now.toTimeString().split(' ')[0] // HH:MM:SS
            checkDateTime = new Date(`${selectedDate}T${timeString}`).toISOString()
            console.log(`⏰ Usando horário atual: ${checkDateTime}`)
          }

          // 🎯 CRIAR EVENT_ATTENDANCE DIRETAMENTE
          let actionPerformed = ''
          let hasError = false

          // 📝 PREPARAR DADOS DO ATTENDANCE
          const attendanceData = {
            eventId,
            participantId: participant.id,
            date: selectedDate, // usar data selecionada
            performedBy: 'Sistema Import',
            notes: `Importado via planilha - ${record.tipo_credencial_codigo} (Data: ${selectedDate})`,
            checkIn: null as string | null,
            checkOut: null as string | null
          }

          // ⏰ DEFINIR TIMESTAMPS BASEADOS NO STATUS
          console.log(`🎯 Processando status: "${record.status}"`)
          
          if (record.status === 'checkin' || record.status === 'ambos') {
            attendanceData.checkIn = checkDateTime
            actionPerformed += 'Check-in registrado. '
            console.log(`✅ CheckIn definido: ${checkDateTime}`)
          }

          if (record.status === 'checkout' || record.status === 'ambos') {
            attendanceData.checkOut = checkDateTime
            actionPerformed += 'Check-out registrado. '
            console.log(`✅ CheckOut definido: ${checkDateTime}`)
          }
          
          console.log(`📦 Final attendanceData:`, JSON.stringify(attendanceData, null, 2))

          // 🚀 INSERIR NO EVENT_ATTENDANCE
          try {
            await createEventAttendance(attendanceData)
            console.log(`✅ Event_attendance criado para ${participant.name}`)
          } catch (error) {
            hasError = true
            actionPerformed = 'Erro ao criar event_attendance. '
            console.error('❌ Erro event_attendance:', error)
          }

          // 🎯 VINCULAR MOVEMENT_CREDENTIALS (PULSEIRA)
          let wristbandProcessed = ''
          if (record.pulseira_codigo && record.pulseira_codigo.trim()) {
            try {
              await changeCredentialCode(
                eventId,
                participant.id,
                record.pulseira_codigo.trim(),
                participant.credentialId
              )
              wristbandProcessed = 'Pulseira vinculada. '
            } catch (wristbandError) {
              hasError = true
              wristbandProcessed = 'Erro na pulseira. '
              console.error('❌ Erro pulseira:', wristbandError)
            }
          }

          // 📊 RESULTADO FINAL
          if (hasError) {
            results.push({
              original: record,
              participant,
              status: 'warning',
              message: `⚠️ Parcial: ${actionPerformed}${wristbandProcessed}${participant.name}`
            })
            warningCount++
          } else {
            results.push({
              original: record,
              participant,
              status: 'success',
              message: `✅ Event_attendance criado: ${actionPerformed}${wristbandProcessed}${participant.name}`
            })
            successCount++
          }

          // ⏱️ INTERVALO ENTRE PARTICIPANTES
          if (i < batch.length - 1 && processingConfig.participantDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, processingConfig.participantDelay))
          }

        } catch (error) {
          results.push({
            original: record,
            status: 'error',
            message: `❌ Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`
          })
          errorCount++
          console.error('❌ Erro processamento:', error)
        }

        // 📈 ATUALIZAÇÃO CONTÍNUA DO PROGRESSO
        setStats(prev => ({
          ...prev,
          processed: globalIndex + 1,
          success: successCount,
          errors: errorCount,
          warnings: warningCount,
          skipped: skippedCount
        }))
      }

      // 🛑 INTERVALO ENTRE LOTES (exceto no último lote)
      if (batchIndex < totalBatches - 1 && processingConfig.batchDelay > 0) {
        console.log(`⏳ Aguardando ${processingConfig.batchDelay}ms antes do próximo lote...`)
        await new Promise(resolve => setTimeout(resolve, processingConfig.batchDelay))
      }
    }

    setProcessingResults(results)
    setIsProcessing(false)
    setCurrentStep('results')

    toast.success(
      `Importação concluída! ✅ ${successCount} sucessos, ❌ ${errorCount} erros, ⚠️ ${warningCount} avisos, ⏭️ ${skippedCount} pulados`
    )
  }, [importedData, findParticipantByExactMatch, eventId, processingConfig])

  // ⚙️ COMPONENTE DE CONFIGURAÇÃO
  const ConfigSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configurações de Processamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 📅 DATA DO EVENTO */}
        <div className="p-4 bg-blue-50 rounded-lg mb-4">
          <Label htmlFor="eventDate" className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" />
            Data do Evento
          </Label>
          <Input
            id="eventDate"
            type="date"
            value={processingConfig.eventDate}
            onChange={(e) => setProcessingConfig(prev => ({
              ...prev,
              eventDate: e.target.value
            }))}
            className="w-full md:w-auto"
          />
          <p className="text-xs text-blue-600 mt-1">
            Esta data será usada para todos os registros de attendance importados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="participantDelay" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Intervalo entre Participantes (ms)
            </Label>
            <Input
              id="participantDelay"
              type="number"
              min="0"
              max="10000"
              step="100"
              value={processingConfig.participantDelay}
              onChange={(e) => setProcessingConfig(prev => ({
                ...prev,
                participantDelay: parseInt(e.target.value) || 0
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="batchSize" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Participantes por Lote
            </Label>
            <Input
              id="batchSize"
              type="number"
              min="1"
              max="100"
              value={processingConfig.batchSize}
              onChange={(e) => setProcessingConfig(prev => ({
                ...prev,
                batchSize: parseInt(e.target.value) || 1
              }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="batchDelay" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Intervalo entre Lotes (ms)
            </Label>
            <Input
              id="batchDelay"
              type="number"
              min="0"
              max="30000"
              step="500"
              value={processingConfig.batchDelay}
              onChange={(e) => setProcessingConfig(prev => ({
                ...prev,
                batchDelay: parseInt(e.target.value) || 0
              }))}
            />
          </div>
        </div>
        
        <Alert>
          <BarChart3 className="w-4 h-4" />
          <AlertDescription>
            <strong>Estimativa:</strong> {Math.ceil(importedData.length / processingConfig.batchSize)} lotes, 
            ~{Math.round((importedData.length * processingConfig.participantDelay + 
              Math.ceil(importedData.length / processingConfig.batchSize) * processingConfig.batchDelay) / 1000)}s total
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )

  // 🎨 COMPONENTE DE PROGRESSO
  const ProgressSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Event_Attendance - Progresso da Importação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progresso: {stats.processed} / {stats.total}</span>
            <span>{Math.round((stats.processed / stats.total) * 100)}%</span>
          </div>
          <Progress value={(stats.processed / stats.total) * 100} />
        </div>

        {/* 📊 INFORMAÇÕES DE LOTE */}
        {isProcessing && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Lote atual: {currentBatch} / {Math.ceil(importedData.length / processingConfig.batchSize)}
              </span>
              <Button
                size="sm"
                variant={isPaused ? "default" : "secondary"}
                onClick={() => setIsPaused(!isPaused)}
                className="ml-2"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Continuar
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Pausar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            <div className="text-xs text-muted-foreground">Sucessos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <div className="text-xs text-muted-foreground">Erros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <div className="text-xs text-muted-foreground">Avisos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.skipped}</div>
            <div className="text-xs text-muted-foreground">Pulados</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loadingEvent || loadingParticipants) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando dados do evento...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 🎯 HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/operador/painel/${eventId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Importação Event_Attendance</h1>
            <p className="text-muted-foreground">
              Inserção direta na tabela event_attendance • Evento: {Array.isArray(evento) ? evento[0]?.name : evento?.name}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Users className="w-4 h-4 mr-2" />
          {participantsData.length} Participantes
        </Badge>
      </div>

      {/* ⚡ PASSO 1: UPLOAD */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload da Planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <FileSpreadsheet className="w-4 h-4" />
              <AlertDescription>
                <strong>Formato esperado:</strong> nome | cpf | funcao | empresa | tipo_credencial_codigo | pulseira_codigo | checkin_timestamp | status
                <br />
                <strong>Status aceitos:</strong> checkin, checkout, ambos, ativo, presente, saida, completo
                <br />
                <strong>🎯 Foco event_attendance:</strong> Inserção direta na tabela event_attendance. Se já existe → pula. Se não existe → cria novo registro.
                <br />
                <strong>📝 Funcionalidade:</strong> pulseira_codigo vincula automaticamente movement_credentials
              </AlertDescription>
            </Alert>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-semibold mb-2">Clique para selecionar arquivo</p>
              <p className="text-sm text-muted-foreground">Formatos: .xlsx, .xls</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* 👁️ PASSO 2: PREVIEW */}
      {currentStep === 'preview' && (
        <div className="space-y-4">
          <ConfigSection />
          
          <Card>
            <CardHeader>
              <CardTitle>Preview dos Dados ({importedData.length} registros)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid gap-2">
                  {importedData.slice(0, 5).map((record, index) => (
                    <div key={index} className="p-3 border rounded text-sm">
                      <strong>{record.nome}</strong> | {formatCpf(record.cpf)} | {record.empresa} |
                      {record.pulseira_codigo && <span> Pulseira: <Badge variant="secondary">{record.pulseira_codigo}</Badge> |</span>}
                      Status: <Badge variant="outline">{record.status}</Badge>
                    </div>
                  ))}
                  {importedData.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ... e mais {importedData.length - 5} registros
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={() => setCurrentStep('upload')} variant="outline">
                  Voltar
                </Button>
                <Button onClick={processImport} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Iniciar Processamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ⚙️ PASSO 3: PROCESSAMENTO */}
      {currentStep === 'processing' && (
        <div className="space-y-4">
          <ProgressSection />
          {isProcessing && (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin mr-4" />
                <span className="text-lg">Processando registros...</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 📊 PASSO 4: RESULTADOS E INSIGHTS */}
      {currentStep === 'results' && (
        <div className="space-y-6">
          <ProgressSection />

          {/* 💡 INSIGHTS DASHBOARD */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Dashboard de Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-700 mb-2">✅ Sucessos</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                  <p className="text-sm text-green-600">
                    {((stats.success / stats.total) * 100).toFixed(1)}% do total
                  </p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold text-red-700 mb-2">❌ Erros</h3>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                  <p className="text-sm text-red-600">
                    {((stats.errors / stats.total) * 100).toFixed(1)}% do total
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-700 mb-2">⚠️ Avisos</h3>
                  <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
                  <p className="text-sm text-yellow-600">
                    {((stats.warnings / stats.total) * 100).toFixed(1)}% do total
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-700 mb-2">⏭️ Pulados</h3>
                  <p className="text-2xl font-bold text-blue-600">{stats.skipped}</p>
                  <p className="text-sm text-blue-600">
                    {((stats.skipped / stats.total) * 100).toFixed(1)}% do total
                  </p>
                </div>
              </div>

              {/* 🎯 PRINCIPAIS PROBLEMAS */}
              {stats.errors > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-red-700">Principais Problemas Encontrados:</h4>
                    <Button
                      onClick={exportErrorsToExcel}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 text-red-700 border-red-200 hover:bg-red-50"
                    >
                      <FileDown className="w-4 h-4" />
                      Exportar Todos os Erros
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {processingResults
                      .filter(r => r.status === 'error')
                      .slice(0, 3)
                      .map((result, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{result.original.nome}</strong>: {result.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 📋 RESULTADOS DETALHADOS */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {processingResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded border-l-4 ${
                    result.status === 'success' ? 'border-green-500 bg-green-50' :
                    result.status === 'error' ? 'border-red-500 bg-red-50' :
                    result.status === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    result.status === 'skipped' ? 'border-blue-500 bg-blue-50' :
                    'border-gray-500 bg-gray-50'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <strong>{result.original.nome}</strong> | {formatCpf(result.original.cpf)}
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.message}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {result.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {result.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                        {result.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        {result.status === 'skipped' && <ArrowLeft className="w-5 h-5 text-blue-500 rotate-90" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={() => {
                  setCurrentStep('upload')
                  setImportedData([])
                  setProcessingResults([])
                }} variant="outline">
                  Nova Importação
                </Button>
                
                {/* 📥 BOTÃO DE EXPORTAR ERROS */}
                {(stats.errors > 0 || stats.warnings > 0) && (
                  <Button
                    onClick={exportErrorsToExcel}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Baixar Erros ({stats.errors + stats.warnings})
                  </Button>
                )}
                
                <Link href={`/operador/painel/${eventId}`}>
                  <Button>
                    Voltar ao Painel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}