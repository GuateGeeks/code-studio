// Contexts an installation shows (pilot-2d-mode). Owned data only: no DOM.
// Hiding a context never removes its authoring; it only limits navigation.
export const deploymentContexts = Object.freeze(['2d', 'text', 'microbit', 'sb3', 'scene3d', 'webapp']);

export function validateDeploymentContexts(value) {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || !value.length || value.length > deploymentContexts.length ||
      value.some(id => !deploymentContexts.includes(id)) || new Set(value).size !== value.length || !value.includes('2d'))
    throw new Error('Perfil de despliegue inválido: usa contextos conocidos, sin repetir, e incluye 2d.');
  return deploymentContexts.filter(id => value.includes(id));
}

// `GG_CONTEXTS=2d,text`; empty or absent keeps every context.
export function parseDeploymentContexts(text) {
  if (text === undefined || text === null || !String(text).trim()) return null;
  return validateDeploymentContexts(String(text).split(',').map(id => id.trim()).filter(Boolean));
}
