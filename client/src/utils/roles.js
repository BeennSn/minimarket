/**
 * roles.js
 * 'SuperAdmin' siempre satisface cualquier lista de roles permitidos que
 * incluya 'Administrador' (tiene todo el acceso de Administrador, más la
 * gestión exclusiva de usuarios). Debe reflejar la misma regla que
 * verificarRol() en server/middlewares/auth.middleware.js.
 */
export const rolSatisface = (rolUsuario, rolesPermitidos) => {
  if (!rolesPermitidos) return true;
  return rolesPermitidos.includes(rolUsuario) || (rolUsuario === 'SuperAdmin' && rolesPermitidos.includes('Administrador'));
};
