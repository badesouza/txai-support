declare module 'sweetalert2' {
    interface SweetAlertOptions {
        title?: string;
        text?: string;
        icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
        showCancelButton?: boolean;
        confirmButtonColor?: string;
        cancelButtonColor?: string;
        confirmButtonText?: string;
        cancelButtonText?: string;
    }

    interface SweetAlertResult {
        isConfirmed: boolean;
        isDismissed: boolean;
        isDenied: boolean;
    }

    const Swal: {
        fire: (options: SweetAlertOptions) => Promise<SweetAlertResult>;
    };

    export default Swal;
} 