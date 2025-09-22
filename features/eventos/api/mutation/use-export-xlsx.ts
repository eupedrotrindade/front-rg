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
        // Função para formatar data no padrão brasileiro: DD/MM/AAAA HH:MM:SS
        const formatTimestamp = (dateValue: any): string => {
          if (!dateValue) return "";

          try {
            let date: Date;

            // Se já é um timestamp (número), cria Date
            if (typeof dateValue === "number") {
              date = new Date(dateValue);
            }
            // Se é uma string de data, converte para Date
            else if (typeof dateValue === "string") {
              // Normalizar diferentes formatos de string
              let normalizedDate = dateValue.trim();

              // "2025-09-22 11:03:38+00" -> "2025-09-22T11:03:38.000Z"
              if (normalizedDate.includes('+00') && !normalizedDate.includes('T')) {
                normalizedDate = normalizedDate.replace(' ', 'T').replace('+00', '.000Z');
              }
              // "2025-09-22 11:03:38-03" -> "2025-09-22T11:03:38.000-03:00"
              else if (normalizedDate.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+-]\d{2}$/)) {
                const parts = normalizedDate.split(' ');
                const datePart = parts[0];
                const timePart = parts[1].substring(0, 8);
                const tzPart = parts[1].substring(8);
                normalizedDate = `${datePart}T${timePart}.000${tzPart}:00`;
              }
              // "2025-09-22 11:03:38" sem timezone -> assumir UTC
              else if (normalizedDate.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                normalizedDate = normalizedDate.replace(' ', 'T') + '.000Z';
              }

              date = new Date(normalizedDate);
            }
            // Se é um objeto Date, usa diretamente
            else if (dateValue instanceof Date) {
              date = dateValue;
            } else {
              return "";
            }

            // Verifica se a data é válida
            if (isNaN(date.getTime())) {
              return "";
            }

            // Formatar no padrão brasileiro: DD/MM/AAAA HH:MM:SS
            return date.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'America/Sao_Paulo'
            });

          } catch (error) {
            console.warn("Erro ao formatar timestamp:", dateValue, error);
            return "";
          }
        };

        // Mapear os dados para o formato XLS com as colunas específicas
        const xlsData = data.dados.map((item) => ({
          nome: item.nome || "N/A",
          cpf: item.cpf || "N/A",
          funcao: item.funcao || "N/A",
          empresa: item.empresa || "N/A",
          tipo_credencial: item.tipoPulseira || "N/A",
          pulseira_codigo: item.numeroPulseira || "N/A",
          checkin_timestamp: formatTimestamp(item.checkIn), // Formato: DD/MM/AAAA HH:MM:SS (Brasil)
          checkout_timestamp: formatTimestamp(item.checkOut), // Formato: DD/MM/AAAA HH:MM:SS (Brasil)
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
          { wch: 20 }, // checkin_timestamp
          { wch: 20 }, // checkout_timestamp
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
