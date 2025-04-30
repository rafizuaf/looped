"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingIndicatorProps {
    size?: "small" | "medium" | "large"
    variant?: "spinner" | "dots" | "pulse"
    fullPage?: boolean
    className?: string
    text?: string
}

export function LoadingIndicator({
    size = "medium",
    variant = "dots",
    fullPage = false,
    className,
    text,
}: LoadingIndicatorProps) {
    const sizeClasses = {
        small: "h-4 w-4",
        medium: "h-8 w-8",
        large: "h-12 w-12",
    }

    const renderLoadingIndicator = () => {
        switch (variant) {
            case "spinner":
                return (
                    <motion.div
                        className={cn("border-t-2 border-primary rounded-full", sizeClasses[size], className)}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                )
            case "dots":
                return (
                    <div className="flex space-x-1">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className={cn(
                                    "bg-primary rounded-full",
                                    size === "small" ? "h-1 w-1" : size === "medium" ? "h-2 w-2" : "h-3 w-3",
                                    className,
                                )}
                                initial={{ opacity: 0.4, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Number.POSITIVE_INFINITY,
                                    repeatType: "reverse",
                                    delay: i * 0.2,
                                }}
                            />
                        ))}
                    </div>
                )
            case "pulse":
                return (
                    <motion.div
                        className={cn("bg-primary/20 rounded-md", sizeClasses[size], className)}
                        animate={{ opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                )
            default:
                return null
        }
    }

    const content = (
        <div className="flex flex-col items-center justify-center space-y-2">
            {renderLoadingIndicator()}
            {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
    )

    if (fullPage) {
        return <div className="flex items-center justify-center w-full h-[50vh]">{content}</div>
    }

    return content
}
