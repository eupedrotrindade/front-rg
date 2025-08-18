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
    period?: "diurno" | "noturno" | "dia_inteiro";
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

  // Função para configurar colunas específicas por tipo de relatório
  const getReportTypeConfig = useCallback((reportType?: string, userConfig?: ExportConfig): ExportConfig => {
    const defaultConfig: ExportConfig = {
      columns: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut"],
      columnOrder: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut"],
      columnWidths: [
        { key: "nome", width: 200 },
        { key: "cpf", width: 120 },
        { key: "funcao", width: 160 },
        { key: "pulseira", width: 120 },
        { key: "checkIn", width: 120 },
        { key: "checkOut", width: 120 }
      ]
    };

    // Se usuário especificou config, usar essa
    if (userConfig && userConfig.columns.length > 0) {
      return userConfig;
    }

    // Configurações específicas por tipo de relatório (SEM coluna empresa)
    switch (reportType) {
      case "geral":
        return {
          columns: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut"],
          columnOrder: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut"],
          columnWidths: [
            { key: "nome", width: 200 },
            { key: "cpf", width: 120 },
            { key: "funcao", width: 160 },
            { key: "pulseira", width: 120 },
            { key: "checkIn", width: 120 },
            { key: "checkOut", width: 120 }
          ]
        };

      case "checkin":
        return {
          columns: ["nome", "cpf", "funcao", "checkIn"],
          columnOrder: ["nome", "cpf", "funcao", "checkIn"],
          columnWidths: [
            { key: "nome", width: 250 },
            { key: "cpf", width: 140 },
            { key: "funcao", width: 200 },
            { key: "checkIn", width: 140 }
          ]
        };

      case "checkin_com_pulseira":
        return {
          columns: ["nome", "cpf", "funcao", "pulseira", "checkIn"],
          columnOrder: ["nome", "cpf", "funcao", "pulseira", "checkIn"],
          columnWidths: [
            { key: "nome", width: 200 },
            { key: "cpf", width: 120 },
            { key: "funcao", width: 160 },
            { key: "pulseira", width: 120 },
            { key: "checkIn", width: 130 }
          ]
        };

      case "checkout":
        return {
          columns: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut"],
          columnOrder: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut"],
          columnWidths: [
            { key: "nome", width: 180 },
            { key: "cpf", width: 110 },
            { key: "funcao", width: 140 },
            { key: "pulseira", width: 110 },
            { key: "checkIn", width: 110 },
            { key: "checkOut", width: 110 }
          ]
        };

      case "tempo_trabalho":
        return {
          columns: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut", "tempoTotal"],
          columnOrder: ["nome", "cpf", "funcao", "pulseira", "checkIn", "checkOut", "tempoTotal"],
          columnWidths: [
            { key: "nome", width: 160 },
            { key: "cpf", width: 100 },
            { key: "funcao", width: 120 },
            { key: "pulseira", width: 100 },
            { key: "checkIn", width: 100 },
            { key: "checkOut", width: 100 },
            { key: "tempoTotal", width: 90 }
          ]
        };

      case "sem_checkin":
        return {
          columns: ["nome", "cpf", "funcao"],
          columnOrder: ["nome", "cpf", "funcao"],
          columnWidths: [
            { key: "nome", width: 300 },
            { key: "cpf", width: 150 },
            { key: "funcao", width: 280 }
          ]
        };

      case "personalizado":
        // Para personalizado, permitir todas as colunas incluindo empresa
        const personalizadoConfig: ExportConfig = {
          columns: ["nome", "cpf", "empresa", "funcao", "pulseira", "checkIn", "checkOut"],
          columnOrder: ["nome", "cpf", "empresa", "funcao", "pulseira", "checkIn", "checkOut"],
          columnWidths: [
            { key: "nome", width: 200 },
            { key: "cpf", width: 120 },
            { key: "empresa", width: 200 },
            { key: "funcao", width: 160 },
            { key: "pulseira", width: 120 },
            { key: "checkIn", width: 120 },
            { key: "checkOut", width: 120 }
          ]
        };
        return userConfig || personalizadoConfig;

      default:
        return defaultConfig;
    }
  }, []);

  // Helper function to parse shift information
  const parseShiftInfo = useCallback((shiftId: string) => {
    const parts = shiftId.split("-");
    if (parts.length >= 5) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const stage = parts[3];
      const period = parts[4] as "diurno" | "noturno" | "dia_inteiro";

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
        dia_inteiro: "DIA INTEIRO",
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
      selectedDay?: string,
      reportType?: string
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
        period?: "diurno" | "noturno" | "dia_inteiro";
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
          isPageBreakBefore: shiftIndex > 0, // SEMPRE quebrar página entre dias/turnos quando há múltiplos
          isPageBreakAfter: false,
        });

        // Determinar participantes para este turno
        let shiftParticipants: ParticipantRecord[];

        if (selectedDay === "all" && shiftsToProcess.length > 1) {
          // Filtrar participantes que realmente pertencem a este turno
          const shiftDateISO = shift.id.split('-').slice(0, 3).join('-'); // YYYY-MM-DD
          const shiftStage = shift.type;
          const shiftPeriod = shift.period || 'diurno';
          
          shiftParticipants = participants.filter(participant => {
            // Filtrar por dados reais do turno se disponíveis
            if (participant.shift_id && participant.work_date && participant.work_stage && participant.work_period) {
              return (
                participant.work_date === shiftDateISO &&
                participant.work_stage === shiftStage &&
                participant.work_period === shiftPeriod
              );
            }
            
            // Fallback: dividir igualmente se não há dados de turno
            const participantsPerShift = Math.ceil(participants.length / shiftsToProcess.length);
            const startIndex = shiftIndex * participantsPerShift;
            const endIndex = Math.min(startIndex + participantsPerShift, participants.length);
            const participantIndex = participants.indexOf(participant);
            return participantIndex >= startIndex && participantIndex < endIndex;
          });

          console.log(`🔄 Turno ${shiftIndex + 1}/${shiftsToProcess.length}:`, {
            shift: shift.id,
            label: shiftInfo.fullLabel,
            participantsInShift: shiftParticipants.length,
            totalParticipants: participants.length,
            hasShiftData: shiftParticipants.some(p => p.shift_id && p.work_date)
          });
        } else {
          // Usar todos os participantes para turno único ou específico
          shiftParticipants = participants;
        }

        // Filtrar participantes SEM EMPRESA
        let validParticipants = shiftParticipants.filter(p => p.empresa && p.empresa.trim() !== "" && p.empresa !== "SEM EMPRESA");

        // Aplicar filtros específicos do tipo de relatório ANTES de agrupar por empresa
        const participantsBeforeFilter = validParticipants.length;
        
        if (reportType === "checkin" || reportType === "checkin_com_pulseira") {
          // Apenas participantes que fizeram check-in
          validParticipants = validParticipants.filter(p => p.checkIn !== "-");
          console.log(`📊 Relatório ${reportType}: ${participantsBeforeFilter} → ${validParticipants.length} participantes (apenas com check-in)`);
        } else if (reportType === "checkout" || reportType === "tempo_trabalho") {
          // Apenas participantes que fizeram check-in E check-out
          validParticipants = validParticipants.filter(p => p.checkIn !== "-" && p.checkOut !== "-");
          console.log(`📊 Relatório ${reportType}: ${participantsBeforeFilter} → ${validParticipants.length} participantes (com check-in E check-out)`);
        } else if (reportType === "sem_checkin") {
          // Apenas participantes que NÃO fizeram check-in
          validParticipants = validParticipants.filter(p => p.checkIn === "-");
          console.log(`📊 Relatório ${reportType}: ${participantsBeforeFilter} → ${validParticipants.length} participantes (sem check-in)`);
        } else {
          console.log(`📊 Relatório ${reportType}: ${validParticipants.length} participantes (todos válidos)`);
        }

        // ====== EMPRESAS DENTRO DO TURNO ======
        const participantsByCompany = validParticipants.reduce((acc, p) => {
          const company = p.empresa;
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

        console.log(`🏢 Empresas encontradas no turno ${shift.id}:`, {
          totalEmpresas: sortedCompanies.length,
          empresas: sortedCompanies.map(company => ({
            nome: company,
            participantes: participantsByCompany[company].length
          }))
        });

        // Processar cada empresa dentro do turno
        sortedCompanies.forEach((companyName, companyIndex) => {
          const companyParticipants = participantsByCompany[companyName];

          // Ordenar staff alfabeticamente dentro da empresa
          const sortedStaff = companyParticipants.sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
          );

          // Calcular contagens baseadas no tipo de relatório
          let companyDisplayCount = 0;
          let companyTotalForDisplay = sortedStaff.length;
          
          if (reportType === "geral") {
            // "Todos": Mostra check-ins do total de pessoas
            const companyCheckIns = sortedStaff.filter((p) => p.checkIn !== "-").length;
            companyDisplayCount = companyCheckIns;
            companyTotalForDisplay = sortedStaff.length;
          } else if (reportType === "checkin" || reportType === "checkin_com_pulseira") {
            // "Presentes": Apenas quem fez check-in (já filtrado anteriormente)
            companyDisplayCount = sortedStaff.length; // Todos já fizeram check-in devido ao filtro
            companyTotalForDisplay = sortedStaff.length;
          } else if (reportType === "checkout" || reportType === "tempo_trabalho") {
            // "Finalizados": Apenas quem fez check-in E check-out (já filtrado anteriormente)
            companyDisplayCount = sortedStaff.length; // Todos já fizeram check-in e check-out devido ao filtro
            companyTotalForDisplay = sortedStaff.length;
          } else if (reportType === "sem_checkin") {
            // "Sem check-in": Apenas quem NÃO fez check-in (já filtrado anteriormente)
            companyDisplayCount = sortedStaff.length; // Todos não fizeram check-in devido ao filtro
            companyTotalForDisplay = sortedStaff.length;
          } else {
            // Para outros tipos, usar lógica padrão
            const companyCheckIns = sortedStaff.filter((p) => p.checkIn !== "-").length;
            companyDisplayCount = companyCheckIns;
            companyTotalForDisplay = sortedStaff.length;
          }

          totalParticipants += companyTotalForDisplay;
          totalCheckIns += companyDisplayCount;

          // ====== CABEÇALHO DA EMPRESA ======
          formattedData.push({
            isCompanyHeader: true,
            companyName: companyName.toUpperCase(),
            checkInCount: companyDisplayCount,
            totalCount: companyTotalForDisplay,
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
    [parseShiftInfo, eventDays, selectedReportType]
  );

  // Export all participants
  const exportAll = useCallback(
    (config: ExportConfig, customTitle?: string, customSubtitle?: string) => {
      if (participants.length === 0) {
        toast.error("Nenhum participante para exportar");
        return;
      }

      // Aplicar configuração de colunas específica por tipo de relatório
      const finalConfig = getReportTypeConfig(selectedReportType, config);

      const exportData = convertToExportFormat(
        participants,
        finalConfig,
        selectedDay,
        selectedReportType
      );

      // Usar título personalizado ou criar baseado no tipo de relatório e turno
      let titulo = customTitle || `Relatório de Presença - ${eventName}`;
      if (selectedReportType && selectedReportType !== "geral") {
        const reportTypeNames: Record<string, string> = {
          empresa: "Filtro por Empresa",
          checkin: "Quem fez Check-in",
          checkin_com_pulseira: "Quem fez Check-in com Código da Pulseira",
          checkout: "Quem fez Check-out",
          tempo_trabalho: "Tempo de Trabalho",
          sem_checkin: "Sem Check-in",
          personalizado: "Relatório Personalizado",
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
          subtitulo: customSubtitle,
          tipo: (selectedReportType === "empresa"
            ? "filtroEmpresa"
            : selectedReportType === "credencial"
            ? "tipoCredencial"
            : selectedReportType === "cadastrado_por"
            ? "cadastradoPor"
            : selectedReportType === "tempo_trabalho"
            ? "tempo"
            : selectedReportType === "checkin_com_pulseira"
            ? "checkin"
            : selectedReportType === "sem_checkin"
            ? "checkin"
            : selectedReportType === "personalizado"
            ? "geral"
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
          }
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
    (company: string, config: ExportConfig, customTitle?: string, customSubtitle?: string) => {
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

      // Aplicar configuração de colunas específica por tipo de relatório
      const finalConfig = getReportTypeConfig(selectedReportType, config);

      const exportData = convertToExportFormat(
        companyParticipants,
        finalConfig,
        selectedDay,
        selectedReportType
      );

      // Usar título personalizado ou criar baseado no tipo de relatório e empresa
      let titulo = customTitle || `Relatório de Presença - ${company}`;
      if (selectedReportType && selectedReportType !== "geral") {
        const reportTypeNames: Record<string, string> = {
          empresa: "Filtro por Empresa",
          checkin: "Quem fez Check-in",
          checkin_com_pulseira: "Quem fez Check-in com Código da Pulseira",
          checkout: "Quem fez Check-out",
          tempo_trabalho: "Tempo de Trabalho",
          sem_checkin: "Sem Check-in",
          personalizado: "Relatório Personalizado",
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
          subtitulo: customSubtitle,
          tipo: "filtroEmpresa",
          dados: exportData,
          columnConfig: config,
          filtros: {
            dia: selectedDay || "all",
            empresa: company,
            funcao: "all_functions",
            status: "",
            tipoCredencial: "all_credentials",
          }
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
      selectedDay,
      selectedReportType
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
