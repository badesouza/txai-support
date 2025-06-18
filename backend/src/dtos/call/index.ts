export interface CreateCallDto {
    title: string;
    description: string;
    status: "OPEN" | "IN_PROGRESS" | "CLOSED";
    priority: "LOW" | "MEDIUM" | "HIGH";
    userId: number;
}

export interface UpdateCallDto {
    title?: string;
    description?: string;
    status?: "OPEN" | "IN_PROGRESS" | "CLOSED";
    priority?: "LOW" | "MEDIUM" | "HIGH";
} 