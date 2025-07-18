"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    TrendingUp,
    TrendingDown,
    Award,
    Ticket,
    CheckCircle,
    XCircle
} from 'lucide-react';

interface EventStatsProps {
    totalWristbands: number;
    distributedWristbands: number;
    totalParticipants: number;
    confirmedParticipants: number;
}

const EventStats = ({
    totalWristbands,
    distributedWristbands,
    totalParticipants,
    confirmedParticipants,
}: EventStatsProps) => {
    // Calcular percentuais
    const wristbandDistributionRate = totalWristbands > 0 ? (distributedWristbands / totalWristbands) * 100 : 0;
    const participantConfirmationRate = totalParticipants > 0 ? (confirmedParticipants / totalParticipants) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Métricas de Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Taxa de Distribuição de Credencial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            Distribuição de Credencial
                            {wristbandDistributionRate > 50 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                        </CardTitle>
                        <CardDescription>
                            Eficiência na distribuição das credenciais
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Distribuídas</span>
                            <span className="text-sm text-muted-foreground">
                                {distributedWristbands} / {totalWristbands}
                            </span>
                        </div>
                        <Progress value={wristbandDistributionRate} className="w-full" />
                        <div className="text-3xl font-bold text-center">
                            {wristbandDistributionRate.toFixed(1)}%
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            {distributedWristbands > 0 ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {distributedWristbands} credenciais entregues
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Nenhuma credencial distribuída
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Taxa de Confirmação de Participantes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Confirmação de Presença
                            {participantConfirmationRate > 70 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                        </CardTitle>
                        <CardDescription>
                            Taxa de confirmação dos participantes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Confirmados</span>
                            <span className="text-sm text-muted-foreground">
                                {confirmedParticipants} / {totalParticipants}
                            </span>
                        </div>
                        <Progress value={participantConfirmationRate} className="w-full" />
                        <div className="text-3xl font-bold text-center">
                            {participantConfirmationRate.toFixed(1)}%
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            {confirmedParticipants > 0 ? (
                                <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {confirmedParticipants} presenças confirmadas
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Nenhuma confirmação ainda
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EventStats; 