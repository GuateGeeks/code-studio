import {generateId, readDerivedFrom, resolveIdentity, stampIdentity} from './identity.mjs';

const SAVE_TIMEOUT = 8000;

// One host per editor iframe: its student stays fixed even if the portal moves on.
export function createHost({store, student, target, onSaveError = () => {}, onSaved = () => {}, onLoaded = () => {}, onDeleted = () => {}, newId = generateId, saveTimeout = SAVE_TIMEOUT}) {
  const reply = (message, extra) => target.postMessage({...message, success: true, ...extra}, '*');
  let saves = Promise.resolve();
  let failed = false;
  let latest = null;
  let pending = null;

  async function save(project) {
    const key = `${student}/${project.header.id}`;
    const records = await store.all();
    const own = records.find(record => record.key === key);
    if (project.header.isDeleted) {
      if (own) await store.put({...own, project: {...own.project, header: project.header}, at: Date.now()});
      return onDeleted();
    }
    // PXT sends only the changed files on some saves.
    const merged = {...project, text: {...own?.project.text, ...project.text}};
    const known = new Map(records.map(record => [record.ggId, record.project.header.id]));
    const source = own?.project ?? merged;
    const {id, derivedFrom} = resolveIdentity(source, known, newId);
    latest = merged;
    await store.put({key, student, ggId: id, project: stampIdentity(merged, id, derivedFrom ?? readDerivedFrom(source)), at: Date.now()});
  }

  function enqueue(project) {
    saves = saves.then(() => save(project)).then(() => { failed = false; onSaved(); }, error => { failed = true; onSaveError(error); });
    return saves;
  }

  const flushed = () => saves.then(() => ({ok: !failed}));

  async function requestSave() {
    const answered = await new Promise(resolve => {
      const id = generateId();
      const timer = setTimeout(() => resolve(false), saveTimeout);
      pending = {id, finish: ok => { clearTimeout(timer); resolve(ok); }};
      target.postMessage({type: 'pxteditor', id, action: 'saveproject', response: true}, '*');
    });
    pending = null;
    const {ok} = await flushed();
    return {ok: ok && answered};
  }

  async function handle({source, data}) {
    if (source !== target) return;
    if (data?.id && data.id === pending?.id) return pending.finish(data.success !== false);
    if (data?.type !== 'pxthost') return;
    switch (data.action) {
      case 'workspacesync': {
        const records = await store.list(student);
        return reply(data, {projects: records.map(record => record.project), editor: {}, controllerId: 'gg'});
      }
      case 'workspaceloaded':
        reply(data);
        return onLoaded();
      case 'workspacesave':
        latest = data.project;
        return enqueue(data.project);
      default:
        if (data.response) reply(data);
    }
  }

  return {handle, flushed, requestSave, latest: () => latest};
}
