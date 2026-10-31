import {createHost} from './host.mjs';
import {generateId} from './identity.mjs';
import {newProject} from './project.mjs';
import {openStore} from './store.mjs';
import {addStudent} from './students.mjs';

const EDITOR_URL = 'editor.html?nosandbox=1&ws=iframe&editorlayout=ide';
const SAVE_TIMEOUT = 3000;
const $ = id => document.getElementById(id);
const store = await openStore();
let session = null;

function show(screen) {
  for (const id of ['students', 'projects', 'workspace']) $(id).hidden = id !== screen;
}

function button(label, onClick, className) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (className) element.className = className;
  element.addEventListener('click', onClick);
  return element;
}

async function showStudents() {
  show('students');
  const names = await store.students();
  $('student-list').replaceChildren(...names.map(name => button(name, () => showProjects(name))));
  $('student-name').value = '';
}

async function showProjects(student) {
  show('projects');
  $('projects-title').textContent = `Hola, ${student}`;
  const records = (await store.list(student)).filter(record => !record.project.header.isDeleted).sort((a, b) => b.at - a.at);
  $('project-list').replaceChildren(...records.map(record => button(record.project.header.name, () => openEditor(student, record.project.header.id), 'project')));
  $('new-project').onclick = () => createProject(student);
  $('import-png').onchange = event => importPng(student, event.target.files[0]);
  $('change-from-projects').onclick = showStudents;
}

async function createProject(student) {
  const count = (await store.list(student)).length + 1;
  const template = await fetch('project-template.json').then(response => response.json());
  const headerId = generateId().slice(3);
  const id = generateId();
  const project = newProject(template, {name: `Mi juego ${count}`, id, headerId, now: Math.floor(Date.now() / 1000)});
  await store.put({key: `${student}/${headerId}`, student, ggId: id, project, at: Date.now()});
  openEditor(student, headerId);
}

function openEditor(student, headerId, afterLoad) {
  show('workspace');
  $('workspace-title').textContent = student;
  $('save-warning').hidden = true;
  const frame = document.createElement('iframe');
  frame.id = 'editor-frame';
  frame.title = 'Editor';
  frame.src = EDITOR_URL;
  $('editor').replaceChildren(frame);
  const host = createHost({
    store, student, target: frame.contentWindow,
    onSaveError: () => { $('save-warning').hidden = false; },
    onLoaded: () => frame.contentWindow.postMessage({type: 'pxteditor', id: 'open', action: 'openheader', headerId}, '*')
  });
  session = {student, frame, host, afterLoad, pending: null};
}

async function importPng(student, file) {
  if (!file) return;
  const records = (await store.list(student)).sort((a, b) => b.at - a.at);
  const drop = () => {
    const data = new DataTransfer();
    data.items.add(file);
    session.frame.contentDocument.body.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: data}));
  };
  if (records.length) openEditor(student, records[0].project.header.id, drop);
  else {
    await createProject(student);
    session.afterLoad = drop;
  }
}

// Ask the editor to save, so a student who leaves right after typing keeps the change.
function saveNow({frame, host}) {
  return new Promise(resolve => {
    const id = generateId();
    const timer = setTimeout(resolve, SAVE_TIMEOUT);
    session.pending = {id, finish: () => { clearTimeout(timer); resolve(); }};
    frame.contentWindow.postMessage({type: 'pxteditor', id, action: 'saveproject', response: true}, '*');
  }).then(() => host.flushed());
}

async function leaveEditor() {
  const {student} = session;
  await saveNow(session);
  $('editor').replaceChildren();
  session = null;
  await showProjects(student);
  await showStudents();
}

addEventListener('message', event => {
  if (!session || event.source !== session.frame.contentWindow) return;
  const {data} = event;
  if (data?.type === 'pxteditor' && data.id === session.pending?.id) return session.pending.finish();
  if (data?.action === 'editorcontentloaded' && session.afterLoad) {
    const run = session.afterLoad;
    session.afterLoad = null;
    return run();
  }
  session.host.handle(event);
});

$('student-form').addEventListener('submit', async event => {
  event.preventDefault();
  const result = addStudent($('student-name').value, await store.students());
  $('student-error').textContent = result.ok ? '' : result.reason;
  if (!result.ok) return;
  await store.addStudent(result.name);
  await showStudents();
  await showProjects(result.name);
});
$('change-student').addEventListener('click', leaveEditor);

await showStudents();
