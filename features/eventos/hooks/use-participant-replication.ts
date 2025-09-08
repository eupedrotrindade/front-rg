/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EventParticipant } from "@/features/eventos/types";
import { useCreateEventParticipant } from "@/features/eventos/api/mutation/use-create-event-participant";
import { useCreateEmpresa } from "@/features/eventos/api/mutation/use-create-empresa";
import { useCreateCredential } from "@/features/eventos/api/mutation/use-credential-mutations";
import { formatEventDate } from "@/lib/utils";

// Rate limiting constants
const SUPABASE_RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60000;
const SAFE_MARGIN = 0.8;
const MAX_SAFE_OPS_PER_MINUTE = Math.floor(SUPABASE_RATE_LIMIT * SAFE_MARGIN);
const BATCH_SIZE = 10;

export interface ReplicationAnalysis {
  sourceDay: string;
  targetDay: string;
  sourceParticipants: EventParticipant[];
  targetParticipants: EventParticipant[];
  participantsToReplicate: EventParticipant[];
  companiesAnalysis: {
    existing: string[];
    missing: string[];
    needingCreation: string[];
  };
  credentialsAnalysis: {
    existing: string[];
    missing: string[];
    needingCreation: string[];
  };
  processingSummary: {
    companiesProcessed: number;
    credentialsProcessed: number;
    participantsProcessed: number;
  };
  rateLimiting: {
    operationsCount: number;
    windowStart: number;
    estimatedTime: number;
  };
}

export interface ReplicationProgress {
  total: number;
  current: number;
  processed: number;
  currentParticipant: string;
  estimatedTimeRemaining: number;
  startTime: number;
  currentBatch: number;
  totalBatches: number;
  operationsPerMinute: number;
}

export interface RateLimitState {
  operationsCount: number;
  windowStart: number;
  isThrottled: boolean;
}

export interface UseParticipantReplicationProps {
  eventId: string;
  getParticipantsByShift: (shiftId: string) => EventParticipant[];
  empresas: any[];
  credentials: any[];
  parseShiftId: (shiftId: string) => {
    dateISO: string;
    dateFormatted: string;
    stage: string;
    period: "diurno" | "noturno";
  };
}

export function useParticipantReplication({
  eventId,
  getParticipantsByShift,
  empresas,
  credentials,
  parseShiftId,
}: UseParticipantReplicationProps) {
  const queryClient = useQueryClient();
  const { mutate: createParticipant } = useCreateEventParticipant();
  const { mutate: createEmpresa } = useCreateEmpresa();
  const { mutate: createCredential } = useCreateCredential();

  // Rate limiting state
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    operationsCount: 0,
    windowStart: Date.now(),
    isThrottled: false,
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Progress tracking
  const [progressData, setProgressData] = useState<ReplicationProgress>({
    total: 0,
    current: 0,
    processed: 0,
    currentParticipant: "",
    estimatedTimeRemaining: 0,
    startTime: 0,
    currentBatch: 0,
    totalBatches: 0,
    operationsPerMinute: 0,
  });

  // Função para converter data para formato da API (YYYY-MM-DD)
  const formatDateForAPI = useCallback((dateStr: string): string => {
    // Se já está no formato ISO correto, retorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Se está no formato DD-MM-YYYY, converte para YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split("-");
      return `${year}-${month}-${day}`;
    }

    // Se está no formato shiftId (YYYY-MM-DD-stage-period), extrai a data
    if (/^\d{4}-\d{2}-\d{2}-.+-.+$/.test(dateStr)) {
      const parts = dateStr.split("-");
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        return `${year}-${month}-${day}`;
      }
    }

    // Se está no formato DD/MM/YYYY, converte para YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month}-${day}`;
    }

    // Tenta converter usando Date (usando horário local para evitar problemas de timezone)
    try {
      const date = new Date(dateStr + 'T12:00:00'); // Adiciona horário para evitar problemas de timezone
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.error("Erro ao converter data:", dateStr, error);
    }
    return dateStr;
  }, []);

  // Função para calcular delay dinâmico baseado no rate limiting
  const calculateDynamicDelay = useCallback(
    (operationsRemaining: number): number => {
      const now = Date.now();
      const timeInWindow = now - rateLimitState.windowStart;
      const windowRemaining = RATE_LIMIT_WINDOW - timeInWindow;

      if (timeInWindow >= RATE_LIMIT_WINDOW) {
        setRateLimitState({
          operationsCount: 1,
          windowStart: now,
          isThrottled: false,
        });
        return 100;
      }

      if (rateLimitState.operationsCount >= MAX_SAFE_OPS_PER_MINUTE) {
        setRateLimitState((prev) => ({ ...prev, isThrottled: true }));
        return windowRemaining + 1000;
      }

      const optimalDelay = Math.max(
        100,
        Math.floor(windowRemaining / operationsRemaining)
      );

      return Math.min(optimalDelay, 2000);
    },
    [rateLimitState]
  );

  // Função para aguardar respeitando rate limit
  const waitForRateLimit = useCallback(
    async (operationsRemaining: number = 1) => {
      const delay = calculateDynamicDelay(operationsRemaining);

      setRateLimitState((prev) => ({
        ...prev,
        operationsCount: prev.operationsCount + 1,
      }));

      if (delay > 2000) {
        console.log(
          `⏸️ Rate limit atingido, aguardando ${Math.round(delay / 1000)}s...`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    },
    [calculateDynamicDelay]
  );

  // Função para analisar a replicação
  const analyzeReplication = useCallback(
    (
      sourceShiftId: string,
      targetShiftId: string
    ): ReplicationAnalysis | null => {
      if (!sourceShiftId || !targetShiftId) {
        toast.error("Selecione os turnos de origem e destino");
        return null;
      }

      if (sourceShiftId === targetShiftId) {
        toast.error("O turno de origem deve ser diferente do turno de destino");
        return null;
      }

      const sourceParticipants = getParticipantsByShift(sourceShiftId);
      const targetParticipants = getParticipantsByShift(targetShiftId);

      if (sourceParticipants.length === 0) {
        toast.error("Não há participantes no turno de origem selecionado");
        return null;
      }

      // Identificar participantes que não estão no turno de destino
      const targetParticipantHashes = new Set(
        targetParticipants.map(
          (p) => p.participantHash || `${p.cpf}_${eventId}`
        )
      );

      const participantsToReplicate = sourceParticipants.filter(
        (sourceParticipant) => {
          const hash =
            sourceParticipant.participantHash ||
            `${sourceParticipant.cpf}_${eventId}`;
          return !targetParticipantHashes.has(hash);
        }
      );

      // Analisar empresas necessárias
      const empresasArray = Array.isArray(empresas) ? empresas : [];
      const existingCompanies = new Set(empresasArray.map((e) => e.name));
      const requiredCompanies = new Set(
        participantsToReplicate
          .map((p) => p.company)
          .filter(Boolean)
          .filter((c) => c.trim())
      );

      const companiesAnalysis = {
        existing: Array.from(requiredCompanies).filter((c) =>
          existingCompanies.has(c)
        ),
        missing: Array.from(requiredCompanies).filter(
          (c) => !existingCompanies.has(c)
        ),
        needingCreation: Array.from(requiredCompanies).filter(
          (c) => !existingCompanies.has(c)
        ),
      };

      // Analisar credenciais necessárias
      const credentialsArray = Array.isArray(credentials) ? credentials : [];
      const existingCredentials = new Set(credentialsArray.map((c) => c.name));
      const requiredCredentials = new Set(
        participantsToReplicate
          .map((p: any) => p.credentialName)
          .filter(Boolean)
          .filter((c) => c.trim())
      );

      const credentialsAnalysis = {
        existing: Array.from(requiredCredentials).filter((c) =>
          existingCredentials.has(c)
        ),
        missing: Array.from(requiredCredentials).filter(
          (c) => !existingCredentials.has(c)
        ),
        needingCreation: Array.from(requiredCredentials).filter(
          (c) => !existingCredentials.has(c)
        ),
      };

      // Estimar operações e tempo
      const totalOperations =
        companiesAnalysis.needingCreation.length +
        credentialsAnalysis.needingCreation.length +
        participantsToReplicate.length;

      const estimatedTime =
        Math.ceil(totalOperations / MAX_SAFE_OPS_PER_MINUTE) * 60000;

      return {
        sourceDay: sourceShiftId,
        targetDay: targetShiftId,
        sourceParticipants,
        targetParticipants,
        participantsToReplicate,
        companiesAnalysis,
        credentialsAnalysis,
        processingSummary: {
          companiesProcessed: 0,
          credentialsProcessed: 0,
          participantsProcessed: 0,
        },
        rateLimiting: {
          operationsCount: 0,
          windowStart: Date.now(),
          estimatedTime,
        },
      };
    },
    [getParticipantsByShift, eventId, empresas, credentials]
  );

  // Função para processar a replicação
  const processReplication = useCallback(
    async (
      replicationData: ReplicationAnalysis,
      onProgress?: (progress: ReplicationProgress, step: number) => void
    ): Promise<{
      success: boolean;
      successCount: number;
      errorCount: number;
    }> => {
      if (!replicationData.participantsToReplicate.length) {
        toast.error("Nenhum participante para replicar");
        return { success: false, successCount: 0, errorCount: 0 };
      }

      setIsProcessing(true);
      setCurrentStep(1);

      const startTime = Date.now();
      const totalOperations =
        replicationData.companiesAnalysis.needingCreation.length +
        replicationData.credentialsAnalysis.needingCreation.length +
        replicationData.participantsToReplicate.length;

      const initialProgress: ReplicationProgress = {
        total: totalOperations,
        current: 0,
        processed: 0,
        currentParticipant: "",
        estimatedTimeRemaining: 0,
        startTime,
        currentBatch: 0,
        totalBatches: Math.ceil(
          replicationData.participantsToReplicate.length / BATCH_SIZE
        ),
        operationsPerMinute: 0,
      };

      setProgressData(initialProgress);
      onProgress?.(initialProgress, 1);

      let currentOperation = 0;
      let successCount = 0;
      let errorCount = 0;

      try {
        // Etapa 1: Criar empresas necessárias
        if (replicationData.companiesAnalysis.needingCreation.length > 0) {
          console.log("📊 Criando empresas necessárias...");

          const { dateISO: targetDateISO } = parseShiftId(
            replicationData.targetDay
          );
          const targetDateFormatted = formatDateForAPI(targetDateISO);
          const { stage, period } = parseShiftId(replicationData.targetDay);

          for (const companyName of replicationData.companiesAnalysis
            .needingCreation) {
            try {
              const currentProgress = {
                ...initialProgress,
                current: currentOperation + 1,
                currentParticipant: `Empresa: ${companyName}`,
              };
              setProgressData(currentProgress);
              onProgress?.(currentProgress, 1);

              await new Promise<void>((resolve, reject) => {
                createEmpresa(
                  {
                    nome: companyName,
                    id_evento: eventId,
                    shiftId: replicationData.targetDay,
                    workDate: targetDateFormatted,
                    workStage: stage as
                      | "montagem"
                      | "evento"
                      | "desmontagem"
                      | undefined,
                    workPeriod: period,
                  },
                  {
                    onSuccess: () => {
                      successCount++;
                      resolve();
                    },
                    onError: (error) => {
                      console.error(
                        `Erro ao criar empresa ${companyName}:`,
                        error
                      );
                      errorCount++;
                      reject(error);
                    },
                  }
                );
              });

              currentOperation++;
              await waitForRateLimit(totalOperations - currentOperation);
            } catch (error) {
              console.error(`Erro ao processar empresa ${companyName}:`, error);
              errorCount++;
              currentOperation++;
            }
          }
        }

        // Etapa 2: Criar credenciais necessárias
        setCurrentStep(2);
        if (replicationData.credentialsAnalysis.needingCreation.length > 0) {
          console.log("🏷️ Criando credenciais necessárias...");

          const { dateISO: targetDateISO } = parseShiftId(
            replicationData.targetDay
          );
          const targetDateFormatted = formatDateForAPI(targetDateISO);
          const { stage, period } = parseShiftId(replicationData.targetDay);

          for (const credentialName of replicationData.credentialsAnalysis
            .needingCreation) {
            try {
              const currentProgress = {
                ...progressData,
                current: currentOperation + 1,
                currentParticipant: `Credencial: ${credentialName}`,
              };
              setProgressData(currentProgress);
              onProgress?.(currentProgress, 2);

              await new Promise<void>((resolve, reject) => {
                createCredential(
                  {
                    nome: credentialName,
                    id_events: eventId,
                    cor: "#6366f1",
                    days_works: [targetDateFormatted],
                    shiftId: replicationData.targetDay,
                    workDate: targetDateFormatted,
                    workStage: stage as "montagem" | "evento" | "desmontagem",
                    workPeriod: period,
                  },
                  {
                    onSuccess: () => {
                      successCount++;
                      resolve();
                    },
                    onError: (error) => {
                      console.error(
                        `Erro ao criar credencial ${credentialName}:`,
                        error
                      );
                      errorCount++;
                      reject(error);
                    },
                  }
                );
              });

              currentOperation++;
              await waitForRateLimit(totalOperations - currentOperation);
            } catch (error) {
              console.error(
                `Erro ao processar credencial ${credentialName}:`,
                error
              );
              errorCount++;
              currentOperation++;
            }
          }
        }

        // Etapa 3: Replicar participantes
        setCurrentStep(3);
        console.log(
          `👥 Replicando ${replicationData.participantsToReplicate.length} participantes...`
        );

        const { dateISO: targetDateISO } = parseShiftId(
          replicationData.targetDay
        );
        const targetDateFormatted = formatDateForAPI(targetDateISO);

        for (
          let i = 0;
          i < replicationData.participantsToReplicate.length;
          i += BATCH_SIZE
        ) {
          const batch = replicationData.participantsToReplicate.slice(
            i,
            i + BATCH_SIZE
          );
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

          for (const participant of batch) {
            try {
              // Calcular tempo estimado restante
              const elapsed = Date.now() - startTime;
              const operationsRemaining = totalOperations - currentOperation;
              const avgTimePerOperation =
                elapsed / Math.max(currentOperation, 1);
              const estimatedTimeRemaining =
                operationsRemaining * avgTimePerOperation;

              const currentProgress: ReplicationProgress = {
                total: totalOperations,
                current: currentOperation + 1,
                processed: currentOperation,
                currentParticipant: participant.name,
                estimatedTimeRemaining,
                startTime,
                currentBatch: batchNumber,
                totalBatches: Math.ceil(
                  replicationData.participantsToReplicate.length / BATCH_SIZE
                ),
                operationsPerMinute: Math.round(
                  (currentOperation / elapsed) * 60000
                ),
              };

              setProgressData(currentProgress);
              onProgress?.(currentProgress, 3);

              await new Promise<void>((resolve, reject) => {
                const { stage, period } = parseShiftId(
                  replicationData.targetDay
                );
                createParticipant(
                  {
                    eventId,
                    name: participant.name,
                    cpf: participant.cpf,
                    rg: participant.rg,
                    company: participant.company,
                    role: participant.role,
                    daysWork: [targetDateFormatted],
                    credentialId: participant.credentialId,
                    validatedBy: "sistema-replicacao",
                    shiftId: replicationData.targetDay,
                    workDate: targetDateFormatted,
                    workStage: stage,
                    workPeriod: period,
                  },
                  {
                    onSuccess: () => {
                      successCount++;
                      resolve();
                    },
                    onError: (error) => {
                      console.error(
                        `Erro ao replicar participante ${participant.name}:`,
                        error
                      );
                      errorCount++;
                      reject(error);
                    },
                  }
                );
              });

              currentOperation++;
              await waitForRateLimit(totalOperations - currentOperation);
            } catch (error) {
              console.error(
                `Erro ao processar participante ${participant.name}:`,
                error
              );
              errorCount++;
              currentOperation++;
            }
          }
        }

        // Finalizar
        if (successCount > 0) {
          const {
            dateFormatted: targetDateFormatted,
            stage,
            period,
          } = parseShiftId(replicationData.targetDay);
          const stageLabel =
            stage === "montagem"
              ? "Montagem"
              : stage === "evento"
              ? "Evento"
              : stage === "desmontagem"
              ? "Desmontagem"
              : stage;
          const periodLabel = period === "diurno" ? "Diurno" : "Noturno";

          toast.success(
            `✅ Replicação concluída! ${successCount} operações realizadas com sucesso para ${targetDateFormatted} (${stageLabel} - ${periodLabel})${
              errorCount > 0 ? `. ${errorCount} erro(s) encontrado(s)` : ""
            }`
          );

          // Invalidar queries para atualizar dados
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["event-participants-by-event", eventId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["event-participants-grouped", eventId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["empresas-by-event", eventId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["credentials", eventId],
            }),
          ]);
        }

        if (errorCount > 0) {
          toast.error(`❌ ${errorCount} erro(s) durante a replicação`);
        }

        return { success: successCount > 0, successCount, errorCount };
      } catch (error) {
        console.error("Erro geral na replicação:", error);
        toast.error("Erro geral durante a replicação");
        return { success: false, successCount, errorCount: errorCount + 1 };
      } finally {
        setIsProcessing(false);
        setCurrentStep(1);
      }
    },
    [
      createParticipant,
      createEmpresa,
      createCredential,
      eventId,
      waitForRateLimit,
      parseShiftId,
      formatDateForAPI,
      queryClient,
    ]
  );

  // Função para formatar tempo
  const formatTime = useCallback((ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000)
      return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    return `${Math.round(ms / 3600000)}h ${Math.round(
      (ms % 3600000) / 60000
    )}m`;
  }, []);

  return {
    // State
    isProcessing,
    currentStep,
    progressData,
    rateLimitState,

    // Functions
    analyzeReplication,
    processReplication,
    formatTime,
    formatDateForAPI,
  };
}
