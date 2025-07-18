import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
    { date: "2024-06-01", wristbands: 120, staffs: 15, participants: 300 },
    { date: "2024-06-02", wristbands: 140, staffs: 18, participants: 320 },
    { date: "2024-06-03", wristbands: 160, staffs: 20, participants: 350 },
    { date: "2024-06-04", wristbands: 180, staffs: 22, participants: 370 },
    { date: "2024-06-05", wristbands: 200, staffs: 25, participants: 400 },
    { date: "2024-06-06", wristbands: 210, staffs: 24, participants: 420 },
    { date: "2024-06-07", wristbands: 220, staffs: 26, participants: 440 },
    { date: "2024-06-08", wristbands: 230, staffs: 28, participants: 460 },
    { date: "2024-06-09", wristbands: 240, staffs: 30, participants: 480 },
    { date: "2024-06-10", wristbands: 250, staffs: 32, participants: 500 },
    { date: "2024-06-11", wristbands: 260, staffs: 34, participants: 520 },
    { date: "2024-06-12", wristbands: 270, staffs: 36, participants: 540 },
    { date: "2024-06-13", wristbands: 280, staffs: 38, participants: 560 },
    { date: "2024-06-14", wristbands: 290, staffs: 40, participants: 580 },
];

const chartConfig: ChartConfig = {
    wristbands: {
        label: "Credencial",
        color: "var(--chart-1)",
    },
    staffs: {
        label: "Staffs",
        color: "var(--chart-2)",
    },
    participants: {
        label: "Participantes",
        color: "var(--chart-3)",
    },
};

const periods = [
    { label: "Últimos 14 dias", value: "14d" },
    { label: "Últimos 7 dias", value: "7d" },
];

type PeriodKey = "14d" | "7d";

const VisitorsChart = () => {
    const [period, setPeriod] = React.useState<PeriodKey>("14d");

    // Filtra os dados conforme o período selecionado
    const filteredData = React.useMemo(() => {
        let daysToSubtract = 14;
        if (period === "7d") daysToSubtract = 7;
        const referenceDate = new Date("2024-06-14");
        const startDate = new Date(referenceDate);
        startDate.setDate(startDate.getDate() - daysToSubtract);
        return chartData.filter((item) => new Date(item.date) >= startDate);
    }, [period]);

    return (
        <div
            style={{
                background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.25)",
                border: "1px solid #374151",
                marginTop: "1.5rem",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span
                    style={{
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    Evolução de Credencial, Staffs e Participantes
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {periods.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value as PeriodKey)}
                            style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "0.5rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                transition: "all 0.2s",
                                background: period === p.value ? "#3b82f6" : "#374151",
                                color: period === p.value ? "#fff" : "#9CA3AF",
                                boxShadow: period === p.value ? "0 2px 8px 0 rgba(59,130,246,0.25)" : "none",
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ width: "100%", height: "250px" }}>
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillWristbands" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                            </linearGradient>
                            <linearGradient id="fillStaffs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                            </linearGradient>
                            <linearGradient id="fillParticipants" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tick={{ fill: "#9CA3AF", fontSize: 12 }}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString("pt-BR", {
                                    month: "short",
                                    day: "numeric",
                                });
                            }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
                                            return new Date(value).toLocaleDateString("pt-BR", {
                                                month: "short",
                                                day: "numeric",
                                            });
                                        }
                                        return '';
                                    }}
                                    indicator="dot"
                                />
                            }
                        />
                        <Area
                            dataKey="wristbands"
                            type="monotone"
                            fill="url(#fillWristbands)"
                            stroke="var(--chart-1)"
                            strokeWidth={2.5}
                        />
                        <Area
                            dataKey="staffs"
                            type="monotone"
                            fill="url(#fillStaffs)"
                            stroke="var(--chart-2)"
                            strokeWidth={2.5}
                        />
                        <Area
                            dataKey="participants"
                            type="monotone"
                            fill="url(#fillParticipants)"
                            stroke="var(--chart-3)"
                            strokeWidth={2.5}
                        />
                        <ChartLegend content={<ChartLegendContent payload={[]} />} />
                    </AreaChart>
                </ChartContainer>
            </div>
        </div>
    );
};

export default VisitorsChart;
