/**
 * Utilitário para formatação de números de telefone
 */

/**
 * Formata número de telefone para exibição: (99) 99999-9999
 * Adiciona o 9 quando necessário para números móveis
 */
export const formatPhoneForDisplay = (phone: string): string => {
  // Se já está formatado corretamente, retorna como está
  if (phone.includes('(') && phone.includes(')') && phone.includes('-')) {
    return phone;
  }
  
  // Remove todos os caracteres não numéricos
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Se tem 12 dígitos (55 + 10 dígitos), formata como (99) 99999-9999
  if (digitsOnly.length === 12 && digitsOnly.startsWith('55')) {
    return `(${digitsOnly.slice(2, 4)}) ${digitsOnly.slice(4, 9)}-${digitsOnly.slice(9)}`;
  }
  
  // Se tem 11 dígitos (55 + 9 dígitos), formata como (99) 99999-9999
  if (digitsOnly.length === 11 && digitsOnly.startsWith('55')) {
    return `(${digitsOnly.slice(2, 4)}) ${digitsOnly.slice(4, 9)}-${digitsOnly.slice(9)}`;
  }
  
  // Se tem 10 dígitos (55 + 8 dígitos), formata como (99) 9999-9999
  if (digitsOnly.length === 10 && digitsOnly.startsWith('55')) {
    return `(${digitsOnly.slice(2, 4)}) ${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8)}`;
  }
  
  // Se não conseguir formatar, retorna o original
  return phone;
};
