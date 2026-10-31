// The portal creates projects itself, so PXT never starts one without an identity.
export function newProject(template, {name, id, headerId, now}) {
  const config = {...template.config, name, preferredEditor: 'blocksprj', ggProject: {id, v: 1}};
  return {
    header: {name, meta: {}, editor: 'blocksprj', pubId: '', pubCurrent: false, target: 'arcade', targetVersion: template.targetVersion, id: headerId, recentUse: now, modificationTime: now, path: name.replace(/[^a-z0-9]+/gi, '-'), cloudCurrent: false, saveId: null, githubCurrent: false},
    text: {...template.files, 'pxt.json': JSON.stringify(config, null, 4)}
  };
}

export function renameProject(project, name) {
  const config = project.text['pxt.json'];
  const text = config ? {...project.text, 'pxt.json': JSON.stringify({...JSON.parse(config), name}, null, 4)} : project.text;
  return {...project, header: {...project.header, name}, text};
}
