/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import { toast } from "sonner";
import { useExportPDF } from "@/features/eventos/api/mutation/use-export-pdf";
import { useExportXLSX } from "@/features/eventos/api/mutation/use-export-xlsx";
import type { ParticipantRecord } from "../types";
import type { ExportConfig } from "../components/column-selection-dialog";

interface UseExportProps {
  eventName: string;
  participants: ParticipantRecord[];
  selectedDay?: string;
  selectedReportType?: string;
  eventDays?: Array<{
    id: string;
    label: string;
    date: string;
    type: string;
    period?: "diurno" | "noturno";
  }>;
}

export function useExport({
  eventName,
  participants,
  selectedDay,
  selectedReportType,
  eventDays,
}: UseExportProps) {
  const exportPDFMutation = useExportPDF();
  const exportXLSXMutation = useExportXLSX();

  // Helper function to parse shift information
  const parseShiftInfo = useCallback((shiftId: string) => {
    const parts = shiftId.split("-");
    if (parts.length >= 5) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const stage = parts[3];
      const period = parts[4] as "diurno" | "noturno";

      const date = new Date(`${year}-${month}-${day}`);
      const formattedDate = date.toLocaleDateString("pt-BR");

      const stageNames = {
        montagem: "MONTAGEM",
        evento: "EVENTO",
        desmontagem: "DESMONTAGEM",
      };

      const periodNames = {
        diurno: "DIURNO",
        noturno: "NOTURNO",
      };

      return {
        date: formattedDate,
        stage:
          stageNames[stage as keyof typeof stageNames] || stage.toUpperCase(),
        period: periodNames[period] || period.toUpperCase(),
        fullLabel: `${formattedDate} - ${
          stageNames[stage as keyof typeof stageNames] || stage.toUpperCase()
        } - ${periodNames[period] || period.toUpperCase()}`,
      };
    }
    return null;
  }, []);

  // Convert participant record to export format - SEMPRE organizar por turnos
  const convertToExportFormat = useCallback(
    (
      participants: ParticipantRecord[],
      config?: ExportConfig,
      selectedDay?: string
    ) => {
      const formattedData: any[] = [];
      let totalParticipants = 0;
      let totalCheckIns = 0;

      // Determinar quais turnos usar
      let shiftsToProcess: Array<{
        id: string;
        label: string;
        date: string;
        type: string;
        period?: "diurno" | "noturno";
      }> = [];

      if (selectedDay === "all") {
        // Usar TODOS os turnos do evento
        shiftsToProcess = eventDays || [];
      } else if (selectedDay) {
        // Usar apenas o turno selecionado
        const selectedShift = eventDays?.find((day) => day.id === selectedDay);
        if (selectedShift) {
          shiftsToProcess = [selectedShift];
        }
      }

      // Se não há turnos definidos, criar um turno padrão
      if (shiftsToProcess.length === 0) {
        shiftsToProcess = [
          {
            id: "default",
            label: "Turno Padrão",
            date: new Date().toLocaleDateString("pt-BR"),
            type: "evento",
            period: "diurno" as const,
          },
        ];
      }

      // SEMPRE processar por turnos
      shiftsToProcess.forEach((shift, shiftIndex) => {
        // ====== CABEÇALHO DO TURNO ======
        const shiftInfo =
          shift.id !== "default"
            ? parseShiftInfo(shift.id) || {
                date: shift.date,
                stage: shift.type.toUpperCase(),
                period: shift.period?.toUpperCase() || "DIURNO",
                fullLabel: `${shift.date} - ${shift.type.toUpperCase()} - ${
                  shift.period?.toUpperCase() || "DIURNO"
                }`,
              }
            : {
                date: shift.date,
                stage: shift.type.toUpperCase(),
                period: shift.period?.toUpperCase() || "DIURNO",
                fullLabel: `${shift.date} - ${shift.type.toUpperCase()} - ${
                  shift.period?.toUpperCase() || "DIURNO"
                }`,
              };

        formattedData.push({
          isShiftHeader: true,
          shiftDate: shiftInfo.date,
          shiftStage: shiftInfo.stage,
          shiftPeriod: shiftInfo.period,
          shiftFullLabel: shiftInfo.fullLabel,
          centerShiftInfo: true,
          isPageBreakBefore: shiftIndex > 0 && selectedDay === "all", // Quebra de página entre turnos apenas quando "TODOS"
          isPageBreakAfter: false,
        });

        // Determinar participantes para este turno
        let shiftParticipants: ParticipantRecord[];

        if (selectedDay === "all" && shiftsToProcess.length > 1) {
          // Dividir participantes entre os turnos para demonstração
          const participantsPerShift = Math.ceil(
            participants.length / shiftsToProcess.length
          );
          const startIndex = shiftIndex * participantsPerShift;
          const endIndex = Math.min(
            startIndex + participantsPerShift,
            participants.length
          );
          shiftParticipants = participants.slice(startIndex, endIndex);

          console.log(`🔄 Turno ${shiftIndex + 1}/${shiftsToProcess.length}:`, {
            shift: shift.id,
            label: shiftInfo.fullLabel,
            participantsInShift: shiftParticipants.length,
            totalParticipants: participants.length,
          });
        } else {
          // Usar todos os participantes para turno único ou específico
          shiftParticipants = participants;
        }

        // ====== EMPRESAS DENTRO DO TURNO ======
        const participantsByCompany = shiftParticipants.reduce((acc, p) => {
          const company = p.empresa || "SEM EMPRESA";
          if (!acc[company]) {
            acc[company] = [];
          }
          acc[company].push(p);
          return acc;
        }, {} as Record<string, ParticipantRecord[]>);

        // Ordenar empresas alfabeticamente
        const sortedCompanies = Object.keys(participantsByCompany).sort(
          (a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        );

        // Processar cada empresa dentro do turno
        sortedCompanies.forEach((companyName, companyIndex) => {
          const companyParticipants = participantsByCompany[companyName];

          // Ordenar staff alfabeticamente dentro da empresa
          const sortedStaff = companyParticipants.sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
          );

          // Contar check-ins da empresa no turno
          const companyCheckIns = sortedStaff.filter(
            (p) => p.checkIn !== "-"
          ).length;
          const companyTotal = sortedStaff.length;

          totalParticipants += companyTotal;
          totalCheckIns += companyCheckIns;

          // ====== CABEÇALHO DA EMPRESA ======
          formattedData.push({
            isCompanyHeader: true,
            companyName: companyName.toUpperCase(),
            checkInCount: companyCheckIns,
            totalCount: companyTotal,
            shiftId: shift.id,
            isPageBreakBefore: false, // Não quebrar página entre empresas dentro do turno
            centerCompanyName: true,
            centerCompanyText: true, // Centralizar o texto do cabeçalho da empresa
            companyHeaderStyle: {
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "12px",
              marginTop: "15px",
              marginBottom: "10px",
            },
          });

          // ====== PARTICIPANTES DA EMPRESA ======
          sortedStaff.forEach((p, staffIndex) => {
            const fullRecord = {
              nome: p.nome.toUpperCase(),
              cpf: p.cpf,
              empresa: p.empresa.toUpperCase(),
              funcao: p.funcao?.toUpperCase() || "",
              pulseira: p.pulseira,
              tipoPulseira: p.tipoPulseira,
              checkIn: p.checkIn,
              checkOut: p.checkOut,
              tempoTotal: p.tempoTotal,
              status: p.status,
              // Metadados para formatação PDF
              isStaffRecord: true,
              companyName: companyName.toUpperCase(),
              shiftId: shift.id,
              shiftInfo: shiftInfo.fullLabel,
              isLastInCompany: staffIndex === sortedStaff.length - 1,
              isPageBreakAfter: false,
            };

            // Se config especificado, filtrar e ordenar colunas
            if (config && config.columns.length > 0) {
              const orderedRecord: any = { ...fullRecord };
              const filteredRecord: any = {};

              config.columnOrder.forEach((column) => {
                if (
                  config.columns.includes(column) &&
                  column in orderedRecord
                ) {
                  filteredRecord[column] =
                    orderedRecord[column as keyof typeof orderedRecord];
                }
              });

              // Manter metadados mesmo com filtro de colunas
              filteredRecord.isStaffRecord = true;
              filteredRecord.companyName = companyName.toUpperCase();
              filteredRecord.shiftId = shift.id;
              filteredRecord.shiftInfo = shiftInfo.fullLabel;
              filteredRecord.isLastInCompany =
                staffIndex === sortedStaff.length - 1;
              filteredRecord.isPageBreakAfter = false;

              formattedData.push(filteredRecord);
            } else {
              formattedData.push(fullRecord);
            }
          });
        });

        // Para demonstração quando "TODOS" está selecionado, dividir participantes entre turnos
        if (selectedDay === "all" && shiftsToProcess.length > 1) {
          // Dividir participantes entre os turnos para mostrar a divisão
          const participantsPerShift = Math.ceil(
            participants.length / shiftsToProcess.length
          );
          const startIndex = shiftIndex * participantsPerShift;
          const endIndex = Math.min(
            startIndex + participantsPerShift,
            participants.length
          );

          // Usar apenas uma parte dos participantes para este turno
          const currentShiftParticipants = participants.slice(
            startIndex,
            endIndex
          );

          console.log(`🔄 Turno ${shiftIndex + 1}/${shiftsToProcess.length}:`, {
            shift: shift.id,
            label: shiftInfo.fullLabel,
            participantsInShift: currentShiftParticipants.length,
            totalParticipants: participants.length,
          });
        }
      });

      // Adicionar informações de resumo no final
      formattedData.push({
        isSummary: true,
        totalParticipants,
        totalCheckIns,
        summaryText: `Total de registros: ${totalParticipants} | Check-ins realizados: ${totalCheckIns} de ${totalParticipants}`,
        isLastPage: true,
        isPageBreakBefore: false, // Controlado pela configuração lastPageSummary.forceNewPage
        summaryColor: "#610E5C", // Cor específica solicitada
        centerSummary: true, // Centralizar o texto de resumo
        summaryStyle: {
          fontSize: "14px",
          fontWeight: "bold",
          color: "#610E5C",
          textAlign: "center",
          marginTop: "50px", // Margem maior em página separada
        },
      });

      // Debug: Mostrar estrutura de dados para o PDF
      const summaryItem = formattedData.find((item) => item.isSummary);
      const shiftHeaders = formattedData.filter((item) => item.isShiftHeader);

      console.log("🎯 Estrutura do PDF:", {
        selectedDay,
        totalItems: formattedData.length,
        shiftsProcessed: shiftsToProcess.length,
        shiftHeaders: shiftHeaders.length,
        companyHeaders: formattedData.filter((item) => item.isCompanyHeader)
          .length,
        staffRecords: formattedData.filter((item) => item.isStaffRecord).length,
        summary: formattedData.filter((item) => item.isSummary).length,
        // Mostrar todos os cabeçalhos de turno encontrados
        shiftHeadersList: shiftHeaders.map((header) => ({
          label: header.shiftFullLabel,
          date: header.shiftDate,
          stage: header.shiftStage,
          period: header.shiftPeriod,
          pageBreak: header.isPageBreakBefore,
        })),
        lastPageSummary: summaryItem
          ? {
              text: summaryItem.summaryText,
              color: summaryItem.summaryColor,
              separatePage: "controlado por lastPageSummary.forceNewPage",
            }
          : null,
        // Mostrar primeira estrutura de cada tipo
        fullStructure: formattedData.slice(0, 10).map((item) => ({
          type: item.isShiftHeader
            ? "🔄 SHIFT_HEADER"
            : item.isCompanyHeader
            ? "🏢 COMPANY_HEADER"
            : item.isStaffRecord
            ? "👤 STAFF_RECORD"
            : item.isSummary
            ? "📊 SUMMARY"
            : "❓ OTHER",
          data: item.isShiftHeader
            ? item.shiftFullLabel
            : item.isCompanyHeader
            ? `${item.companyName} (${item.checkInCount}/${item.totalCount}) - CENTRALIZADO`
            : item.isStaffRecord
            ? item.nome
            : item.isSummary
            ? `${item.summaryText} (Cor: ${item.summaryColor})`
            : "Other",
          pageBreak: item.isPageBreakBefore,
        })),
      });

      return formattedData;
    },
    [parseShiftInfo]
  );

  // Export all participants
  const exportAll = useCallback(
    (config: ExportConfig) => {
      if (participants.length === 0) {
        toast.error("Nenhum participante para exportar");
        return;
      }

      const exportData = convertToExportFormat(
        participants,
        config,
        selectedDay
      );

      // Criar título baseado no tipo de relatório e turno
      let titulo = `Relatório de Presença - ${eventName}`;
      if (selectedReportType && selectedReportType !== "geral") {
        const reportTypeNames: Record<string, string> = {
          empresa: "Filtro por Empresa",
          checkin: "Quem fez Check-in",
          checkout: "Quem fez Check-out",
          checkout_tempo: "Quem fez Check-out (com tempo)",
          credencial: "Tipo de Credencial",
          cadastrado_por: "Cadastrado por",
        };
        titulo += ` - ${
          reportTypeNames[selectedReportType] || selectedReportType
        }`;
      }

      exportPDFMutation.mutate(
        {
          titulo,
          tipo: (selectedReportType === "empresa"
            ? "filtroEmpresa"
            : selectedReportType === "credencial"
            ? "tipoCredencial"
            : selectedReportType === "cadastrado_por"
            ? "cadastradoPor"
            : selectedReportType === "checkout_tempo"
            ? "tempo"
            : selectedReportType === "geral" || !selectedReportType
            ? "geral"
            : selectedReportType) as
            | "filtroEmpresa"
            | "geral"
            | "participantes"
            | "coordenadores"
            | "vagas"
            | "checkin"
            | "checkout"
            | "tempo"
            | "tipoCredencial"
            | "cadastradoPor",
          dados: exportData,
          columnConfig: config,
          filtros: {
            dia: selectedDay || "all",
            empresa: "all_companies",
            funcao: "all_functions",
            status: "",
            tipoCredencial: "all_credentials",
          },
          // Metadados para formatação PDF aprimorada
          pdfFormatting: {
            companyHeaders: true, // Cabeçalhos de empresa com contadores
            alphabeticalOrder: true, // Ordenação alfabética de empresas e staff
            smartPageBreaks: true, // Quebras inteligentes de página
            checkInCounters: true, // Contadores de check-in por empresa
            shiftDivisions: true, // Sempre dividir por turno
            shiftHeaders: true, // Headers proeminentes de turno
            centerCompanyNames: true, // Centralizar nomes das empresas
            centerCompanyHeaders: true, // Centralizar texto dos cabeçalhos das empresas
            centerShiftHeaders: true, // Centralizar cabeçalhos de turno
            summaryWithCounters: true, // Resumo final com contadores
            timestampOnLastPage: true, // Timestamp na última página
            shiftPageBreaks: selectedDay === "all", // Quebra de página entre turnos quando "TODOS"
            // === ESPECIFICAÇÕES DO RESUMO FINAL ===
            lastPageSummary: {
              enabled: true,
              forceNewPage: true, // COM quebra de página - página separada para o resumo
              textColor: "#610E5C", // Cor específica solicitada
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "center",
              marginTop: "50px", // Margem maior em página separada
              showTotalRecords: true, // Mostrar total de registros
              showCheckInCount: true, // Mostrar quantos fizeram check-in
              format:
                "Total de registros: {total} | Check-ins realizados: {checkins} de {total}",
            },
          },
        },
        {
          onSuccess: () => {
            toast.success("Relatório exportado com sucesso!");
          },
          onError: () => {
            toast.error("Erro ao exportar relatório");
          },
        }
      );
    },
    [
      participants,
      convertToExportFormat,
      exportPDFMutation,
      eventName,
      selectedDay,
      selectedReportType,
    ]
  );

  // Export by company
  const exportByCompany = useCallback(
    (company: string, config: ExportConfig) => {
      if (!company || company === "all") {
        toast.error("Selecione uma empresa específica");
        return;
      }

      const companyParticipants = participants.filter(
        (p) => p.empresa === company
      );

      if (companyParticipants.length === 0) {
        toast.error("Nenhum participante encontrado para esta empresa");
        return;
      }

      const exportData = convertToExportFormat(
        companyParticipants,
        config,
        selectedDay
      );

      // Criar título baseado no tipo de relatório e empresa
      let titulo = `Relatório de Presença - ${company}`;
      if (selectedReportType && selectedReportType !== "geral") {
        const reportTypeNames: Record<string, string> = {
          empresa: "Filtro por Empresa",
          checkin: "Quem fez Check-in",
          checkout: "Quem fez Check-out",
          checkout_tempo: "Quem fez Check-out (com tempo)",
          credencial: "Tipo de Credencial",
          cadastrado_por: "Cadastrado por",
        };
        titulo += ` - ${
          reportTypeNames[selectedReportType] || selectedReportType
        }`;
      }

      exportPDFMutation.mutate(
        {
          titulo,
          tipo: "filtroEmpresa",
          dados: exportData,
          columnConfig: config,
          filtros: {
            dia: selectedDay || "all",
            empresa: company,
            funcao: "all_functions",
            status: "",
            tipoCredencial: "all_credentials",
          },
          // Metadados para formatação PDF aprimorada
          pdfFormatting: {
            companyHeaders: true, // Cabeçalhos de empresa com contadores
            alphabeticalOrder: true, // Ordenação alfabética de empresas e staff
            smartPageBreaks: true, // Quebras inteligentes de página
            checkInCounters: true, // Contadores de check-in por empresa
            shiftDivisions: true, // Sempre dividir por turno
            shiftHeaders: true, // Headers proeminentes de turno
            centerCompanyNames: true, // Centralizar nomes das empresas
            centerCompanyHeaders: true, // Centralizar texto dos cabeçalhos das empresas
            centerShiftHeaders: true, // Centralizar cabeçalhos de turno
            summaryWithCounters: true, // Resumo final com contadores
            timestampOnLastPage: true, // Timestamp na última página
            shiftPageBreaks: selectedDay === "all", // Quebra de página entre turnos quando "TODOS"
            // === ESPECIFICAÇÕES DO RESUMO FINAL ===
            lastPageSummary: {
              enabled: true,
              forceNewPage: true, // COM quebra de página - página separada para o resumo
              textColor: "#610E5C", // Cor específica solicitada
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "center",
              marginTop: "50px", // Margem maior em página separada
              showTotalRecords: true, // Mostrar total de registros
              showCheckInCount: true, // Mostrar quantos fizeram check-in
              format:
                "Total de registros: {total} | Check-ins realizados: {checkins} de {total}",
            },
          },
        },
        {
          onSuccess: () => {
            toast.success(
              `Relatório da empresa ${company} exportado com sucesso!`
            );
          },
          onError: () => {
            toast.error("Erro ao exportar relatório da empresa");
          },
        }
      );
    },
    [
      participants,
      convertToExportFormat,
      exportPDFMutation,
      selectedDay,
      selectedReportType,
    ]
  );

  // Export all participants to XLSX
  const exportAllXLSX = useCallback(() => {
    if (participants.length === 0) {
      toast.error("Nenhum participante para exportar");
      return;
    }

    // Função helper para manter timestamp bruto
    const getTimestampValue = (dateValue: any): any => {
      // Para XLSX, mantemos o valor original (já deve estar como timestamp ou string)
      return dateValue || "";
    };

    const exportData = participants.map((p) => ({
      nome: p.nome,
      cpf: p.cpf,
      funcao: p.funcao || "",
      empresa: p.empresa,
      tipoPulseira: p.tipoPulseira,
      pulseira: p.pulseira,
      checkIn: getTimestampValue(p.checkIn), // Mantém formato original/timestamp
      checkOut: getTimestampValue(p.checkOut), // Mantém formato original/timestamp
      tempoTotal: p.tempoTotal,
      status: p.status,
      // Campos adicionais específicos para XLSX
      pulseiraTrocada: "Não", // Campo padrão
      cadastradoPor: "Sistema", // Campo padrão
    }));

    exportXLSXMutation.mutate({
      titulo: `Relatorio_Presenca_${eventName}`,
      dados: exportData,
      filtros: {
        dia: "all",
        empresa: "all_companies",
        funcao: "all_functions",
        status: "",
        tipoCredencial: "all_credentials",
      },
    });
  }, [participants, exportXLSXMutation, eventName]);

  // Export by company to XLSX
  const exportByCompanyXLSX = useCallback(
    (company: string) => {
      if (!company || company === "all") {
        toast.error("Selecione uma empresa específica");
        return;
      }

      const companyParticipants = participants.filter(
        (p) => p.empresa === company
      );

      if (companyParticipants.length === 0) {
        toast.error("Nenhum participante encontrado para esta empresa");
        return;
      }

      // Função helper para manter timestamp bruto
      const getTimestampValue = (dateValue: any): any => {
        // Para XLSX, mantemos o valor original (já deve estar como timestamp ou string)
        return dateValue || "";
      };

      const exportData = companyParticipants.map((p) => ({
        nome: p.nome,
        cpf: p.cpf,
        funcao: p.funcao || "",
        empresa: p.empresa,
        tipoPulseira: p.tipoPulseira,
        pulseira: p.pulseira,
        checkIn: getTimestampValue(p.checkIn), // Mantém formato original/timestamp
        checkOut: getTimestampValue(p.checkOut), // Mantém formato original/timestamp
        tempoTotal: p.tempoTotal,
        status: p.status,
        // Campos adicionais específicos para XLSX
        pulseiraTrocada: "Não", // Campo padrão
        cadastradoPor: "Sistema", // Campo padrão
      }));

      exportXLSXMutation.mutate({
        titulo: `Relatorio_Empresa_${company}`,
        dados: exportData,
        filtros: {
          dia: "all",
          empresa: company,
          funcao: "all_functions",
          status: "",
          tipoCredencial: "all_credentials",
        },
      });
    },
    [participants, exportXLSXMutation]
  );

  // Export radios report
  const exportRadios = useCallback(() => {
    toast.info("Relatório de Rádios em desenvolvimento");
    // TODO: Implement radio data fetching and export
    // This would need to:
    // 1. Fetch radio data using useRadios hook
    // 2. Format radio data for export
    // 3. Call exportPDFMutation with radio data
  }, []);

  // Export parking/vehicles report
  const exportEstacionamento = useCallback(() => {
    toast.info("Relatório de Estacionamento em desenvolvimento");
    // TODO: Implement vehicle data fetching and export
    // This would need to:
    // 1. Fetch vehicle data using useEventVehiclesByEvent hook
    // 2. Format vehicle data for export
    // 3. Call exportPDFMutation with vehicle data
  }, []);

  // Export badges report
  const exportCrachas = useCallback(() => {
    toast.info("Relatório de Crachás em desenvolvimento");
    // TODO: Implement badge data fetching and export
    // This would need to:
    // 1. Fetch badge/credential data
    // 2. Format badge data for export
    // 3. Call exportPDFMutation with badge data
  }, []);

  // Generate preview data
  const generatePreviewData = useCallback(() => {
    const previewData = convertToExportFormat(
      participants,
      undefined,
      selectedDay
    );

    return previewData.map((item) => ({
      type: item.isShiftHeader
        ? ("SHIFT_HEADER" as const)
        : item.isCompanyHeader
        ? ("COMPANY_HEADER" as const)
        : item.isStaffRecord
        ? ("STAFF_RECORD" as const)
        : item.isSummary
        ? ("SUMMARY" as const)
        : ("OTHER" as const),
      data: item.isShiftHeader
        ? item.shiftFullLabel
        : item.isCompanyHeader
        ? `${item.companyName} (${item.checkInCount}/${item.totalCount})`
        : item.isStaffRecord
        ? item.nome
        : item.isSummary
        ? item.summaryText
        : "Other",
      pageBreak: item.isPageBreakBefore || false,
      shiftDate: item.shiftDate,
      shiftStage: item.shiftStage,
      shiftPeriod: item.shiftPeriod,
      checkInCount: item.checkInCount,
      totalCount: item.totalCount,
      color: item.summaryColor,
    }));
  }, [participants, selectedDay, convertToExportFormat]);

  return {
    exportAll,
    exportByCompany,
    exportAllXLSX,
    exportByCompanyXLSX,
    exportRadios,
    exportEstacionamento,
    exportCrachas,
    generatePreviewData,
    isExporting: exportPDFMutation.isPending || exportXLSXMutation.isPending,
  };
}
