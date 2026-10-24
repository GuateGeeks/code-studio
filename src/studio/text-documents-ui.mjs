import {createTextDocument, textDocumentLimits, validateTextDocuments} from '../text-documents.mjs';

// Text authoring stays independent of Blockly and of interpreter state.
export function createTextDocumentsUI({onError = () => {},canRun = () => true,onReveal = () => {}} = {}) {
  const picker = document.querySelector('#text-document');
  const name = document.querySelector('#text-name');
  const source = document.querySelector('#text-source');
  const javascript = document.querySelector('#new-javascript');
  const python = document.querySelector('#new-python');
  const run = document.querySelector('#run-document');
  const status = document.querySelector('#text-document-status');
  const errorOutput = document.querySelector('#text-error');
  const subscribers = new Set();
  // Only this factory can mint a rollback capability. Imported DTOs and JSON
  // copies cannot use this path to skip normal authoring validation.
  const checkpoints = new WeakMap();
  const starters = {
    javascript: "await GG.sprite.move('hero', 10);\nconsole.log(await GG.scene.get());\n",
    python: "await GG.sprite.move('hero', 10)\nprint(await GG.scene.get())\n"
  };
  let documents = null;
  let selectedId = null;
  let ready = false;
  let optionsKey = null;
  let lastError = null;
  let languageFilter = null;
  let presentationId;

  name.maxLength = textDocumentLimits.name;
  const currentId = () => presentationId === undefined ? selectedId : presentationId;
  const current = () => documents?.find(document => document.id === currentId()) ?? null;
  const displaySource = value => value.replace(/\r\n?/g, '\n');
  function clearError() { errorOutput.textContent = ''; lastError = null; }
  function report(error) {
    const message = String(error?.message ?? error);
    errorOutput.textContent = message;
    if (message !== lastError) {
      lastError = message;
      onError({level: 'error', code: 'TEXT_DOCUMENT', origin: 'shell', message});
    }
  }
  function notify() { for (const subscriber of subscribers) subscriber(); }
  function capture() {
    return documents === null ? null : structuredClone({textDocuments: documents, selectedTextDocumentId: selectedId});
  }
  function checkpoint() {
    const token = Object.freeze(Object.create(null));
    checkpoints.set(token, {
      authoring: structuredClone({documents, selectedId}), presentationId, languageFilter, error: errorOutput.textContent, lastError,
      nameSelection: [name.selectionStart, name.selectionEnd, name.selectionDirection],
      sourceSelection: [source.selectionStart, source.selectionEnd, source.selectionDirection],
      sourceScroll: [source.scrollTop, source.scrollLeft],
      focused: document.activeElement === source ? 'source' : document.activeElement === name ? 'name' : null
    });
    return token;
  }
  function restoreDraft(token) {
    const saved = checkpoints.get(token);
    if (!saved) throw new TypeError('El borrador de recuperación no pertenece a este editor.');
    // A draft can have an empty name or oversized source while it is being
    // edited. Revalidating it as a portable project would lose that work.
    ({documents, selectedId} = structuredClone(saved.authoring));
    presentationId = saved.presentationId; languageFilter = saved.languageFilter;
    render();
    errorOutput.textContent = saved.error; lastError = saved.lastError;
    if (saved.focused) (saved.focused === 'source' ? source : name).focus();
    name.setSelectionRange(...saved.nameSelection);
    source.setSelectionRange(...saved.sourceSelection);
    [source.scrollTop, source.scrollLeft] = saved.sourceScroll;
    notify();
  }
  function prepare(authoring) {
    if (!authoring || typeof authoring !== 'object' || Array.isArray(authoring)) {
      throw new TypeError('La autoría de documentos de texto no es válida.');
    }
    if (!Object.hasOwn(authoring, 'textDocuments') && !Object.hasOwn(authoring, 'selectedTextDocumentId')) {
      return {textDocuments: null, selectedTextDocumentId: null};
    }
    return validateTextDocuments(authoring.textDocuments, authoring.selectedTextDocumentId);
  }
  function render() {
    const entries = (documents ?? []).filter(document => !languageFilter || document.language === languageFilter);
    const selectedDocument = current();
    const nextKey = JSON.stringify(entries.map(({id, name, language}) => [id, name, language]));
    if (nextKey !== optionsKey) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = entries.length ? 'Selecciona un documento' : 'Sin documentos';
      const options = entries.map(entry => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = `${entry.name} · ${entry.language === 'javascript' ? 'JavaScript' : 'Python'}`;
        return option;
      });
      picker.replaceChildren(placeholder, ...options);
      optionsKey = nextKey;
    }
    picker.value = currentId() ?? '';
    // Avoid resetting the selection/caret on ordinary input or name edits.
    const nextName = selectedDocument?.name ?? '';
    const nextSource = displaySource(selectedDocument?.source ?? '');
    if (name.value !== nextName) name.value = nextName;
    if (source.value !== nextSource) source.value = nextSource;
    picker.disabled = !ready || entries.length === 0;
    name.disabled = source.disabled = !ready || !selectedDocument;
    run.disabled = !ready || !selectedDocument || !canRun();
    javascript.disabled = python.disabled = !ready || (documents?.length ?? 0) >= textDocumentLimits.documents;
    status.textContent = !ready ? 'Preparando documentos…'
      : selectedDocument ? `${entries.length} de ${textDocumentLimits.documents} documentos · ${selectedDocument.language === 'javascript' ? 'JavaScript' : 'Python'} · ${selectedDocument.runtime.engine} ${selectedDocument.runtime.version}`
      : entries.length ? 'Selecciona un documento para editarlo o ejecutarlo.'
      : 'Sin documentos de texto. Crea un documento JavaScript o Python para comenzar.';
  }
  function commit(candidate) {
    // Validate and detach before replacing the live authoring.
    const next = candidate?.textDocuments === null && candidate.selectedTextDocumentId === null
      ? {textDocuments: null, selectedTextDocumentId: null}
      : validateTextDocuments(candidate?.textDocuments, candidate?.selectedTextDocumentId);
    documents = next.textDocuments;
    selectedId = next.selectedTextDocumentId;
    clearError();
    render();
    notify();
  }
  function add({language, name: documentName, source: documentSource, api, variableIds}) {
    if (!ready) throw new Error('Espera a que termine la recuperación del proyecto antes de crear un documento.');
    if ((documents?.length ?? 0) >= textDocumentLimits.documents) throw new Error('El proyecto admite hasta 8 documentos de texto.');
    const document = createTextDocument({language, name: documentName, source: documentSource, api, variableIds});
    // commit validates the entire candidate before changing the live documents.
    commit({textDocuments: [...(documents ?? []), document], selectedTextDocumentId: document.id});
    source.focus();
    return structuredClone(document);
  }
  function create(language) {
    if (!ready || (documents?.length ?? 0) >= textDocumentLimits.documents) return;
    try { onReveal(); add({language, source: starters[language]}); }
    catch (error) { report(error); }
  }
  function edit(field, value) {
    const document = current();
    if (!ready || !document || document[field] === value) return;
    document[field] = value;
    render();
    // Keep incomplete drafts editable; persistence validates before saving.
    try { validateTextDocuments(documents, selectedId); clearError(); }
    catch (error) { report(error); }
    notify();
  }
  function selectSourceLocation(location) {
    if (!ready || !location || typeof location !== 'object' ||
        typeof location.documentId !== 'string' || !Number.isSafeInteger(location.line) || location.line < 1 ||
        (location.column !== undefined && (!Number.isSafeInteger(location.column) || location.column < 1))) return false;
    const document = documents?.find(entry => entry.id === location.documentId);
    if (!document) return false;
    const lines = displaySource(document.source).split('\n');
    if (location.line > lines.length) return false;
    const line = lines[location.line - 1];
    if (location.column !== undefined && location.column > line.length + 1) return false;
    let start = 0;
    for (let index = 0; index < location.line - 1; index++) start += lines[index].length + 1;
    onReveal(document.id);
    const changed = currentId() !== document.id;
    if(presentationId === undefined)selectedId = document.id;
    else presentationId = document.id;
    render();
    source.focus();
    source.setSelectionRange(start + (location.column === undefined ? 0 : location.column - 1),
      location.column === undefined ? start + line.length : start + location.column - 1);
    if (changed) notify();
    return true;
  }

  javascript.addEventListener('click', () => create('javascript'));
  python.addEventListener('click', () => create('python'));
  picker.addEventListener('change', () => {
    if (!ready) return;
    const next = picker.value || null;
    if (next !== null && !documents?.some(document => document.id === next)) { render(); return; }
    if (next === currentId()) return;
    if(presentationId === undefined)selectedId = next;
    else presentationId = next;
    clearError();
    render();
    notify();
  });
  name.addEventListener('input', () => edit('name', name.value));
  source.addEventListener('input', () => edit('source', source.value));
  render();
  return Object.freeze({
    capture, prepare, commit, add, checkpoint, restoreDraft,
    subscribe: callback => {
      if (typeof callback !== 'function') throw new TypeError('El observador de documentos debe ser una función.');
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    selected: () => structuredClone(current()),refresh:render,
    // Context navigation projects a selection without changing portable authoring.
    present({documentId,language=null}={}) { presentationId=documentId; languageFilter=language; render(); },
    selectSourceLocation,
    setReady: value => { ready = Boolean(value); render(); }
  });
}
