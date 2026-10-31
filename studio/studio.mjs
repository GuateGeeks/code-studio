import {exportBackup, mergeRecords, parseBackup} from './backup.mjs';
import {createHost} from './host.mjs';
import {generateId, readId} from './identity.mjs';
import {findMission, missionFilter, watchMission} from './mission.mjs';
import {prepareOffline} from './offline.mjs';
import {newProject} from './project.mjs';
import {openStore} from './store.mjs';
import {addStudent} from './students.mjs';

const EDITOR_URL = 'editor.html?nosandbox=1&ws=iframe&editorlayout=ide';
const $ = id => document.getElementById(id);
let store;
let session = null;

function show(screen) {
  for (const id of ['students', 'projects', 'workspace']) $(id).hidden = id !== screen;
}

const alertUser = message => { $('alert').textContent = message; };

// Every action reports its failure: a silent button is the worst outcome for a student.
const guard = (action, message) => async (...args) => {
  alertUser('');
  try {
    return await action(...args);
  } catch {
    alertUser(message);
  }
};

function button(label, onClick, className) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (className) element.className = className;
  element.addEventListener('click', onClick);
  return element;
}

async function showStudents() {
  const names = await store.students();
  $('student-list').replaceChildren(...names.map(name => button(name, guard(() => showProjects(name), 'No pudimos abrir tus proyectos.'))));
  $('project-list').replaceChildren();
  $('student-name').value = '';
  show('students');
}

// Reads first and swaps in one step, so a student never sees another student's buttons.
async function showProjects(student) {
  const records = (await store.list(student)).filter(record => !record.project.header.isDeleted).sort((a, b) => b.at - a.at);
  $('projects-title').textContent = `Hola, ${student}`;
  $('project-list').replaceChildren(...records.map(record => button(record.project.header.name, () => openEditor(student, openHeader(record.project.header.id)), 'project')));
  $('student-backup').dataset.student = student;
  $('new-project').onclick = guard(() => createProject(student), 'No pudimos crear el proyecto. Avísale a tu docente.');
  $('start-mission').onclick = guard(() => startMission(student, 'atrapa-la-fruta'), 'No pudimos abrir la misión. Avísale a tu docente.');
  $('import-png').onchange = guard(event => importPng(student, event.target.files[0]), 'No pudimos abrir ese archivo.');
  show('projects');
}

async function loadTemplate() {
  const response = await fetch('project-template.json');
  if (!response.ok) throw new Error(`Plantilla: ${response.status}`);
  return response.json();
}

async function createProject(student) {
  const template = await loadTemplate();
  const count = (await store.list(student)).length + 1;
  const headerId = generateId().slice(3);
  const id = generateId();
  const project = newProject(template, {name: `Mi juego ${count}`, id, headerId, now: Math.floor(Date.now() / 1000)});
  await store.put({key: `${student}/${headerId}`, student, ggId: id, project, at: Date.now()});
  openEditor(student, openHeader(headerId));
}

async function startMission(student, id) {
  const response = await fetch(`missions/${id}.md`);
  if (!response.ok) throw new Error(`Misión: ${response.status}`);
  const markdown = await response.text();
  const title = markdown.match(/^# (.+)$/m)[1];
  const records = await store.list(student);
  const mission = findMission(records, title);
  if (mission) return openEditor(student, openHeader(mission.project.header.id));
  const adopt = missionFilter(title, new Set(records.map(record => record.project.header.id)));
  openEditor(student, null, () => post(session.frame, {id: 'mission', action: 'importtutorial', markdown, response: true}), {adopt});
  const answer = watchMission({onFailed: guard(async () => {
    closeEditor();
    await showProjects(student);
    alertUser('No pudimos abrir la misión. Avísale a tu docente.');
  }, 'No pudimos abrir la misión. Avísale a tu docente.')});
  session.settleMission = ok => {
    session.settleMission = null;
    answer(ok);
  };
}

function closeEditor() {
  session?.settleMission?.(true);
  $('editor').replaceChildren();
  session = null;
}

const post = (frame, message) => frame.contentWindow.postMessage({type: 'pxteditor', id: 'open', ...message}, '*');
const openHeader = headerId => ({action: 'openheader', headerId});

function openEditor(student, firstMessage, afterLoad, hostOptions) {
  show('workspace');
  $('workspace-title').textContent = student;
  $('save-warning').hidden = true;
  const frame = document.createElement('iframe');
  frame.id = 'editor-frame';
  frame.title = 'Editor';
  frame.src = EDITOR_URL;
  $('editor').replaceChildren(frame);
  const host = createHost({
    store, student, target: frame.contentWindow, ...hostOptions,
    onSaveError: () => { $('save-warning').hidden = false; },
    onSaved: () => { $('save-warning').hidden = true; },
    onLoaded: () => firstMessage && post(frame, firstMessage),
    onDeleted: guard(async () => { closeEditor(); await showProjects(student); }, 'No pudimos volver a tus proyectos.')
  });
  session = {student, frame, host, afterLoad, leaving: false};
}

async function importPng(student, file) {
  if (!file) return;
  const records = (await store.list(student)).filter(record => !record.project.header.isDeleted).sort((a, b) => b.at - a.at);
  const drop = () => {
    const data = new DataTransfer();
    data.items.add(file);
    session.frame.contentDocument.body.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: data}));
  };
  if (records.length) openEditor(student, openHeader(records[0].project.header.id), drop);
  else {
    await createProject(student);
    session.afterLoad = drop;
  }
}

async function leaveEditor() {
  if (!session || session.leaving) return;
  const current = session;
  // Nothing was saved yet, so there is nothing to wait for or warn about.
  if (current.settleMission) {
    closeEditor();
    return showStudents();
  }
  const label = $('change-student').textContent;
  current.leaving = true;
  $('change-student').disabled = true;
  $('change-student').textContent = 'Guardando…';
  const {ok} = await current.host.requestSave();
  $('change-student').disabled = false;
  $('change-student').textContent = label;
  current.leaving = false;
  if (session !== current) return;
  if (!ok) {
    $('save-warning').hidden = false;
    return;
  }
  closeEditor();
  await showStudents();
}

function download(records, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([exportBackup(records)], {type: 'application/json'}));
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function downloadCurrentWork() {
  const project = session?.host.latest();
  if (!project) return;
  download([{key: `${session.student}/${project.header.id}`, student: session.student, ggId: readId(project) ?? generateId(), project, at: Date.now()}], 'trabajo-sin-guardar');
}

async function restoreBackup(file) {
  $('class-status').textContent = 'Restaurando…';
  const parsed = parseBackup(await file.text());
  if (!parsed.ok) { $('class-status').textContent = parsed.reason; return; }
  const {records, skipped} = mergeRecords(await store.all(), parsed.records);
  await store.restore(records, [...new Set(parsed.records.map(record => record.student))]);
  await showStudents();
  $('class-status').textContent = `Restaurados: ${records.length}. Conservados por ser más recientes: ${skipped}.`;
}

addEventListener('message', event => {
  if (!session || event.source !== session.frame.contentWindow) return;
  if (event.data?.id === 'mission') return session.settleMission?.(event.data.success !== false);
  if (event.data?.action === 'editorcontentloaded' && session.afterLoad) {
    const run = session.afterLoad;
    session.afterLoad = null;
    return run();
  }
  session.host.handle(event);
});

function wireScreens() {
  $('student-form').addEventListener('submit', guard(async event => {
    event.preventDefault();
    const result = addStudent($('student-name').value, await store.students());
    $('student-error').textContent = result.ok ? '' : result.reason;
    if (!result.ok) return;
    await store.addStudent(result.name);
    await showStudents();
    await showProjects(result.name);
  }, 'No pudimos guardar tu nombre. Avísale a tu docente.'));
  $('change-student').addEventListener('click', leaveEditor);
  $('change-from-projects').addEventListener('click', guard(showStudents, 'No pudimos volver a la lista.'));
  $('save-retry').addEventListener('click', leaveEditor);
  $('save-download').addEventListener('click', downloadCurrentWork);
  $('save-leave').addEventListener('click', guard(async () => {
    if (!confirm('Si sales ahora perderás los últimos cambios. ¿Salir de todos modos?')) return;
    closeEditor();
    await showStudents();
  }, 'No pudimos volver a la lista.'));
  $('class-backup').addEventListener('click', guard(async () => download(await store.all(), 'copia-clase'), 'No pudimos crear la copia de la clase.'));
  $('class-restore').addEventListener('change', event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (file) restoreBackup(file).catch(() => { $('class-status').textContent = 'No se restauró nada: no hubo espacio o el archivo falló. Inténtalo de nuevo.'; });
  });
  $('student-backup').addEventListener('click', guard(async () => download(await store.list($('student-backup').dataset.student), 'copia-estudiante'), 'No pudimos crear tu copia.'));
}

try {
  store = await openStore();
  wireScreens();
  await showStudents();
  prepareOffline({status: $('offline-status'), update: $('update-studio'), storage: $('storage-status')});
} catch {
  $('students').hidden = true;
  alertUser('Este navegador no permite guardar proyectos. Avísale a tu docente.');
}
