"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface Props {
    children: ReactNode;
}

export const QueryClientWrapper = ({ children }: Props) => {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutos
                gcTime: 10 * 60 * 1000, // 10 minutos
                refetchOnWindowFocus: false,
                retry: 1,
            },
            mutations: {
                retry: 1,
            },
        },
    }));
    return <QueryClientProvider client={queryClient}>{children}{process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}</QueryClientProvider>;
}; 