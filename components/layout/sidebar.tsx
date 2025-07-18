"use client";
import { useState } from "react";
import { Home, History, ChevronDown, ChevronRight, Trello } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
    label: string;
    href?: string;
    icon: React.ElementType;
    children?: MenuItem[];
};

const menu: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    // { label: "Eventos", href: "/dashboard/eventos", icon: Calendar },
    // { label: "Coordenadores", href: "/dashboard/event-managers", icon: UserCog },
    // { label: "Operador", href: "/dashboard/event-staff", icon: Users },
    // {
    //     label: "Credenciais",
    //     icon: Badge,
    //     children: [
    //         { label: "Credenciais distribuídas", href: "/dashboard/event-wristbands", icon: Badge },
    //         { label: "Modelos de Credenciais", href: "/dashboard/event-wristband-models", icon: Ticket },
    //     ],
    // },
    // { label: "Calendário", href: "/dashboard/calendar", icon: Calendar },
    // { label: "Staff Geral", href: "/dashboard/event-participants", icon: Users },
    // { label: "Galeria", href: "/dashboard/gallery", icon: ImageIcon },
    { label: "Histórico", href: "/dashboard/event-histories", icon: History },
    { label: "Histórico OPERADORES", href: "/dashboard/operator-actions-history", icon: History },
    { label: "Relatorio", href: "/dashboard/relatorio", icon: Trello }
];

const Sidebar = () => {
    const pathname = usePathname();
    const [credentialsOpen, setCredentialsOpen] = useState(false);

    const renderMenuItem = (item: MenuItem) => {
        const isActive = pathname === item.href;
        if (item.children) {
            // Submenu
            const isAnyChildActive = item.children.some((child) => pathname === child.href);
            return (
                <li key={item.label}>
                    <button
                        type="button"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-base transition-all duration-200 group uppercase tracking-wide outline-none focus:ring-2 focus:ring-blue-500/60 w-full text-left ${isAnyChildActive
                            ? "bg-gradient-to-r from-blue-200/30 to-transparent border-l-4 border-blue-500 text-blue-500 shadow-md"
                            : "hover:bg-white/10 text-[#f5f5f5]"
                            }`}
                        aria-label={item.label}
                        onClick={() => setCredentialsOpen((open) => !open)}
                    >
                        <span
                            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${isAnyChildActive
                                ? "bg-blue-200/20 text-blue-500"
                                : "bg-[#23232b] text-[#b3b3c6] group-hover:bg-blue-200/10"
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                        </span>
                        <span className="truncate flex-1">{item.label}</span>
                        {credentialsOpen ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                    {credentialsOpen && (
                        <ul className="pl-8 py-1 space-y-1">
                            {item.children.map((child) => {
                                const isChildActive = pathname === child.href;
                                return (
                                    <li key={child.href}>
                                        <Link
                                            href={child.href!}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-base transition-all duration-200 group uppercase tracking-wide outline-none focus:ring-2 focus:ring-blue-500/60 ${isChildActive
                                                ? "bg-gradient-to-r from-blue-200/30 to-transparent border-l-4 border-blue-500 text-blue-500 shadow-md"
                                                : "hover:bg-white/10 text-[#f5f5f5]"
                                                }`}
                                            aria-label={child.label}
                                        >
                                            <span
                                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${isChildActive
                                                    ? "bg-blue-200/20 text-blue-500"
                                                    : "bg-[#23232b] text-[#b3b3c6] group-hover:bg-blue-200/10"
                                                    }`}
                                            >
                                                <child.icon className="w-4 h-4" />
                                            </span>
                                            <span className="truncate">{child.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </li>
            );
        }
        // Item normal
        return (
            <li key={item.href}>
                <Link
                    href={item.href!}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-base transition-all duration-200 group uppercase tracking-wide outline-none focus:ring-2 focus:ring-blue-500/60 ${isActive
                        ? "bg-gradient-to-r from-blue-200/30 to-transparent border-l-4 border-blue-500 text-blue-500 shadow-md"
                        : "hover:bg-white/10 text-[#f5f5f5]"
                        }`}
                    aria-label={item.label}
                >
                    <span
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${isActive
                            ? "bg-blue-200/20 text-blue-500"
                            : "bg-[#23232b] text-[#b3b3c6] group-hover:bg-blue-200/10"
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                    </span>
                    <span className="truncate">{item.label}</span>
                </Link>
            </li>
        );
    };

    return (
        <aside className="w-64 bg-[#18181b] border-r border-[#23232b] flex flex-col min-h-screen shadow-xl">
            <div className="p-6 font-extrabold text-2xl text-primary tracking-tight select-none">
                RG Digital
            </div>

            <nav className="flex-1">
                <ul className="space-y-1 px-2">
                    {menu.map(renderMenuItem)}
                </ul>
            </nav>

        </aside>
    );
};

export default Sidebar; 