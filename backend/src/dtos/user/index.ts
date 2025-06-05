export interface CreateUserDto {
    email: string;
    name: string;
    phone: string;
    password: string;
    status?: boolean;         // opcional, padrão = true
    profile?: "admin" | "technician" | "requester";
}

export interface UpdateUserDto {
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
    status?: boolean;
    profile?: "admin" | "technician" | "requester";
} 