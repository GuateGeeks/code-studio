const CONFIG = 'pxt.json';

export function readId(project) {
  try {
    return JSON.parse(project.text[CONFIG]).ggProject?.id ?? null;
  } catch {
    return null;
  }
}

export function readDerivedFrom(project) {
  try {
    return JSON.parse(project.text[CONFIG]).ggProject?.derivedFrom;
  } catch {
    return undefined;
  }
}

// The mark of a copy made from an experience: the copy is found by it, never by its name.
export function readExperiencia(project) {
  try {
    return JSON.parse(project.text[CONFIG]).ggProject?.experiencia;
  } catch {
    return undefined;
  }
}

export function stampIdentity(project, id, derivedFrom, experiencia) {
  const config = JSON.parse(project.text[CONFIG]);
  config.ggProject = {id, v: 1, ...(derivedFrom ? {derivedFrom} : {}), ...(experiencia ? {experiencia} : {})};
  return {...project, text: {...project.text, [CONFIG]: JSON.stringify(config, null, 4)}};
}

// PXT assigns a new header on import, so a known ID on another header is a copy.
export function resolveIdentity(project, knownIds, newId) {
  const id = readId(project);
  if (!id) return {id: newId()};
  const owner = knownIds.get(id);
  return owner && owner !== project.header.id ? {id: newId(), derivedFrom: id} : {id};
}

export function generateId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `gg-${[...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
