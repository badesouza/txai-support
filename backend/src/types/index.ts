export interface User {
    id: number;
    email: string;
    password: string;
    name: string;
    phone?: string;
    status: boolean;
    profile: string;
    created_at: Date;
    updated_at: Date;
}

export interface Call {
    id: number;
    description: string;
    user_id: number;
    status: 'open' | 'in_service' | 'completed' | 'canceled';
    created_at: Date;
    updated_at: Date;
}

export interface CallImage {
    id: number;
    call_id: number;
    image_path: string;
    created_at: Date;
}

export interface PasswordResetToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
}

export interface UserCreateInput {
    email: string;
    password: string;
    name: string;
    phone: string;
    profile: "admin" | "technician" | "requester";
}

export interface CallCreateInput {
    description: string;
    user_id: number;
    status?: 'open' | 'in_service' | 'completed' | 'canceled';
}

export interface CallUpdateInput {
    description?: string;
    status?: 'open' | 'in_service' | 'completed' | 'canceled';
} 