/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { EventParticipant } from "@/features/eventos/types";

export interface ImportProgress {
  total: number;
  processed: number;
  success: number;
  errors: number;
  duplicates: number;
  currentItem?: string;
  currentBatch?: number;
  totalBatches?: number;
}

export interface ProcessedData {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  data: EventParticipant[];
  errors: Array<{ item: any; error: string; row: number }>;
  duplicates: Array<{ item: any; existing: EventParticipant; row: number }>;
  missingCredentials: Array<{ name: string; count: number }>;
}

export type ImportStep =
  | "date"
  | "upload"
  | "preview"
  | "validation"
  | "import"
  | "complete";

export const useImportExport = (
  eventId: string,
  participants: EventParticipant[]
) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>("date");
  const [processedData, setProcessedData] = useState<ProcessedData | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    success: 0,
    errors: 0,
    duplicates: 0,
  });
  const [selectedEventDates, setSelectedEventDates] = useState<string[]>([]);

  const batchConfig = useMemo(
    () => ({
      batchSize: 25,
      pauseBetweenBatches: 2000,
      pauseBetweenItems: 100,
    }),
    []
  );

  // Validation functions
  const isValidCPF = useCallback((cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;
    return true;
  }, []);

  const isValidEmail = useCallback((email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, []);

  const validateParticipant = useCallback(
    (data: any) => {
      const errors: string[] = [];

      if (!data.nome || data.nome.toString().trim().length < 2) {
        errors.push("Nome deve ter pelo menos 2 caracteres");
      }
      if (!data.cpf || !isValidCPF(data.cpf.toString())) {
        errors.push("CPF inválido");
      }
      if (!data.empresa || data.empresa.toString().trim().length < 2) {
        errors.push("Empresa deve ter pelo menos 2 caracteres");
      }
      if (!data.funcao || data.funcao.toString().trim().length < 2) {
        errors.push("Função deve ter pelo menos 2 caracteres");
      }
      if (data.email && !isValidEmail(data.email.toString())) {
        errors.push("Email inválido");
      }
      if (data.phone && data.phone.toString().replace(/\D/g, "").length < 10) {
        errors.push("Telefone inválido");
      }

      return { isValid: errors.length === 0, errors };
    },
    [isValidCPF, isValidEmail]
  );

  const processExcelFile = useCallback(
    async (file: File): Promise<ProcessedData> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            const result: ProcessedData = {
              fileName: file.name,
              totalRows: jsonData.length,
              validRows: 0,
              invalidRows: 0,
              duplicateRows: 0,
              data: [],
              errors: [],
              duplicates: [],
              missingCredentials: [],
            };

            const existingCPFs = new Set(
              participants.map((p) => p.cpf.replace(/\D/g, ""))
            );
            const processedCPFs = new Set<string>();
            const credentialCounts: { [key: string]: number } = {};

            jsonData.forEach((row, index) => {
              const rowNumber = index + 2;
              const validation = validateParticipant(row);

              if (!validation.isValid) {
                result.errors.push({
                  item: row,
                  error: validation.errors.join(", "),
                  row: rowNumber,
                });
                result.invalidRows++;
                return;
              }

              const cleanedCPF = row.cpf.toString().replace(/\D/g, "");

              if (existingCPFs.has(cleanedCPF)) {
                const existing = participants.find(
                  (p) => p.cpf.replace(/\D/g, "") === cleanedCPF
                );
                if (existing) {
                  result.duplicates.push({
                    item: row,
                    existing,
                    row: rowNumber,
                  });
                  result.duplicateRows++;
                  return;
                }
              }

              if (processedCPFs.has(cleanedCPF)) {
                result.duplicates.push({
                  item: row,
                  existing: {} as EventParticipant,
                  row: rowNumber,
                });
                result.duplicateRows++;
                return;
              }

              processedCPFs.add(cleanedCPF);

              if (row.credencial) {
                const credentialName = row.credencial
                  .toString()
                  .trim()
                  .toUpperCase();
                credentialCounts[credentialName] =
                  (credentialCounts[credentialName] || 0) + 1;
              }

              const participantData: EventParticipant = {
                id: crypto.randomUUID(),
                eventId,
                name: row.nome.toString().trim(),
                cpf: row.cpf.toString(),
                email: row.email?.toString().trim() || undefined,
                phone: row.phone?.toString().trim() || undefined,
                role: row.funcao.toString().trim(),
                company: row.empresa.toString().trim(),
                notes: row.notes?.toString().trim() || undefined,
                daysWork:
                  selectedEventDates.length > 0
                    ? selectedEventDates.map((date) =>
                        new Date(date).toLocaleDateString("pt-BR")
                      )
                    : undefined,
              };

              result.data.push(participantData);
              result.validRows++;
            });

            result.missingCredentials = Object.entries(credentialCounts).map(
              ([name, count]) => ({
                name,
                count,
              })
            );

            resolve(result);
          } catch (error) {
            reject(new Error("Erro ao processar arquivo Excel"));
          }
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsArrayBuffer(file);
      });
    },
    [participants, validateParticipant, selectedEventDates, eventId]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
        return;
      }

      setIsProcessing(true);
      try {
        const processed = await processExcelFile(file);
        setProcessedData(processed);
        setCurrentStep("preview");
        toast.success("Arquivo processado com sucesso!");
      } catch (error) {
        toast.error("Erro ao processar arquivo");
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    },
    [processExcelFile]
  );

  const resetImport = useCallback(() => {
    setCurrentStep("date");
    setProcessedData(null);
    setSelectedEventDates([]);
    setProgress({
      total: 0,
      processed: 0,
      success: 0,
      errors: 0,
      duplicates: 0,
    });
  }, []);

  const downloadTemplate = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet([
      {
        nome: "João Silva",
        cpf: "12345678900",
        empresa: "Empresa ABC",
        funcao: "Desenvolvedor",
        email: "joao@email.com",
        phone: "(11) 99999-9999",
        notes: "Observações aqui",
        credencial: "CREDENCIAL-001",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(
      wb,
      `modelo-participantes-${eventId}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );
  }, [eventId]);

  return {
    // States
    currentStep,
    setCurrentStep,
    processedData,
    setProcessedData,
    isProcessing,
    isImporting,
    setIsImporting,
    progress,
    setProgress,
    selectedEventDates,
    setSelectedEventDates,
    batchConfig,

    // Functions
    handleFileUpload,
    resetImport,
    downloadTemplate,
    validateParticipant,
  };
};
