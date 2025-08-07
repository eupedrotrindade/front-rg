/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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
        // Importar jsPDF dinamicamente
        const jsPDF = (await import("jspdf")).default;
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF();
        const agora = new Date();
        const dataHora = agora.toLocaleString("pt-BR");

        // Carregar e adicionar logo RG (posição conforme header.png)
        let logoCarregado = false;
        try {
          const logoResponse = await fetch("/images/logo-rg-fone.png");
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = function (e) {
                resolve(e.target?.result as string);
              };
              reader.readAsDataURL(logoBlob);
            });

            // Posicionar logo no lado esquerdo com tamanho maior e melhor posicionamento
            // Logo posicionado à esquerda com proporções fixas
            doc.addImage(logoBase64, "PNG", 12, 8, 50, 20, undefined, "FAST");
            logoCarregado = true;
          }
        } catch (error) {
          console.log("Erro ao carregar logo, usando fallback");
        }

        // Fallback caso logo não carregue - melhor design
        if (!logoCarregado) {
          // Fundo cinza mais suave
          doc.setFillColor(180, 180, 180);
          doc.rect(15, 10, 40, 25, "F");

          // Texto RG mais estilizado
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text("RG", 35, 25, { align: "center" });
        }

        // Título principal "RG Produções & Eventos" - ajustes na fonte e posicionamento
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(138, 43, 138); // Tom de roxo mais próximo da imagem
        doc.text("RG Produções & Eventos", 125, 20, { align: "center" });

        // Subtítulo do evento (se existir nos dados) - posicionado abaixo do título principal
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(138, 43, 138); // Mesmo tom de roxo
        doc.text(data.titulo, 105, 28, { align: "center" });

        // Linha separadora sutil
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);

        // Subtítulo do tipo de relatório - menor e com cor mais suave
        let subtitulo = "";
        switch (data.tipo) {
          case "geral":
            subtitulo = "Relatório Geral de Participantes";
            break;
          case "participantes":
            subtitulo = "Relatório de Participantes";
            break;
          case "coordenadores":
            subtitulo = "Relatório de Coordenadores";
            break;
          case "vagas":
            subtitulo = "Relatório de Vagas";
            break;
          case "checkin":
            subtitulo = "Relatório de Check-in";
            break;
          case "checkout":
            subtitulo = "Relatório de Check-out";
            break;
          case "tempo":
            subtitulo = "Relatório de Tempo de Permanência";
            break;
          case "filtroEmpresa":
            subtitulo = "Relatório por Empresa";
            break;
          case "tipoCredencial":
            subtitulo = "Relatório por Tipo de Credencial";
            break;
          case "cadastradoPor":
            subtitulo = "Relatório por Cadastrado Por";
            break;
          default:
            subtitulo = "Relatório de Eventos";
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(subtitulo, 105, 42, { align: "center" });

        // Definir colunas baseadas no tipo de relatório
        let colunas: string[] = [];
        let linhas: string[][] = [];

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
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.checkIn ?? "-"),
              String(d.checkOut ?? "-"),
              String(d.validadoPor ?? "-"),
            ]);
            break;

          case "coordenadores":
            colunas = ["Nome", "Email", "Eventos"];
            linhas = data.dados.map((d) => [
              String(d.nome ?? "-"),
              String(d.email ?? "-"),
              String(d.eventos ?? "-"),
            ]);
            break;

          case "vagas":
            colunas = ["Empresa", "Placa", "Modelo", "Credencial", "Status"];
            linhas = data.dados.map((d) => [
              String(d.empresa ?? "-"),
              String(d.placa ?? "-"),
              String(d.modelo ?? "-"),
              String(d.credencial ?? "-"),
              String(d.status ?? "-"),
            ]);
            break;

          case "checkin":
            colunas = [
              "Nome",
              "CPF",
              "Empresa",
              "Função",
              "Check-in",
              "Validado Por",
            ];
            linhas = data.dados.map((d) => [
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.checkIn ?? "-"),
              String(d.validadoPor ?? "-"),
            ]);
            break;

          case "checkout":
            colunas = [
              "Nome",
              "CPF",
              "Empresa",
              "Função",
              "Check-out",
              "Validado Por",
            ];
            linhas = data.dados.map((d) => [
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.checkOut ?? "-"),
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
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.checkIn ?? "-"),
              String(d.checkOut ?? "-"),
              String(d.tempoTotal ?? "-"),
            ]);
            break;

          case "filtroEmpresa":
            colunas = [
              "Nome",
              "CPF",
              "Função",
              "Pulseira",
              "Check-in",
              "Check-out",
            ];
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
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.tipoCredencial ?? "-"),
            ]);
            break;

          case "cadastradoPor":
            colunas = ["Nome", "CPF", "Empresa", "Função", "Cadastrado Por"];
            linhas = data.dados.map((d) => [
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.cadastradoPor ?? "-"),
            ]);
            break;

          default: // geral
            colunas = [
              "Nome",
              "CPF",
              "Função",
              "Pulseira",
              "Check-in",
              "Check-out",
            ];
            break;
        }

        // Para todos os tipos de relatório (exceto casos especiais), agrupar por empresa
        if (["geral", "filtroEmpresa"].includes(data.tipo)) {
          const participantesPorEmpresa = new Map<string, any[]>();
          data.dados.forEach((participante) => {
            const empresa = String(participante.empresa || "SEM EMPRESA");
            if (!participantesPorEmpresa.has(empresa)) {
              participantesPorEmpresa.set(empresa, []);
            }
            participantesPorEmpresa.get(empresa)!.push(participante);
          });

          linhas = [];
          const empresasOrdenadas = Array.from(
            participantesPorEmpresa.keys()
          ).sort();

          empresasOrdenadas.forEach((empresa) => {
            const participantes = participantesPorEmpresa.get(empresa) || [];
            const participantesComCheckIn = participantes.filter(
              (p) => p.checkIn && p.checkIn !== "-"
            ).length;
            const totalParticipantes = participantes.length;

            // Linha de cabeçalho da empresa com cor mais próxima da imagem
            linhas.push([
              {
                content: `${empresa.toUpperCase()} (${participantesComCheckIn}/${totalParticipantes})`,
                colSpan: colunas.length,
                styles: {
                  fillColor: [138, 43, 138], // Tom de roxo mais próximo
                  textColor: [255, 255, 255],
                  fontStyle: "bold",
                  halign: "left",
                  fontSize: 9,
                },
              },
            ]);

            // Participantes da empresa
            participantes.forEach((participante) => {
              linhas.push([
                String(participante.nome ?? "-").toUpperCase(),
                String(participante.cpf ?? "-"),
                String(participante.funcao ?? "-").toUpperCase(),
                String(participante.pulseira ?? "-"),
                String(participante.checkIn ?? "-"),
                String(participante.checkOut ?? "-"),
              ]);
            });
          });
        } else {
          // Para outros tipos, usar dados simples sem agrupamento por empresa
          linhas = data.dados.map((d) => {
            switch (data.tipo) {
              case "participantes":
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.cpf ?? "-"),
                  String(d.empresa ?? "-").toUpperCase(),
                  String(d.funcao ?? "-").toUpperCase(),
                  String(d.checkIn ?? "-"),
                  String(d.checkOut ?? "-"),
                  String(d.validadoPor ?? "-"),
                ];
              case "coordenadores":
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.email ?? "-"),
                  String(d.eventos ?? "-"),
                ];
              case "vagas":
                return [
                  String(d.empresa ?? "-").toUpperCase(),
                  String(d.placa ?? "-"),
                  String(d.modelo ?? "-"),
                  String(d.credencial ?? "-"),
                  String(d.status ?? "-"),
                ];
              case "checkin":
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.cpf ?? "-"),
                  String(d.empresa ?? "-").toUpperCase(),
                  String(d.funcao ?? "-").toUpperCase(),
                  String(d.checkIn ?? "-"),
                  String(d.validadoPor ?? "-"),
                ];
              case "checkout":
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.cpf ?? "-"),
                  String(d.empresa ?? "-").toUpperCase(),
                  String(d.funcao ?? "-").toUpperCase(),
                  String(d.checkOut ?? "-"),
                  String(d.validadoPor ?? "-"),
                ];
              case "tempo":
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.cpf ?? "-"),
                  String(d.empresa ?? "-").toUpperCase(),
                  String(d.funcao ?? "-").toUpperCase(),
                  String(d.checkIn ?? "-"),
                  String(d.checkOut ?? "-"),
                  String(d.tempoTotal ?? "-"),
                ];
              case "tipoCredencial":
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.cpf ?? "-"),
                  String(d.empresa ?? "-").toUpperCase(),
                  String(d.funcao ?? "-").toUpperCase(),
                  String(d.tipoCredencial ?? "-"),
                ];
              case "cadastradoPor":
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.cpf ?? "-"),
                  String(d.empresa ?? "-").toUpperCase(),
                  String(d.funcao ?? "-").toUpperCase(),
                  String(d.cadastradoPor ?? "-"),
                ];
              default:
                return [
                  String(d.nome ?? "-").toUpperCase(),
                  String(d.cpf ?? "-"),
                  String(d.funcao ?? "-").toUpperCase(),
                  String(d.pulseira ?? "-"),
                  String(d.checkIn ?? "-"),
                  String(d.checkOut ?? "-"),
                ];
            }
          });
        }

        // Gerar tabela única e contínua com melhor espaçamento
        autoTable(doc, {
          head: [colunas],
          body: linhas,
          startY: 50, // Espaço otimizado para o header
          styles: {
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
          },
          headStyles: {
            fillColor: [138, 43, 138], // Roxo mais próximo da imagem
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248],
          },
          columnStyles: {
            0: { cellWidth: 45 }, // Nome
            1: { cellWidth: 28 }, // CPF
            2: { cellWidth: 25 }, // Função
            3: { cellWidth: 30 }, // Pulseira/Empresa
            4: { cellWidth: 25 }, // Check-in
            5: { cellWidth: 25 }, // Check-out
            6: { cellWidth: 25 }, // Adicional (quando existe)
          },
          margin: { left: 15, right: 15 },
          theme: "grid",
        });

        // Rodapé simples como na imagem
        const finalY = (doc as any).lastAutoTable?.finalY || 100;

        // Data/hora de geração no rodapé
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Relatório emitido em ${dataHora}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );

        // Salvar PDF
        const nomeArquivo = `relatorio_${data.titulo.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}_${agora.getTime()}.pdf`;
        doc.save(nomeArquivo);

        return {
          success: true,
          filename: nomeArquivo,
        };
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
