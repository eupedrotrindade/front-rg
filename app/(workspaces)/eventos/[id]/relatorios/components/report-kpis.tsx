import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, UserCog, Building } from "lucide-react"
import type { Estatisticas } from "../types"

interface ReportKpisProps {
    estatisticas: Estatisticas
}

export function ReportKpis({ estatisticas }: ReportKpisProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Participantes</p>
                            <p className="text-3xl font-bold">{estatisticas.totalParticipantes}</p>
                        </div>
                        <Users className="h-8 w-8 opacity-80" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Check-in Sincronizado</p>
                            <div className="flex items-center gap-2">
                                <p className="text-3xl font-bold">{estatisticas.participantesComCheckIn}</p>
                                <div className="text-xs opacity-75">
                                    ({((estatisticas.participantesComCheckIn / estatisticas.totalParticipantes) * 100).toFixed(1)}%)
                                </div>
                            </div>
                        </div>
                        <Clock className="h-8 w-8 opacity-80" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Coordenadores</p>
                            <p className="text-3xl font-bold">{estatisticas.totalCoordenadores}</p>
                        </div>
                        <UserCog className="h-8 w-8 opacity-80" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Com Pulseira</p>
                            <p className="text-3xl font-bold">{estatisticas.participantesComPulseira}</p>
                        </div>
                        <Building className="h-8 w-8 opacity-80" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}