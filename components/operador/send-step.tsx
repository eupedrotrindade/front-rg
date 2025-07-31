/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Send, ArrowLeft, CheckCircle, XCircle, Clock, Database } from "lucide-react"
import { useRouter } from "next/navigation"

interface SendStepProps {
  data: any[]
  sendInBatches?: (data: any[], batchSize?: number) => Promise<{ success: any[]; failed: any[] }>
  sendResult?: { success: any[]; failed: any[] } | null
  setSendResult?: (result: { success: any[]; failed: any[] } | null) => void
}

interface SendStats {
  total: number
  sent: number
  success: number
  failed: number
  progress: number
}

export default function SendStep({ data, sendInBatches, setSendResult }: SendStepProps) {
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [stats, setStats] = useState<SendStats>({
    total: data.length,
    sent: 0,
    success: 0,
    failed: 0,
    progress: 0,
  })
  const [currentRecord, setCurrentRecord] = useState<string>("")

  const startSending = async () => {
    setIsSending(true)
    if (sendInBatches) {
      // Envio real em lote
      const batchSize = 20
      let sent = 0
      let success = 0
      let failed = 0
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        setCurrentRecord(`Enviando registros ${i + 1} a ${Math.min(i + batchSize, data.length)}`)
        const result = await sendInBatches(batch, batchSize)
        sent += batch.length
        success += result.success.length
        failed += result.failed.length
        setStats({
          total: data.length,
          sent,
          success,
          failed,
          progress: (sent / data.length) * 100,
        })
      }
      setIsSending(false)
      setIsComplete(true)
      setCurrentRecord("Envio concluído!")
      setStats((prev) => ({ ...prev, progress: 100 }))
      if (setSendResult) setSendResult({ success: data.slice(0, success), failed: data.slice(success) })
    } else {
      // Simulação antiga
      simulateSending()
    }
  }

  const simulateSending = () => {
    let sent = 0
    let success = 0
    let failed = 0

    const interval = setInterval(() => {
      if (sent < data.length) {
        const record = data[sent]
        setCurrentRecord(`Enviando: ${record.nome}`)

        // Simular sucesso/falha (90% sucesso)
        const isSuccess = Math.random() > 0.1

        sent++
        if (isSuccess) {
          success++
        } else {
          failed++
        }

        const progress = (sent / data.length) * 100

        setStats({
          total: data.length,
          sent,
          success,
          failed,
          progress,
        })

        if (sent === data.length) {
          clearInterval(interval)
          setIsSending(false)
          setIsComplete(true)
          setCurrentRecord("Envio concluído!")
        }
      }
    }, 500) // Simular 500ms por registro
  }

  const resetSending = () => {
    setIsSending(false)
    setIsComplete(false)
    setStats({
      total: data.length,
      sent: 0,
      success: 0,
      failed: 0,
      progress: 0,
    })
    setCurrentRecord("")
    if (setSendResult) setSendResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Passo 4: Envio de Dados
        </CardTitle>
        <CardDescription>
          {!isSending && !isComplete && "Pronto para enviar os dados para o banco de dados"}
          {isSending && "Enviando dados em tempo real..."}
          {isComplete && "Envio concluído com sucesso!"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Database className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold text-orange-600">{stats.sent}</div>
              <div className="text-sm text-gray-600">Enviados</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <div className="text-sm text-gray-600">Sucessos</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Falhas</div>
            </CardContent>
          </Card>
        </div>

        {/* Progresso */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Progresso do Envio</span>
            <span className="text-sm font-medium text-gray-600">{Math.round(stats.progress)}%</span>
          </div>
          <Progress value={stats.progress} className="h-3" />

          {currentRecord && <div className="text-sm text-gray-600 text-center">{currentRecord}</div>}
        </div>

        {/* Status */}
        <div className="space-y-4">
          {!isSending && !isComplete && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Pronto para enviar</h4>
              <p className="text-sm text-blue-800">
                {data.length} registros serão inseridos no banco de dados. Clique em &quot;Iniciar Envio&quot; para começar.
              </p>
            </div>
          )}

          {isSending && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Enviando dados...
              </h4>
              <p className="text-sm text-orange-800">Por favor, não feche esta página durante o envio.</p>
            </div>
          )}

          {isComplete && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Envio concluído!
              </h4>
              <div className="text-sm text-green-800 space-y-1">
                <p>• {stats.success} registros inseridos com sucesso</p>
                {stats.failed > 0 && <p>• {stats.failed} registros falharam</p>}
                <p>• Taxa de sucesso: {Math.round((stats.success / stats.total) * 100)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()} disabled={isSending}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="space-x-2">
            {!isSending && !isComplete && (
              <Button onClick={startSending}>
                <Send className="w-4 h-4 mr-2" />
                Iniciar Envio
              </Button>
            )}

            {isComplete && (
              <Button onClick={resetSending} variant="outline">
                Enviar Novamente
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
