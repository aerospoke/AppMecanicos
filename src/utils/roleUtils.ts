/**
 * Utilidades para manejo de roles
 */

export type UserRole = 'cliente' | 'mecanico' | 'admin';

/**
 * Verifica si el usuario tiene el rol requerido
 */
export const hasRole = (userRole: UserRole | null, requiredRole: UserRole | UserRole[]): boolean => {
  if (!userRole) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  
  return userRole === requiredRole;
};

/**
 * Verifica si el usuario es admin
 */
export const isAdmin = (userRole: UserRole | null): boolean => {
  return userRole === 'admin';
};

/**
 * Verifica si el usuario es mecánico
 */
export const isMecanico = (userRole: UserRole | null): boolean => {
  return userRole === 'mecanico' || userRole === 'admin';
};

/**
 * Verifica si el usuario es cliente
 */
export const isCliente = (userRole: UserRole | null): boolean => {
  return userRole === 'cliente';
};

/**
 * Obtiene el nombre legible del rol
 */
export const getRoleName = (role: UserRole): string => {
  const roleNames = {
    cliente: 'Cliente',
    mecanico: 'Mecánico',
    admin: 'Administrador',
  };
  return roleNames[role] || 'Desconocido';
};

/**
 * Obtiene el emoji del rol
 */
export const getRoleEmoji = (role: UserRole): string => {
  const roleEmojis = {
    cliente: '👤',
    mecanico: '🔧',
    admin: '⚡',
  };
  return roleEmojis[role] || '❓';
};
