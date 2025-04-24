"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/components/forms/signup-form";
import { useAuth } from "@/components/providers/auth-provider";

export default function SignupPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && user) {
            router.push("/dashboard");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    if (user) {
        return null; // This will briefly show while the redirect happens
    }

    return (
        <div className="container flex h-screen items-center justify-center">
            <SignupForm />
        </div>
    );
}