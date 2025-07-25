/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Upload, Database, Filter, Send } from "lucide-react"
import ImportStep from "@/components/operador/import-step"
import SelectionStep from "@/components/operador/selection-step"
import FilterStep from "@/components/operador/filter-step"
import SendStep from "@/components/operador/send-step"

const steps = [
  {
    id: 1,
    title: "Importar",
    description: "Importar planilha do Excel",
    icon: Upload,
  },
  {
    id: 2,
    title: "Seleção",
    description: "Selecionar dados para inserção",
    icon: Database,
  },
  {
    id: 3,
    title: "Filtro de Duplicados",
    description: "Filtrar dados duplicados",
    icon: Filter,
  },
  {
    id: 4,
    title: "Envio",
    description: "Enviar dados e acompanhar progresso",
    icon: Send,
  },
]

// Função utilitária para validar CPF
function isValidCpf(cpf: string) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

// Função para detectar duplicados
function detectDuplicates(data: any[], existingCpfs: string[]) {
  const cpfsArquivo: string[] = [];
  const duplicados: any[] = [];
  const unicos: any[] = [];
  data.forEach(reg => {
    const cpfAtual = String(reg.cpf).replace(/\D/g, "");
    if (existingCpfs.includes(cpfAtual) || cpfsArquivo.includes(cpfAtual)) {
      duplicados.push(reg);
    } else {
      cpfsArquivo.push(cpfAtual);
      unicos.push(reg);
    }
  });
  return { duplicados, unicos };
}

// Função para envio em lote (mock, adapte para seu backend)
async function sendInBatches(data: any[], batchSize = 20) {
  const results: { success: any[]; failed: any[] } = { success: [], failed: [] };
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      // await api.post("/endpoint", batch)
      results.success.push(...batch);
    } catch (e) {
      results.failed.push(...batch);
    }
  }
  return results;
}

export default function ExcelImportWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [excelData, setExcelData] = useState<any[]>([])
  const [selectedData, setSelectedData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [existingCpfs, setExistingCpfs] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [uniques, setUniques] = useState<any[]>([])
  const [sendResult, setSendResult] = useState<{ success: any[]; failed: any[] } | null>(null)

  // Simular busca de CPFs já existentes no backend (pode ser via API)
  useEffect(() => {
    // Exemplo: buscar do backend
    // fetch('/api/cpfs').then(r => r.json()).then(setExistingCpfs)
    setExistingCpfs([]) // Aqui vazio, mas adapte para seu backend
  }, [])

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId)
  const isStepCurrent = (stepId: number) => currentStep === stepId
  const isStepAccessible = (stepId: number) => stepId <= currentStep

  const completeStep = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }
  }

  const goToStep = (stepId: number) => {
    if (isStepAccessible(stepId)) {
      setCurrentStep(stepId)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      completeStep(currentStep)
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ImportStep
            onDataImported={(data) => {
              // Validação de campos obrigatórios e CPF
              const obrigatorios = ["nome", "cpf", "funcao", "empresa", "tipo_credencial"];
              const validos = data.filter((item) =>
                obrigatorios.every((campo) => item[campo] && String(item[campo]).trim() !== "") &&
                isValidCpf(String(item.cpf))
              );
              setExcelData(validos)
              nextStep()
            }}
          />
        )
      case 2:
        return (
          <SelectionStep
            data={excelData}
            onDataSelected={(data) => {
              setSelectedData(data)
              nextStep()
            }}
            onBack={prevStep}
          />
        )
      case 3:
        return (
          <FilterStep
            data={selectedData}
            onDataFiltered={(data) => {
              // Detectar duplicados
              const { duplicados, unicos } = detectDuplicates(data, existingCpfs)
              setDuplicates(duplicados)
              setUniques(unicos)
              setFilteredData(unicos)
              nextStep()
            }}
            onBack={prevStep}
            duplicates={duplicates}
            uniques={uniques}
          />
        )
      case 4:
        return <SendStep data={filteredData} onBack={prevStep} sendInBatches={sendInBatches} sendResult={sendResult} setSendResult={setSendResult} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Importação de Dados Excel</h1>
          <p className="text-gray-600">Importe, selecione, filtre e envie seus dados em 4 passos simples</p>
        </div>

        {/* Stepper */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isCompleted = isStepCompleted(step.id)
                const isCurrent = isStepCurrent(step.id)
                const isAccessible = isStepAccessible(step.id)

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => goToStep(step.id)}
                        disabled={!isAccessible}
                        className={`
                          flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                          ${
                            isCompleted
                              ? "bg-green-500 border-green-500 text-white"
                              : isCurrent
                                ? "bg-blue-500 border-blue-500 text-white"
                                : isAccessible
                                  ? "bg-white border-gray-300 text-gray-500 hover:border-blue-500"
                                  : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                          }
                        `}
                      >
                        {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                      </button>
                      <div className="mt-2 text-center">
                        <p className={`text-sm font-medium ${isCurrent ? "text-blue-600" : "text-gray-600"}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500 max-w-24">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="mb-8">{renderStepContent()}</div>

        {/* Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Progresso Geral</span>
              <span className="text-sm font-medium text-gray-600">
                {Math.round((completedSteps.length / steps.length) * 100)}%
              </span>
            </div>
            <Progress value={(completedSteps.length / steps.length) * 100} className="h-2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
