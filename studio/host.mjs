import {generateId, resolveIdentity, stampIdentity} from './identity.mjs';

// One host per editor iframe: its student stays fixed even if the portal moves on.
export function createHost({store, student, target, onSaveError = () => {}, onLoaded = () => {}, newId = generateId}) {
  const reply = (message, extra) => target.postMessage({...message, success: true, ...extra}, '*');
  let saves = Promise.resolve();

  async function save(project) {
    const key = `${student}/${project.header.id}`;
    const records = await store.list(student);
    const known = new Map(records.map(record => [record.ggId, record.project.header.id]));
    const {id, derivedFrom} = resolveIdentity(records.find(record => record.key === key)?.project ?? project, known, newId);
    await store.put({key, student, ggId: id, project: stampIdentity(project, id, derivedFrom), at: Date.now()});
  }

  async function handle({source, data}) {
    if (source !== target || data?.type !== 'pxthost') return;
    switch (data.action) {
      case 'workspacesync': {
        const records = await store.list(student);
        return reply(data, {projects: records.map(record => record.project), editor: {}, controllerId: 'gg'});
      }
      case 'workspaceloaded':
        reply(data);
        return onLoaded();
      case 'workspacesave':
        saves = saves.then(() => save(data.project)).catch(onSaveError);
        return saves;
      default:
        if (data.response) reply(data);
    }
  }

  return {handle, flushed: () => saves};
}
