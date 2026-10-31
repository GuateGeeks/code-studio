const MAX_NAME = 40;

export function addStudent(raw, existing) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return {ok: false, reason: 'Escribe tu nombre para entrar.'};
  if (name.length > MAX_NAME) return {ok: false, reason: `Usa un nombre de hasta ${MAX_NAME} letras.`};
  const known = existing.find(student => student.toLowerCase() === name.toLowerCase());
  return {ok: true, name: known ?? name};
}
