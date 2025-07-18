'use client';
import AgendaDashboard from '@/features/calendar/components/agenda-dashboard';

const CalendarPage = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Agenda de Eventos</h1>
            <AgendaDashboard />
            {/* <CalendarDashboard /> */}
        </div>
    );
};

export default CalendarPage; 