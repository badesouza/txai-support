export interface User {
    id: number;
    email: string;
    password: string;
    name: string;
    phone: string;
    profile: "admin" | "user";
    createdAt: Date;
    updatedAt: Date;
}

export interface Call {
    id: number;
    description: string;
    userId: number;
    status: 'open' | 'in_service' | 'completed' | 'canceled';
    createdAt: Date;
    updatedAt: Date;
}

export interface CallImage {
    id: number;
    callId: number;
    filename: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserToken {
    id: number;
    userId: number;
    token: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserCreateInput {
    email: string;
    password: string;
    name: string;
    phone: string;
    profile: "admin" | "user";
}

export interface CallCreateInput {
    description: string;
    userId: number;
    status?: 'open' | 'in_service' | 'completed' | 'canceled';
}

export interface CallUpdateInput {
    description?: string;
    status?: 'open' | 'in_service' | 'completed' | 'canceled';
} 