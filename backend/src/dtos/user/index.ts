export interface CreateUserDto {
    email: string;
    name: string;
    phone: string;
    password: string;
    profile?: "ADMIN" | "USER";
}

export interface UpdateUserDto {
    email?: string;
    name?: string;
    phone?: string;
    password?: string;
    profile?: "ADMIN" | "USER";
} 