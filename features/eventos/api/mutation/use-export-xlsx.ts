/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ExportXLSXData {
  titulo: string;
  dados: Record<string, unknown>[];
  filtros: {
    dia?: string;
    empresa?: string;
    funcao?: string;
    status?: string;
    tipoCredencial?: string;
  };
}

export const useExportXLSX = () => {
  return useMutation({
    mutationFn: async (data: ExportXLSXData) => {
      try {
        // Mapear os dados para o formato XLS com as colunas específicas
        const xlsData = data.dados.map((item) => ({
          nome: item.nome || "N/A",
          cpf: item.cpf || "N/A",
          funcao: item.funcao || "N/A",
          empresa: item.empresa || "N/A",
          tipo_credencial: item.tipoPulseira || "N/A",
          pulseira_codigo: item.numeroPulseira || "N/A",
          checkin: item.checkIn, // Formato: DD/MM/AAAA HH:MM:SS (Brasil)
          checkout: item.checkOut, // Formato: DD/MM/AAAA HH:MM:SS (Brasil)
          tempo_total: item.tempoTotal || "N/A",
          pulseira_trocada: item.pulseiraTrocada || "Não", // Campo padrão
          status: item.status || "N/A",
          cadastrado_por: item.cadastradoPor || "Sistema", // Campo padrão
        }));

        // Criar workbook e worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(xlsData);

        // Configurar largura das colunas
        const columnWidths = [
          { wch: 25 }, // nome
          { wch: 15 }, // cpf
          { wch: 20 }, // funcao
          { wch: 25 }, // empresa
          { wch: 20 }, // tipo_credencial
          { wch: 15 }, // pulseira_codigo
          { wch: 20 }, // checkin
          { wch: 20 }, // checkout
          { wch: 15 }, // tempo_total
          { wch: 15 }, // pulseira_trocada
          { wch: 15 }, // status
          { wch: 20 }, // cadastrado_por
        ];
        worksheet["!cols"] = columnWidths;

        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

        // Gerar nome do arquivo
        const agora = new Date();
        const nomeArquivo = `${data.titulo.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}_${agora.getTime()}.xlsx`;

        // Fazer download do arquivo
        XLSX.writeFile(workbook, nomeArquivo);

        return { success: true, filename: nomeArquivo };
      } catch (error) {
        console.error("Erro ao gerar XLSX:", error);
        throw new Error("Erro ao gerar planilha Excel");
      }
    },
    onSuccess: (data) => {
      toast.success(`Planilha exportada com sucesso: ${data.filename}`);
    },
    onError: (error) => {
      console.error("Erro ao exportar XLSX:", error);
      toast.error("Erro ao exportar planilha. Tente novamente.");
    },
  });
};
