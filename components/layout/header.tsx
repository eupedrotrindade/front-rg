"use client";

import { useClerk, UserButton } from "@clerk/nextjs";

const Header = () => {
    const { user } = useClerk();
    return (
        <header className="sticky top-0 z-30 bg-[#18181b]/95 border-b border-[#23232b] flex items-center justify-between px-8 py-4 h-16 shadow-[0_2px_8px_0_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-6">

                <div className="flex items-center gap-3">
                    <span className="flex flex-col items-end mr-2">
                        <span className="font-semibold text-sm">
                            {typeof window !== "undefined" && user?.fullName
                                ? user.fullName
                                : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {typeof window !== "undefined" && user?.primaryEmailAddress?.emailAddress
                                ? user.primaryEmailAddress.emailAddress
                                : ""}
                        </span>
                    </span>
                    <UserButton afterSignOutUrl="/sign-in" />
                </div>
            </div>
        </header>
    );
};

export default Header; 