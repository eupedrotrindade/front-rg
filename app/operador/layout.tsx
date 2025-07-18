"use client";
import React from "react";
import OperatorRealtimeSync from "./operator-realtime-sync";

const OperadorLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <>
            <OperatorRealtimeSync />
            {children}
        </>
    );
};

export default OperadorLayout; 