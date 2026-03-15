import type { ChangeEvent, FormEvent, RefObject } from 'react';
import InputMask from 'react-input-mask';

export interface UserFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  profile: 'USER' | 'ADMIN';
}

interface UserFormProps {
  title: string;
  formData: UserFormValues;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  nameInputRef?: RefObject<HTMLInputElement>;
  passwordRequired?: boolean;
  passwordLabel?: string;
  confirmPasswordLabel?: string;
}

const inputClassName =
  'appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white';

export default function UserForm({
  title,
  formData,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  nameInputRef,
  passwordRequired = true,
  passwordLabel = 'Senha',
  confirmPasswordLabel = 'Confirmar Senha',
}: UserFormProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={onChange}
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              required
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Telefone
            </label>
            <InputMask mask="(99) 99999-9999" value={formData.phone} onChange={onChange}>
              {(inputProps: any) => (
                <input
                  {...inputProps}
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  placeholder="(11) 98765-4321"
                  className={inputClassName}
                />
              )}
            </InputMask>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {passwordLabel}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={onChange}
              required={passwordRequired}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {confirmPasswordLabel}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={onChange}
              required={passwordRequired}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="profile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Perfil
            </label>
            <select
              id="profile"
              name="profile"
              value={formData.profile}
              onChange={onChange}
              required
              className={inputClassName}
            >
              <option value="USER">Usuário</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
