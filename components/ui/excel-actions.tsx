"use client";
import { Button } from "@/components/ui/button";
import { useExcelExportImport } from "@/hooks/use-excel-export-import";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { useRef } from "react";

interface ExcelActionsProps {
    data: Record<string, unknown>[];
    filename: string;
    onImport?: (data: Record<string, unknown>[]) => void;
    showImport?: boolean;
    showExport?: boolean;
    disabled?: boolean;
}

const ExcelActions = ({
    data,
    filename,
    onImport,
    showImport = true,
    showExport = true,
    disabled = false,
}: ExcelActionsProps) => {
    const { exportToExcel, importFromExcel, isExporting, isImporting } = useExcelExportImport();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        exportToExcel(data, { filename });
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onImport) {
            importFromExcel(file, onImport);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex items-center gap-2">
            {showExport && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={disabled || isExporting || data.length === 0}
                    className="flex items-center gap-2"
                >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exportando..." : "Exportar Excel"}
                </Button>
            )}

            {showImport && onImport && (
                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImport}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isImporting}
                        className="flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        {isImporting ? "Importando..." : "Importar Excel"}
                    </Button>
                </>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-3 w-3" />
                <span>{data.length} registros</span>
            </div>
        </div>
    );
};

export default ExcelActions; 