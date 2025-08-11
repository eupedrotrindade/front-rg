/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RowInput } from "jspdf-autotable";

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
          const headerStartY = 20; // Começar o cabeçalho em 20pt do topo da página

          // Título do relatório
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(138, 43, 138);
          doc.text(data.titulo, 105, headerStartY + 20, { align: "center" });

          // Linha separadora
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(20, headerStartY + 27, 190, headerStartY + 27);

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
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 100, 100);
          doc.text(subtitulo, 105, headerStartY + 34, { align: "center" });
        };

        // Adicionar cabeçalho na primeira página
        await addHeader(doc, 1);

        let colunas: string[] = [];
        let linhas: RowInput[] = [];

        const isAgrupadoPorEmpresa = ["geral", "filtroEmpresa"].includes(
          data.tipo
        );

        // Get dynamic column headers based on data structure
        const getColumnHeaders = (
          dados: Record<string, unknown>[]
        ): string[] => {
          if (!dados || dados.length === 0) return [];

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

          const firstRecord = dados[0];
          return Object.keys(firstRecord).map((key) => columnMap[key] || key);
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
          colunas = getColumnHeaders(data.dados);

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
          colunas = getColumnHeaders(data.dados);
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

              // Salvar o estado atual
              doc.saveGraphicsState();

              // Configurar transparência para o papel timbrado com opacidade alta
              doc.setGState(new doc.GState({ opacity: 0.8 }));

              // Adicionar a imagem como fundo respeitando as margens
              // A imagem ocupa toda a página, mas o conteúdo respeita as margens
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

              // Restaurar estado
              doc.restoreGraphicsState();
            }
          } catch (error) {
            console.log("Erro ao carregar papel timbrado, usando fallback");
            // Fallback: usar marca d'água de texto se a imagem falhar
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.05 }));

            const centerX = pageWidth / 2;
            const centerY = pageHeight / 2;

            doc.setTextColor(160, 160, 160);
            doc.setFontSize(48);
            doc.setFont("helvetica", "bold");
            doc.text("RG PRODUÇÕES", centerX, centerY, {
              align: "center",
              angle: -45,
            });

            doc.restoreGraphicsState();
          }
        };

        // Adicionar papel timbrado na primeira página
        await addWatermark(doc);

        // Converter pixels para pontos (1px ≈ 0.75pt)
        const topMarginPx = 80;
        const footerMarginPx = 75;
        const topMarginPt = topMarginPx * 0.75; // ≈ 150pt
        const footerMarginPt = footerMarginPx * 0.75; // ≈ 75pt

        // Armazenar promessas de carregamento para páginas adicionais
        const pagePromises: Promise<void>[] = [];

        autoTable(doc, {
          head: [colunas],
          body: linhas,
          startY: topMarginPt, // Começar após a margem do topo (200px)
          styles: {
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
          },
          headStyles: {
            fillColor: [138, 43, 138],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248],
          },
          margin: {
            left: 15,
            right: 15,
            bottom: footerMarginPt, // Margem inferior para respeitar o rodapé (100px)
          },
          theme: "grid",
          // Callback síncrono - apenas registra as páginas que precisam de marca d'água
          didDrawPage: function (data) {
            if (data.pageNumber > 1) {
              // Armazenar a promessa para processar depois
              pagePromises.push(
                (async () => {
                  const currentPage = data.pageNumber;
                  doc.setPage(currentPage);
                  await addWatermark(doc);
                  await addHeader(doc, currentPage);
                })()
              );
            }
          },
        });

        // Aguardar todas as promessas de páginas adicionais
        if (pagePromises.length > 0) {
          await Promise.all(pagePromises);
        }

        const finalY = (doc as any).lastAutoTable?.finalY || 100;

        // Adicionar informações do rodapé com total de registros
        const totalRegistros = data.dados.length;
        const totalPaginas = (doc as any).internal.pages.length - 1;

        // Calcular posições do rodapé respeitando a margem de 100px
        const pageHeight = doc.internal.pageSize.height;
        const footerStartY = pageHeight - footerMarginPt; // Começar o rodapé 100px antes do final

        // Adicionar rodapé em todas as páginas
        for (let pageNumber = 1; pageNumber <= totalPaginas; pageNumber++) {
          doc.setPage(pageNumber);

          // Linha separadora no rodapé (respeitando a margem)
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(
            15,
            footerStartY + 10, // Linha 10pt após o início da área do rodapé
            195,
            footerStartY + 10
          );

          // Total de registros (lado esquerdo)
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "bold");
          doc.text(
            `Total de registros: ${totalRegistros}`,
            15,
            footerStartY + 20 // 20pt após o início da área do rodapé
          );

          // Numeração das páginas (centro)
          doc.setFont("helvetica", "normal");
          doc.text(
            `Página ${pageNumber} de ${totalPaginas}`,
            105,
            footerStartY + 20,
            { align: "center" }
          );

          // Data e hora (lado direito)
          doc.text(`Emitido em ${dataHora}`, 195, footerStartY + 20, {
            align: "right",
          });

          // Informações da empresa no rodapé
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text(
            "RG Produções & Eventos - Sistema de Gestão de Eventos",
            105,
            footerStartY + 27, // 27pt após o início da área do rodapé
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
