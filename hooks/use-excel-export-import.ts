import { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface ExcelExportImportOptions {
  filename?: string;
  sheetName?: string;
}

export const useExcelExportImport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportToExcel = async (
    data: Record<string, unknown>[],
    options: ExcelExportImportOptions = {}
  ) => {
    try {
      setIsExporting(true);

      const { filename = "export", sheetName = "Sheet1" } = options;

      // Criar workbook e worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Download do arquivo
      saveAs(
        blob,
        `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      toast.success("Arquivo exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar arquivo. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const importFromExcel = async (
    file: File,
    onDataProcessed: (data: Record<string, unknown>[]) => void
  ): Promise<void> => {
    try {
      setIsImporting(true);

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Pegar a primeira planilha
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Converter para JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            toast.error("Arquivo vazio ou sem dados válidos.");
            return;
          }

          // Pegar cabeçalhos (primeira linha)
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as unknown[][];

          // Converter para array de objetos
          const processedData = rows.map((row) => {
            const obj: Record<string, unknown> = {};
            headers.forEach((header, index) => {
              if (header && row[index] !== undefined) {
                obj[header] = row[index];
              }
            });
            return obj;
          });

          onDataProcessed(processedData);
          toast.success(
            `${processedData.length} registros importados com sucesso!`
          );
        } catch (error) {
          console.error("Erro ao processar arquivo:", error);
          toast.error("Erro ao processar arquivo. Verifique o formato.");
        } finally {
          setIsImporting(false);
        }
      };

      reader.onerror = () => {
        toast.error("Erro ao ler arquivo.");
        setIsImporting(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar arquivo. Tente novamente.");
      setIsImporting(false);
    }
  };

  return {
    exportToExcel,
    importFromExcel,
    isExporting,
    isImporting,
  };
};
