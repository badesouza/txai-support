export interface CreateCallDto {
    description: string;
    userId: number;
    status?: "open" | "in_service" | "completed" | "canceled";
}

export interface UpdateCallDto {
    description?: string;
    status?: "open" | "in_service" | "completed" | "canceled";
} 