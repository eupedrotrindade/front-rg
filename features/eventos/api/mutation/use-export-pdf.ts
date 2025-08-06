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

        // Tentar carregar papel timbrado
        let imagemCarregada = false;
        let imagemBase64: string | null = null;

        const tentarCarregarImagem = async (
          caminho: string,
          formato: string
        ): Promise<boolean> => {
          try {
            const response = await fetch(caminho);
            if (response.ok) {
              const imageBlob = await response.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                  try {
                    if (!e.target) return resolve(false);
                    imagemBase64 = e.target.result as string;
                    doc.addImage(imagemBase64, formato, 0, 0, 210, 297);
                    resolve(true);
                  } catch {
                    resolve(false);
                  }
                };
                reader.readAsDataURL(imageBlob);
              });
            }
            return false;
          } catch {
            return false;
          }
        };

        // Tentar diferentes caminhos para o papel timbrado
        const caminhosTentativa = [
          { path: "/images/folha-timbrada.jpg", format: "JPEG" },
          { path: "/images/folha-timbrada.png", format: "PNG" },
          { path: "./images/folha-timbrada.jpg", format: "JPEG" },
          { path: "./images/folha-timbrada.png", format: "PNG" },
        ];

        for (const tentativa of caminhosTentativa) {
          const carregada = await tentarCarregarImagem(
            tentativa.path,
            tentativa.format
          );
          if (carregada) {
            imagemCarregada = true;
            break;
          }
        }

        // Se não conseguiu carregar a imagem, usar cabeçalho padrão
        if (!imagemCarregada) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(97, 14, 92);
          doc.text("RG Produções & Eventos", 20, 20);
        }

        // Título do relatório
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(97, 14, 92);
        doc.text(data.titulo, doc.internal.pageSize.width / 2, 45, {
          align: "center",
        });

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
              "Empresa",
              "Função",
              "Pulseira",
              "Tipo_pulseira",
              "Check-in",
              "Check-out",
            ];
            linhas = data.dados.map((d) => [
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.pulseira ?? "-"),
              String(d.tipoPulseira ?? "-"),
              String(d.checkIn ?? "-"),
              String(d.checkOut ?? "-"),
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
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.empresa ?? "-"),
              String(d.funcao ?? "-"),
              String(d.tipoCredencial ?? "-"),
            ]);
            break;

          case "cadastradoPor":
            colunas = [
              "Nome",
              "CPF",
              "Empresa",
              "Função",
              "Cadastrado Por",
            ];
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
              "Empresa",
              "Pulseira",
              "Tipo_pulseira",
              "Check-in",
              "Check-out",
            ];
            linhas = data.dados.map((d) => [
              String(d.nome ?? "-"),
              String(d.cpf ?? "-"),
              String(d.funcao ?? "-"),
              String(d.empresa ?? "-"),
              String(d.pulseira ?? "-"),
              String(d.tipoPulseira ?? "-"),
              String(d.checkIn ?? "-"),
              String(d.checkOut ?? "-"),
            ]);
        }

        // Gerar tabela
        autoTable(doc, {
          head: [colunas],
          body: linhas,
          startY: 60,
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [97, 14, 92],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          margin: {
            top: 60,
            bottom: 40,
            left: 15,
            right: 15,
          },
          theme: "striped",
          willDrawPage: function (data: { pageNumber: number }) {
            if (imagemCarregada && imagemBase64 && data.pageNumber > 1) {
              const formato = imagemBase64.includes("data:image/jpeg")
                ? "JPEG"
                : "PNG";
              doc.addImage(imagemBase64, formato, 0, 0, 210, 297);
            }
          },
          didDrawPage: function (pageData: { pageNumber: number }) {
            if (pageData.pageNumber > 1) {
              doc.setFontSize(16);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(97, 14, 92);
              doc.text(data.titulo, doc.internal.pageSize.width / 2, 45, {
                align: "center",
              });
            }
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(
              `Página ${pageData.pageNumber}`,
              doc.internal.pageSize.width - 25,
              doc.internal.pageSize.height - 25,
              { align: "right" }
            );
          },
        });

        // Adicionar total de registros
        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(97, 14, 92);
        doc.text(
          `TOTAL DE REGISTROS: ${linhas.length}`,
          doc.internal.pageSize.width / 2,
          finalY + 15,
          { align: "center" }
        );

        // Adicionar data/hora de geração
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Relatório emitido em ${dataHora}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 25,
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
