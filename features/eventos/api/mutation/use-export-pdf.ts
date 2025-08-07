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

        let logoCarregado = false;

        try {
          const logoResponse = await fetch("/images/logo-rg-fone.png");
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(logoBlob);
            });

            doc.addImage(logoBase64, "PNG", 12, 8, 50, 20, undefined, "FAST");
            logoCarregado = true;
          }
        } catch {
          console.log("Erro ao carregar logo, usando fallback");
        }

        if (!logoCarregado) {
          doc.setFillColor(180, 180, 180);
          doc.rect(15, 10, 40, 25, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text("RG", 35, 25, { align: "center" });
        }

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(138, 43, 138);
        doc.text("RG Produções & Eventos", 125, 20, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(138, 43, 138);
        doc.text(data.titulo, 105, 28, { align: "center" });

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);

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
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(subtitulo, 105, 42, { align: "center" });

        let colunas: string[] = [];
        let linhas: RowInput[] = [];

        const isAgrupadoPorEmpresa = ["geral", "filtroEmpresa"].includes(
          data.tipo
        );

        if (isAgrupadoPorEmpresa) {
          colunas = [
            "Nome",
            "CPF",
            "Função",
            "Pulseira",
            "Check-in",
            "Check-out",
          ];

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
              linhas.push([
                String(p.nome ?? "-").toUpperCase(),
                String(p.cpf ?? "-"),
                String(p.funcao ?? "-").toUpperCase(),
                String(p.pulseira ?? "-"),
                String(p.checkIn ?? "-"),
                String(p.checkOut ?? "-"),
              ]);
            });
          });
        } else {
          switch (data.tipo) {
            case "participantes":
              colunas = [
                "Nome",
                "CPF",
                "Empresa",
                "Função",
                "Check-in",
                "Check-out",
                "Validado Por",
              ];
              linhas = data.dados.map((d) => [
                String(d.nome ?? "-").toUpperCase(),
                String(d.cpf ?? "-"),
                String(d.empresa ?? "-").toUpperCase(),
                String(d.funcao ?? "-").toUpperCase(),
                String(d.checkIn ?? "-"),
                String(d.checkOut ?? "-"),
                String(d.validadoPor ?? "-"),
              ]);
              break;
            case "coordenadores":
              colunas = ["Nome", "Email", "Eventos"];
              linhas = data.dados.map((d) => [
                String(d.nome ?? "-").toUpperCase(),
                String(d.email ?? "-"),
                String(d.eventos ?? "-"),
              ]);
              break;
            case "vagas":
              colunas = ["Empresa", "Placa", "Modelo", "Credencial", "Status"];
              linhas = data.dados.map((d) => [
                String(d.empresa ?? "-").toUpperCase(),
                String(d.placa ?? "-"),
                String(d.modelo ?? "-"),
                String(d.credencial ?? "-"),
                String(d.status ?? "-"),
              ]);
              break;
            case "checkin":
            case "checkout":
              colunas = [
                "Nome",
                "CPF",
                "Empresa",
                "Função",
                data.tipo === "checkin" ? "Check-in" : "Check-out",
                "Validado Por",
              ];
              linhas = data.dados.map((d) => [
                String(d.nome ?? "-").toUpperCase(),
                String(d.cpf ?? "-"),
                String(d.empresa ?? "-").toUpperCase(),
                String(d.funcao ?? "-").toUpperCase(),
                String(data.tipo === "checkin" ? d.checkIn : d.checkOut ?? "-"),
                String(d.validadoPor ?? "-"),
              ]);
              break;
            case "tempo":
              colunas = [
                "Nome",
                "CPF",
                "Empresa",
                "Função",
                "Check-in",
                "Check-out",
                "Tempo Total",
              ];
              linhas = data.dados.map((d) => [
                String(d.nome ?? "-").toUpperCase(),
                String(d.cpf ?? "-"),
                String(d.empresa ?? "-").toUpperCase(),
                String(d.funcao ?? "-").toUpperCase(),
                String(d.checkIn ?? "-"),
                String(d.checkOut ?? "-"),
                String(d.tempoTotal ?? "-"),
              ]);
              break;
            case "tipoCredencial":
              colunas = [
                "Nome",
                "CPF",
                "Empresa",
                "Função",
                "Tipo de Credencial",
              ];
              linhas = data.dados.map((d) => [
                String(d.nome ?? "-").toUpperCase(),
                String(d.cpf ?? "-"),
                String(d.empresa ?? "-").toUpperCase(),
                String(d.funcao ?? "-").toUpperCase(),
                String(d.tipoCredencial ?? "-"),
              ]);
              break;
            case "cadastradoPor":
              colunas = ["Nome", "CPF", "Empresa", "Função", "Cadastrado Por"];
              linhas = data.dados.map((d) => [
                String(d.nome ?? "-").toUpperCase(),
                String(d.cpf ?? "-"),
                String(d.empresa ?? "-").toUpperCase(),
                String(d.funcao ?? "-").toUpperCase(),
                String(d.cadastradoPor ?? "-"),
              ]);
              break;
          }
        }

        autoTable(doc, {
          head: [colunas],
          body: linhas,
          startY: 50,
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
          margin: { left: 15, right: 15 },
          theme: "grid",
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 100;

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Relatório emitido em ${dataHora}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );

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
