import { Card, CardContent } from "@/components/ui/card"
import { Users, LogIn, LogOut, Clock } from "lucide-react"
import type { ReportSummary } from "../types"

interface ReportSummaryProps {
    summary: ReportSummary
}

export function ReportSummaryComponent({ summary }: ReportSummaryProps) {
    const presenceRate = summary.totalParticipantes > 0 
        ? Math.round((summary.totalComCheckIn / summary.totalParticipantes) * 100)
        : 0
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Total</p>
                            <p className="text-2xl font-bold">{summary.totalParticipantes}</p>
                        </div>
                        <Users className="h-6 w-6 opacity-80" />
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Check-in</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-bold">{summary.totalComCheckIn}</p>
                                <span className="text-xs opacity-75">({presenceRate}%)</span>
                            </div>
                        </div>
                        <LogIn className="h-6 w-6 opacity-80" />
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Check-out</p>
                            <p className="text-2xl font-bold">{summary.totalComCheckOut}</p>
                        </div>
                        <LogOut className="h-6 w-6 opacity-80" />
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Ativos</p>
                            <p className="text-2xl font-bold">{summary.totalAtivos}</p>
                        </div>
                        <Clock className="h-6 w-6 opacity-80" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}