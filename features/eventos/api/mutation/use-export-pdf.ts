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
  titulo: string;
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
    | "cadastradoPor";
  dados: Record<string, unknown>[];
  columnConfig?: ExportConfig;
  filtros: {
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

          // Título do relatório
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(138, 43, 138);
          doc.text(data.titulo, 105, headerStartY + 15, { align: "center" });

          // Linha separadora
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(20, headerStartY + 22, 190, headerStartY + 22);

          // Subtítulo
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
          };

          const subtitulo = subtitulos[data.tipo] ?? "Relatório de Eventos";
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

          // Fall back to data structure
          if (!dados || dados.length === 0) return [];
          const firstRecord = dados[0];
          return Object.keys(firstRecord).map((key) => columnMap[key] || key);
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
        const getRowValues = (record: Record<string, unknown>): string[] => {
          return Object.values(record).map((value) => {
            if (value === null || value === undefined) return "-";
            return String(value).toUpperCase();
          });
        };

        if (isAgrupadoPorEmpresa) {
          // Use dynamic columns for grouped reports
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
            const checkInCount = participantes.filter((p) => p.checkIn).length;

            linhas.push([
              {
                content: `${empresa.toUpperCase()} (${checkInCount}/${
                  participantes.length
                })`,
                colSpan: colunas.length,
                styles: {
                  fillColor: [138, 43, 138],
                  textColor: [255, 255, 255],
                  fontStyle: "bold",
                  halign: "left",
                  fontSize: 9,
                },
              },
            ]);

            participantes.forEach((p) => {
              linhas.push(getRowValues(p));
            });
          });
        } else {
          // For non-grouped reports, also use dynamic columns
          colunas = getColumnHeaders(data.dados, data.columnConfig);
          linhas = data.dados.map((record) => getRowValues(record));
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

        // Ordem correta: 1) Imagem no fundo, 2) Título/subtítulo, 3) Tabela
        await addWatermark(doc);
        await addHeader(doc, 1);

        autoTable(doc, {
          head: [colunas],
          body: linhas,
          startY: headerHeight, // Começar após o cabeçalho
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineWidth: 0.2,
            lineColor: [180, 180, 180],
            textColor: [40, 40, 40],
          },
          headStyles: {
            fillColor: [138, 43, 138],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 10,
            halign: "center",
            cellPadding: 4,
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
          theme: "striped",
          tableLineColor: [180, 180, 180],
          tableLineWidth: 0.1,
        });

        // Get total number of pages after table generation
        const totalPages = (doc as any).internal.pages.length - 1;

        // Processar cada página individualmente para adicionar fundo e cabeçalho
        for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
          doc.setPage(pageNumber);

          // Salvar o estado atual da página
          const pageContent = (doc as any).internal.pages[pageNumber];
          
          // Limpar a página atual
          (doc as any).internal.pages[pageNumber] = [];

          // Reconstruir na ordem correta:
          // 1. Papel timbrado (fundo)
          await addWatermark(doc);
          
          // 2. Título e subtítulo (sobre a imagem) 
          await addHeader(doc, pageNumber);

          // 3. Restaurar o conteúdo da tabela (mantém o que estava na página)
          const currentContent = (doc as any).internal.pages[pageNumber];
          (doc as any).internal.pages[pageNumber] = currentContent.concat(pageContent);
        }

        const finalY = (doc as any).lastAutoTable?.finalY || 100;

        // Adicionar informações do rodapé com total de registros
        const totalRegistros = data.dados.length;
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
