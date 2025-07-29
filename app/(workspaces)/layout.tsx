import HeaderWorkspace from "@/components/layout/header-work";


const WorkspaceLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex min-h-screen bg-white text-purple-900 font-inter">

            <div className="flex-1 flex flex-col min-h-screen ">

                <main className="flex-1 p-0  overflow-y-auto">{children}</main>
            </div>
        </div>
    );
};

export default WorkspaceLayout;