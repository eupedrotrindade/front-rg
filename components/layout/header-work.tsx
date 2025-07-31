"use client";
import { useClerk, UserButton } from "@clerk/nextjs";
import Image from "next/image";

const HeaderWorkspace = () => {
    const { user } = useClerk();
    return (
        <header className="sticky top-0 z-30 bg-purple-100  flex items-center justify-between px-8 py-4 h-16 shadow-[0_2px_8px_0_rgba(0,0,0,0.15)]">
            <div className="flex justify-between items-center gap-6 w-full">
                <Image src="/images/logo-rg-fone.png" alt="Logo RG" width={40} height={40} />
                <div className="flex items-center gap-3">
                    <span className="flex flex-col items-end mr-2">
                        <span className="font-semibold text-sm">
                            {typeof window !== "undefined" && user?.fullName
                                ? user.fullName
                                : ""}
                        </span>
                        <span className="text-xs text-black">
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

export default HeaderWorkspace; 