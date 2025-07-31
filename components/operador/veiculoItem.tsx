"use client"

import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import { Edit, Trash2 } from "lucide-react"
import { EventVehicle } from "@/features/eventos/actions/create-event-vehicle"

interface VeiculoItemProps {
  veiculo: EventVehicle
  onEdit?: (veiculo: EventVehicle) => void
  onDelete?: (id: string) => void
}

export default function VeiculoItem({ veiculo, onEdit, onDelete }: VeiculoItemProps) {
  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>{veiculo.empresa || "-"}</TableCell>
      <TableCell>{veiculo.placa || "-"}</TableCell>
      <TableCell>{veiculo.modelo || "-"}</TableCell>
      <TableCell>{veiculo.credencial || "-"}</TableCell>
      <TableCell>
        <Badge
          variant={veiculo.status ? "default" : "destructive"}
          className={veiculo.status ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
        >
          {veiculo.status ? "Retirada" : "Pendente"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(veiculo)}
              className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 flex items-center justify-center rounded-md cursor-pointer text-white"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDelete && veiculo.id && (
            <button
              onClick={() => onDelete(veiculo.id!)}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 flex items-center justify-center rounded-md cursor-pointer text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
