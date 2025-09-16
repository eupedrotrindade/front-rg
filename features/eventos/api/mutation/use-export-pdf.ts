/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RowInput } from "jspdf-autotable";

interface ColumnConfig {
  key: string;
  width: number | "auto";
}

interface ExportConfig {
  columns: string[];
  columnOrder: string[];
  columnWidths: ColumnConfig[];
}

interface ExportPDFData {
  total_registros?: number;
  titulo: string;
  subtitulo?: string;
  tipo:
    | "geral"
    | "participantes"
    | "coordenadores"
    | "vagas"
    | "checkin"
    | "checkout"
    | "tempo"
    | "filtroEmpresa"
    | "tipoCredencial"
    | "cadastradoPor"
    | "retiradaCrachas"
    | "estacionamento";
  dados: Record<string, unknown>[];
  columnConfig?: ExportConfig;
  filtros?: {
    dia?: string;
    empresa?: string;
    funcao?: string;
    status?: string;
    tipoCredencial?: string;
  };
}

export const useExportPDF = () => {
  return useMutation({
    mutationFn: async (data: ExportPDFData) => {
      try {
        const jsPDF = (await import("jspdf")).default;
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF();
        const agora = new Date();
        const dataHora = agora.toLocaleString("pt-BR");

        // Função para adicionar cabeçalho respeitando a margem do topo
        const addHeader = async (doc: any, pageNumber: number = 1) => {
          const headerStartY = 30; // Começar o cabeçalho em 15pt do topo da página

          // Título do relatório com cor personalizada #610E5C
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(97, 14, 92); // #610E5C convertido para RGB
          doc.text(data.titulo, 105, headerStartY + 15, { align: "center" });

          // Linha separadora
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(20, headerStartY + 22, 190, headerStartY + 22);

          // Subtítulo - usar customizado se fornecido, senão usar padrão
          let subtitulo = data.subtitulo;
          if (!subtitulo) {
            const subtitulos: Record<ExportPDFData["tipo"], string> = {
              geral: "Relatório Geral de Participantes",
              participantes: "Relatório de Participantes",
              coordenadores: "Relatório de Coordenadores",
              vagas: "Relatório de Vagas",
              checkin: "Relatório de Check-in",
              checkout: "Relatório de Check-out",
              tempo: "Relatório de Tempo de Permanência",
              filtroEmpresa: "Relatório por Empresa",
              tipoCredencial: "Relatório por Tipo de Credencial",
              cadastradoPor: "Relatório por Cadastrado Por",
              retiradaCrachas: "Relatório de Retirada Crachas",
              estacionamento: "Relatório do estacionamento",
            };
            subtitulo = subtitulos[data.tipo] ?? "Relatório de Eventos";
          }

          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          doc.text(subtitulo, 105, headerStartY + 28, { align: "center" });
        };

        let colunas: string[] = [];
        let linhas: RowInput[] = [];

        const isAgrupadoPorEmpresa = ["geral", "filtroEmpresa"].includes(
          data.tipo
        );

        // Get dynamic column headers based on data structure or config
        const getColumnHeaders = (
          dados: Record<string, unknown>[],
          columnConfig?: ExportConfig
        ): string[] => {
          const columnMap: Record<string, string> = {
            nome: "Nome",
            cpf: "CPF",
            empresa: "Empresa",
            funcao: "Função",
            pulseira: "Pulseira",
            tipoPulseira: "Tipo de Pulseira",
            checkIn: "Check-in",
            checkOut: "Check-out",
            tempoTotal: "Tempo Total",
            status: "Status",
          };

          // Use column config if available
          if (columnConfig && columnConfig.columnOrder.length > 0) {
            return columnConfig.columnOrder.map((key) => columnMap[key] || key);
          }

          // Fall back to data structure - filter out metadata fields
          if (!dados || dados.length === 0) return [];

          // Find first staff record (not shift header, company header, or summary)
          const firstStaffRecord = dados.find(
            (record) =>
              record.isStaffRecord === true &&
              !record.isShiftHeader &&
              !record.isCompanyHeader &&
              !record.isSummary
          );

          if (!firstStaffRecord) return Object.keys(columnMap);

          // Filter out metadata fields and only include valid participant data columns
          const validColumns = Object.keys(firstStaffRecord).filter(
            (key) =>
              columnMap[key] && // Only include mapped columns
              !key.startsWith("is") && // Exclude metadata flags
              !key.startsWith("shift") && // Exclude shift metadata
              !key.startsWith("company") && // Exclude company metadata
              !key.startsWith("center") && // Exclude formatting metadata
              !key.includes("PageBreak") && // Exclude page break metadata
              !key.includes("Style") // Exclude style metadata
          );

          return validColumns.map((key) => columnMap[key] || key);
        };

        // Get column widths from config
        const getColumnWidths = (
          columnConfig?: ExportConfig
        ): (number | "auto")[] | undefined => {
          if (!columnConfig || !columnConfig.columnWidths.length)
            return undefined;

          return columnConfig.columnWidths.map((config) => config.width);
        };

        // Get values from record in same order as headers
        let debugLogged = false;
        const getRowValues = (
          record: Record<string, unknown>,
          headers: string[]
        ): string[] => {
          const columnMap: Record<string, string> = {
            Nome: "nome",
            CPF: "cpf",
            Empresa: "empresa",
            Função: "funcao",
            Pulseira: "pulseira",
            "Tipo de Pulseira": "tipoPulseira",
            "Check-in": "checkIn",
            "Check-out": "checkOut",
            "Tempo Total": "tempoTotal",
            Status: "status",
          };

          const values = headers.map((header) => {
            const key = columnMap[header] || header.toLowerCase();
            const value = record[key];
            if (value === null || value === undefined) return "-";
            return String(value).toUpperCase();
          });

          // Log apenas para o primeiro registro para debug
          if (record.nome && !debugLogged) {
            console.log("🔍 getRowValues Debug:", {
              headers,
              recordKeys: Object.keys(record),
              sampleRecord: {
                nome: record.nome,
                cpf: record.cpf,
                empresa: record.empresa,
                isStaffRecord: record.isStaffRecord,
              },
              mappedValues: values,
            });
            debugLogged = true;
          }

          return values;
        };

        // Verificar se os dados já vêm estruturados (com headers de empresa/turno)
        const hasStructuredData = data.dados.some(
          (item) =>
            item.isShiftHeader ||
            item.isCompanyHeader ||
            item.isStaffRecord ||
            item.isSummary
        );

        console.log("📄 PDF Debug:", {
          tipo: data.tipo,
          isAgrupadoPorEmpresa,
          hasStructuredData,
          totalItems: data.dados.length,
          firstItems: data.dados.slice(0, 5).map((item) => ({
            isShiftHeader: !!item.isShiftHeader,
            isCompanyHeader: !!item.isCompanyHeader,
            isStaffRecord: !!item.isStaffRecord,
            isSummary: !!item.isSummary,
            empresa: item.empresa,
            nome: item.nome,
            allKeys: Object.keys(item),
          })),
        });

        if (isAgrupadoPorEmpresa && !hasStructuredData) {
          // Use dynamic columns for grouped reports (dados não estruturados)
          colunas = getColumnHeaders(data.dados, data.columnConfig);

          const participantesPorEmpresa = new Map<string, typeof data.dados>();

          data.dados.forEach((p) => {
            const empresa = String(p.empresa ?? "SEM EMPRESA");
            if (!participantesPorEmpresa.has(empresa)) {
              participantesPorEmpresa.set(empresa, []);
            }
            participantesPorEmpresa.get(empresa)!.push(p);
          });

          const empresasOrdenadas = Array.from(
            participantesPorEmpresa.keys()
          ).sort();

          empresasOrdenadas.forEach((empresa) => {
            const participantes = participantesPorEmpresa.get(empresa)!;
            const checkInCount = participantes.filter(
              (p) => p.checkIn && p.checkIn !== "-"
            ).length;

            linhas.push([
              {
                content: String(
                  `${empresa.toUpperCase()} (${checkInCount}/${
                    participantes.length
                  })`
                ),
                colSpan: colunas.length,
                styles: {
                  fillColor: [138, 43, 138],
                  textColor: [255, 255, 255],
                  fontStyle: "bold",
                  halign: "center",
                  fontSize: 10,
                  cellPadding: 6,
                },
              },
            ]);

            participantes.forEach((p) => {
              // Only add staff records, skip metadata entries
              if (!p.isShiftHeader && !p.isCompanyHeader && !p.isSummary) {
                linhas.push(getRowValues(p, colunas));
              }
            });
          });
        } else if (hasStructuredData) {
          // Dados já estruturados - usar diretamente
          colunas = getColumnHeaders(data.dados, data.columnConfig);

          data.dados.forEach((item) => {
            if (item.isShiftHeader) {
              // Cabeçalho de turno (data + estágio + período)
              linhas.push([
                {
                  content: String(item.shiftFullLabel || "Turno"),
                  colSpan: colunas.length,
                  styles: {
                    fillColor: [97, 14, 92], // #610E5C convertido para RGB
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    halign: "center",
                    fontSize: 12,
                    cellPadding: 8,
                    lineWidth: { bottom: 1 }, // Linha apenas embaixo do cabeçalho de turno
                    lineColor: [100, 100, 100], // Cor da linha
                  },
                },
              ]);
            } else if (item.isCompanyHeader) {
              // Cabeçalho de empresa
              linhas.push([
                {
                  content: String(
                    `${item.companyName} (${item.checkInCount}/${item.totalCount})`
                  ),
                  colSpan: colunas.length,
                  styles: {
                    fillColor: [138, 43, 138],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    halign: "center",
                    fontSize: 10,
                    cellPadding: 6,
                  },
                },
              ]);
            } else if (item.isStaffRecord) {
              // Participante
              linhas.push(getRowValues(item, colunas));
            } else if (item.isSummary) {
              // Resumo final - pode ser processado separadamente se necessário
            }
          });
        } else {
          // For non-grouped reports, also use dynamic columns
          colunas = getColumnHeaders(data.dados, data.columnConfig);
          linhas = data.dados
            .filter(
              (record) =>
                !record.isShiftHeader &&
                !record.isCompanyHeader &&
                !record.isSummary
            ) // Filter out metadata
            .map((record) => getRowValues(record, colunas));
        }

        console.log("📊 Tabela Debug:", {
          colunas,
          totalLinhas: linhas.length,
          firstLinhas: linhas.slice(0, 3),
          hasStructuredData,
          isAgrupadoPorEmpresa,
        });

        // Garantir que há pelo menos dados básicos para a tabela
        if (colunas.length === 0) {
          colunas = ["Nome", "CPF", "Função", "Check-in", "Check-out"];
          console.warn("⚠️ Usando colunas padrão porque nenhuma foi detectada");
        }

        if (linhas.length === 0) {
          console.warn("⚠️ Nenhuma linha de dados detectada");
          // Se não há dados estruturados, tentar processar como dados simples
          if (data.dados.length > 0) {
            linhas = data.dados.map((record) => {
              return [
                record.nome || "-",
                record.cpf || "-",
                record.funcao || "-",
                record.checkIn || "-",
                record.checkOut || "-",
              ];
            });
            console.log(
              "🔄 Processando como dados simples:",
              linhas.length,
              "linhas"
            );
          }
        }

        // Função para adicionar papel timbrado no fundo com imagem
        const addWatermark = async (doc: any) => {
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;

          try {
            // Carregar a imagem do papel timbrado
            const watermarkResponse = await fetch("/images/folha-timbrada.jpg");
            if (watermarkResponse.ok) {
              const watermarkBlob = await watermarkResponse.blob();
              const watermarkBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(watermarkBlob);
              });

              // Salvar estado para isolar a imagem
              doc.saveGraphicsState();

              // Adicionar a imagem como fundo (sem alterar opacidade)
              doc.addImage(
                watermarkBase64,
                "JPEG",
                0, // x: começa na borda da página
                0, // y: começa na borda da página
                pageWidth, // largura: toda a página
                pageHeight, // altura: toda a página
                undefined,
                "FAST"
              );

              // Restaurar estado para não interferir com texto/tabela
              doc.restoreGraphicsState();
            }
          } catch (error) {
            console.log("Erro ao carregar papel timbrado");
          }
        };

        // Definir margens adequadas
        const headerHeight = 70; // Altura do cabeçalho (aumentado para mais espaçamento)
        const footerHeight = 40; // Altura do rodapé

        // Get column widths configuration
        const columnWidths = getColumnWidths(data.columnConfig);

        // Carregar watermark uma vez para reutilizar em todas as páginas
        let watermarkBase64: string | null = null;
        try {
          const watermarkResponse = await fetch("/images/folha-timbrada.jpg");
          if (watermarkResponse.ok) {
            const watermarkBlob = await watermarkResponse.blob();
            watermarkBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(watermarkBlob);
            });
          }
        } catch (error) {
          console.log("Erro ao carregar papel timbrado");
        }

        // Função para adicionar watermark em qualquer página
        const addWatermarkToCurrentPage = (
          doc: any,
          watermarkBase64: string
        ) => {
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;

          // Salvar estado gráfico
          doc.saveGraphicsState();

          // Adicionar imagem como fundo
          doc.addImage(
            watermarkBase64,
            "JPEG",
            0, // x: começa na borda
            0, // y: começa na borda
            pageWidth, // largura total
            pageHeight, // altura total
            undefined,
            "FAST"
          );

          // Restaurar estado
          doc.restoreGraphicsState();
        };

        // Aplicar watermark apenas na primeira página antes da tabela (método antigo funciona)
        await addWatermark(doc);
        await addHeader(doc, 1);

        // Gerar tabela com didDrawPage para adicionar header nas páginas seguintes
        autoTable(doc, {
          head: [colunas],
          body: linhas,
          startY: headerHeight, // Começar após o cabeçalho
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineWidth: 0, // Remove bordas das células
            textColor: [40, 40, 40],
          },
          headStyles: {
            fillColor: [138, 43, 138],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
            cellPadding: 4,
            lineWidth: { bottom: 1 }, // Linha apenas embaixo do cabeçalho
            lineColor: [100, 100, 100], // Cor da linha
          },
          alternateRowStyles: {
            fillColor: [252, 252, 252],
          },
          columnStyles: columnWidths
            ? columnWidths.reduce((styles, width, index) => {
                if (typeof width === "number") {
                  styles[index] = { cellWidth: width };
                }
                return styles;
              }, {} as any)
            : undefined,
          margin: {
            left: 20,
            right: 20,
            top: headerHeight,
            bottom: footerHeight,
          },
          theme: "plain", // Remove tema com bordas
          tableLineWidth: 0, // Remove linhas da tabela
          willDrawPage: function (hookData) {
            // ====== APLICAR WATERMARK ANTES DA TABELA (PÁGINAS 2+) ======
            // Hook executado ANTES da tabela ser desenhada
            if (watermarkBase64 && hookData.pageNumber > 1) {
              addWatermarkToCurrentPage(doc, watermarkBase64);
            }
          },
          didDrawPage: function (hookData) {
            // ====== HEADER APÓS A TABELA (TODAS AS PÁGINAS) ======
            const headerStartY = 30;

            // Título do relatório com cor personalizada #610E5C
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(97, 14, 92); // #610E5C convertido para RGB
            doc.text(data.titulo, 105, headerStartY + 15, { align: "center" });

            // Linha separadora
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(20, headerStartY + 22, 190, headerStartY + 22);

            // Subtítulo - usar customizado se fornecido, senão usar padrão
            let subtitulo = data.subtitulo;
            if (!subtitulo) {
              const subtitulos: Record<string, string> = {
                geral: "Relatório Geral de Participantes",
                participantes: "Relatório de Participantes",
                coordenadores: "Relatório de Coordenadores",
                vagas: "Relatório de Vagas",
                checkin: "Relatório de Check-in",
                checkout: "Relatório de Check-out",
                tempo: "Relatório de Tempo de Permanência",
                filtroEmpresa: "Relatório por Empresa",
                tipoCredencial: "Relatório por Tipo de Credencial",
                cadastradoPor: "Relatório por Cadastrado Por",
              };
              subtitulo = subtitulos[data.tipo] ?? "Relatório de Eventos";
            }

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text(subtitulo, 105, headerStartY + 28, { align: "center" });
          },
        });

        // Watermark agora é aplicado via didDrawPage de forma consistente em todas as páginas
        // Primeira página: addWatermark() antes da tabela
        // Páginas 2+: addWatermarkToCurrentPage() no didDrawPage hook
        console.log(
          "📄 PDF gerado com",
          (doc as any).internal.pages.length - 1,
          "páginas"
        );

        const finalY = (doc as any).lastAutoTable?.finalY || 100;

        // Adicionar informações do rodapé com total de registros
        const totalRegistros = data.total_registros;
        const totalPaginas = (doc as any).internal.pages.length - 1;

        // Calcular posições do rodapé
        const pageHeight = doc.internal.pageSize.height;
        const footerStartY = pageHeight - footerHeight; // Começar o rodapé na margem inferior

        // Adicionar rodapé em todas as páginas
        for (let pageNumber = 1; pageNumber <= totalPaginas; pageNumber++) {
          doc.setPage(pageNumber);

          // Linha separadora no rodapé
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(20, footerStartY + 5, 190, footerStartY + 5);

          // Total de registros (lado esquerdo)
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.setFont("helvetica", "bold");
          doc.text(
            `Total de registros: ${totalRegistros}`,
            20,
            footerStartY + 15
          );

          // Numeração das páginas (centro)
          doc.setFont("helvetica", "normal");
          doc.text(
            `Página ${pageNumber} de ${totalPaginas}`,
            105,
            footerStartY + 15,
            { align: "center" }
          );

          // Data e hora (lado direito)
          doc.text(`Emitido em ${dataHora}`, 190, footerStartY + 15, {
            align: "right",
          });

          // Informações da empresa no rodapé
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(
            "RG Produções & Eventos - Sistema de Gestão de Eventos",
            105,
            footerStartY + 25,
            { align: "center" }
          );
        }

        const nomeArquivo = `relatorio_${data.titulo.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}_${agora.getTime()}.pdf`;

        doc.save(nomeArquivo);

        return { success: true, filename: nomeArquivo };
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        throw new Error("Erro ao gerar PDF");
      }
    },
    onSuccess: (data) => {
      toast.success(`Relatório exportado com sucesso: ${data.filename}`);
    },
    onError: (error) => {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar relatório. Tente novamente.");
    },
  });
};
