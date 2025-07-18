import { ReactNode } from "react";

interface SummaryCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: number;
    description?: string;
}

const SummaryCard = ({ title, value, icon, trend, description }: SummaryCardProps) => (
    <div className="bg-gradient-to-br from-[#23232b] to-[#18181b] rounded-2xl p-6 shadow-lg border border-[#23232b] transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl min-w-[220px]">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#b3b3c6] uppercase tracking-wide">{title}</span>
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 text-primary">{icon}</span>
        </div>
        <div className="text-4xl font-extrabold tracking-tight text-[#f5f5f5]">{value}</div>
        <div className="flex items-center gap-2 mt-2">
            {trend !== undefined && (
                <span className={`text-xs font-bold ${trend > 0 ? 'text-green-400' : 'text-red-400'} animate-pulse`}>
                    {trend > 0 ? `▲ +${trend}%` : `▼ ${trend}%`}
                </span>
            )}
            {description && <span className="text-xs text-[#b3b3c6]">{description}</span>}
        </div>
    </div>
);

export default SummaryCard; 