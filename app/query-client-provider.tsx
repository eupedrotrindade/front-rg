"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface Props {
    children: ReactNode;
}

export const QueryClientWrapper = ({ children }: Props) => {
    const [queryClient] = useState(() => new QueryClient());
    return <QueryClientProvider client={queryClient}>{children}{process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}</QueryClientProvider>;
}; 