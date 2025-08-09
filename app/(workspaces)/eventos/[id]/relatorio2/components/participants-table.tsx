import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users } from "lucide-react"
import type { ParticipantRecord } from "../types"

interface ParticipantsTableProps {
    participants: ParticipantRecord[]
    groupByCompany?: boolean
}

export function ParticipantsTable({ participants, groupByCompany = true }: ParticipantsTableProps) {
    const getStatusBadge = (status: ParticipantRecord['status']) => {
        const variants = {
            'present': { variant: 'default' as const, label: 'Presente', className: 'bg-green-100 text-green-800' },
            'checked_out': { variant: 'secondary' as const, label: 'Finalizado', className: 'bg-blue-100 text-blue-800' },
            'no_checkin': { variant: 'destructive' as const, label: 'Sem Check-in', className: 'bg-red-100 text-red-800' }
        }
        
        const config = variants[status]
        return (
            <Badge variant={config.variant} className={config.className}>
                {config.label}
            </Badge>
        )
    }
    
    // Group by company if requested
    const groupedData = groupByCompany 
        ? participants.reduce((groups, participant) => {
            const company = participant.empresa || 'Sem Empresa'
            if (!groups[company]) groups[company] = []
            groups[company].push(participant)
            return groups
        }, {} as Record<string, ParticipantRecord[]>)
        : { 'Todos': participants }
    
    const companies = Object.keys(groupedData).sort()
    
    if (participants.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Nenhum participante encontrado com os filtros aplicados</p>
                </CardContent>
            </Card>
        )
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participantes ({participants.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {companies.map(company => (
                        <div key={company}>
                            {groupByCompany && (
                                <div className="mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {company} ({groupedData[company].length})
                                    </h3>
                                    <div className="text-sm text-gray-600 mb-4">
                                        Check-ins: {groupedData[company].filter(p => p.checkIn !== '-').length} • 
                                        Check-outs: {groupedData[company].filter(p => p.checkOut !== '-').length} • 
                                        Presentes: {groupedData[company].filter(p => p.status === 'present').length}
                                    </div>
                                </div>
                            )}
                            
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="font-semibold">Nome</TableHead>
                                            <TableHead className="font-semibold">CPF</TableHead>
                                            <TableHead className="font-semibold">Função</TableHead>
                                            <TableHead className="font-semibold">Pulseira</TableHead>
                                            <TableHead className="font-semibold">Check-in</TableHead>
                                            <TableHead className="font-semibold">Check-out</TableHead>
                                            <TableHead className="font-semibold">Tempo</TableHead>
                                            <TableHead className="font-semibold">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedData[company].map(participant => (
                                            <TableRow key={participant.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">
                                                    {participant.nome}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {participant.cpf}
                                                </TableCell>
                                                <TableCell>
                                                    {participant.funcao || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{participant.pulseira}</div>
                                                        {participant.tipoPulseira !== '-' && (
                                                            <div className="text-xs text-gray-500">{participant.tipoPulseira}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {participant.checkIn}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {participant.checkOut}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm font-medium">
                                                    {participant.tempoTotal}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(participant.status)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}