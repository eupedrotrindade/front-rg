"use server"
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { redirect } from "next/navigation";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {

    redirect("/eventos")
    return (
        <div className="flex min-h-screen bg-[#111014] text-[#f5f5f5] font-inter">
            <div className="fixed left-0 top-0 h-full z-40">
                <Sidebar />
            </div>
            <div className="flex-1 flex flex-col min-h-screen ml-64">
                <Header />
                <main className="flex-1 p-8 bg-[#111014] overflow-y-auto">{children}</main>
            </div>
        </div>
    );
};

export default DashboardLayout;