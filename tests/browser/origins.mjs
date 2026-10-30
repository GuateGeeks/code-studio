import {browserConfiguration} from '../../tools/build/browser-policy.mjs';

// Desplazamientos de los servidores propios sobre el puerto shell de la base.
const slotOffsets = {offline: 50, pilot: 60, standalone: 70};
// Desplazamientos de cada rol dentro de un bloque.
const roleOffsets = {SHELL: 0, RUNNER: 1, SIMULATOR: 2, LANGUAGE: 3, SCENE3D: 8, WEBAPP: 9};

export function configuredOrigins(env = process.env) {
  const {origins, ports} = browserConfiguration(env);
  return {origins, ports};
}

export const {origins, ports} = configuredOrigins(process.env);

export function auxiliaryServer(slot, env = process.env) {
  if (!Object.hasOwn(slotOffsets, slot)) throw new Error(`Unknown auxiliary server slot: ${slot}`);
  const shell = configuredOrigins(env).ports.shell + slotOffsets[slot];
  const serverEnv = Object.fromEntries(Object.entries(roleOffsets).map(([role, offset]) => [`GG_${role}_PORT`, String(shell + offset)]));
  const auxiliary = configuredOrigins(serverEnv);
  return {env: serverEnv, origin: auxiliary.origins.shellOrigin, ports: auxiliary.ports};
}
