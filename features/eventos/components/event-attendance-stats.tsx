import { useEventAttendanceStats } from "../api/query/use-event-attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Clock, Users, BarChart3 } from "lucide-react";

interface EventAttendanceStatsProps {
    eventId: string;
}

export const EventAttendanceStats = ({ eventId }: EventAttendanceStatsProps) => {
    const { data: stats, isLoading, error } = useEventAttendanceStats(eventId);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                    <p className="text-red-600">Erro ao carregar estatísticas</p>
                </CardContent>
            </Card>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Checks */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Checks</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalChecks}</div>
                    <p className="text-xs text-muted-foreground">
                        Registros de presença
                    </p>
                </CardContent>
            </Card>

            {/* Check-ins */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
                    <Check className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.totalCheckIns}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.totalChecks > 0
                            ? `${((stats.totalCheckIns / stats.totalChecks) * 100).toFixed(1)}% do total`
                            : "0% do total"
                        }
                    </p>
                </CardContent>
            </Card>

            {/* Check-outs */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Check-outs</CardTitle>
                    <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalCheckOuts}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.totalCheckIns > 0
                            ? `${((stats.totalCheckOuts / stats.totalCheckIns) * 100).toFixed(1)}% dos check-ins`
                            : "0% dos check-ins"
                        }
                    </p>
                </CardContent>
            </Card>

            {/* Horário Médio */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Horário Médio</CardTitle>
                    <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                        {stats.averageCheckInTime ? `${stats.averageCheckInTime}h` : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Check-in médio
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}; 