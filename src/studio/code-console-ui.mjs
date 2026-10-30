import {generateCode} from '../generated-code.mjs';
import {generateApi3ProgramSource} from '../generated-program-source.mjs';
import {createDiagnosticConsole} from '../diagnostic-console.mjs';
import {explainDiagnostic} from './presentation-text.mjs';
import {languageAvailability, tablesForLocks} from '../contracts/language-table.mjs';
import {languageTables} from '../packs/language-tables.mjs';

// Presentation only: neither this listing nor the log enters project authoring.
// listingOwner: the object the listing shows (scene2d-multi-sprite 3.2), as a
// text owner with its visible name; null in a single-workspace profile.
// authoringKey: what counts as a change of authoring (the whole scene: choosing
// an object is not one). Both are read only while they can answer.
export function createCodeConsoleUI(editor, {selectSourceLocation = () => false, selectSourceBlock = (id) => editor.selectSource(id), createTextCopy = null, projectCopy = null, listingOwner = () => null, authoringKey = () => JSON.stringify(editor.save())} = {}) {
  const log = createDiagnosticConsole();
  const code = document.querySelector('#generated-code');
  const codeStatus = document.querySelector('#generated-status');
  const languagePicker = document.querySelector('#generated-language');
  const copyJavascript = document.querySelector('#copy-javascript');
  const copyPython = document.querySelector('#copy-python');
  const copyStatus = document.querySelector('#copy-status');
  const entries = document.querySelector('#console-entries');
  const summary = document.querySelector('#console-summary');
  const selection = document.querySelector('#console-selection');
  let listing = null;
  let lastFailure = null;
  let lastAuthoring = null;
  let copying = false;
  const levelNames = {info: 'Información', warning: 'Aviso', error: 'Error'};
  function render() {
    const active = document.activeElement;
    const focusKey = entries.contains(active) && active !== entries ? active.dataset.recordKey : null;
    const state = log.snapshot();
    summary.textContent = state.entries.length
      ? `${state.entries.length} ${state.entries.length === 1 ? 'mensaje' : 'mensajes'}${state.dropped ? ` · ${state.dropped} anteriores retirados` : ''}`
      : 'Sin mensajes';
    document.querySelector('#clear-console').disabled = state.entries.length === 0;
    const rows = state.entries.map((record, index) => {
      const row = document.createElement('li');
      row.dataset.level = record.level;
      // First level in plain Spanish; code, origin and original message remain available.
      const explained = explainDiagnostic(record);
      const title = document.createElement('p');
      title.className = 'diagnostic-title';
      title.textContent = explained?.title ?? `${levelNames[record.level]} · ${record.message}`;
      row.append(title);
      if (explained?.next) {
        const next = document.createElement('p');
        next.className = 'diagnostic-next';
        next.textContent = explained.next;
        row.append(next);
      }
      const detail = document.createElement('details');
      const summaryLine = document.createElement('summary');
      summaryLine.textContent = 'Detalle técnico';
      const metadata = document.createElement('p');
      metadata.textContent = `${levelNames[record.level]} · ${record.code} · ${record.origin}`;
      const message = document.createElement('p');
      message.textContent = record.message;
      detail.append(summaryLine, metadata, message);
      row.append(detail);
      if (record.sourceBlockId || record.sourceLocation) {
        const button = document.createElement('button');
        button.dataset.recordKey = String(state.dropped + index);
        button.textContent = record.sourceLocation ? `Ver línea ${record.sourceLocation.line}` : `Ver bloque ${record.sourceBlockId}`;
        button.disabled = record.sourceStale === true;
        button.addEventListener('click', () => {
          if (record.sourceLocation) {
            selection.textContent = selectSourceLocation({...record.sourceLocation})
              ? `Línea seleccionada: ${record.sourceLocation.line}`
              : 'El documento o la línea ya no está disponible. Vuelve a ejecutar la autoría actual.';
          } else {
            // Reaching a block of another object takes a moment, and can be refused.
            void Promise.resolve(selectSourceBlock(record.sourceBlockId, record)).then(result => {
              selection.textContent = result?.ok === false ? result.message : result ? `Bloque seleccionado: ${record.sourceBlockId}`
                : 'El bloque ya no está disponible. Vuelve a ejecutar la autoría actual.';
            });
          }
        });
        row.append(button);
        if (record.sourceStale) {
          const note = document.createElement('span');
          note.textContent = 'Autoría modificada. Vuelve a ejecutar para vincular el mensaje.';
          row.append(note);
        }
      }
      return row;
    });
    entries.replaceChildren(...rows);
    if (focusKey !== null) {
      const replacement = [...entries.querySelectorAll('button')].find(button => button.dataset.recordKey === focusKey);
      if (replacement && !replacement.disabled) replacement.focus({preventScroll: true});
      else entries.focus({preventScroll: true});
    }
  }
  function local(record) { const accepted = log.add(record); if (accepted) render(); return accepted; }
  // Languages the active 2D packs declare; an unavailable one names its pack.
  function availability() {
    return languageAvailability(tablesForLocks(editor.captureCapabilities?.()?.locks, languageTables), {lowering: 'ir'});
  }
  function generatedView(ir, owner) {
    const language = languagePicker.value, resourceView = editor.resourceView?.() ?? undefined;
    if (language === 'ir') return generateCode(ir, {resourceView, resourceOwnerId: owner?.targetId});
    if (!['javascript', 'python'].includes(language)) throw new Error('El lenguaje de lectura no está disponible.');
    const state = availability()[language];
    if (!state.available) throw Object.assign(new Error(state.reason), {unavailable: true});
    // Readable API v3 (ADR-011); the language origin translates it before running.
    return generateApi3ProgramSource(ir, language, {resourceView, ...(owner ? {owner} : {})});
  }
  function updateCopyControls() {
    const disabled = copying || !listing || typeof createTextCopy !== 'function';
    const languages = availability();
    copyJavascript.disabled = disabled || !languages.javascript.available;
    copyPython.disabled = disabled || !languages.python.available;
    const reasons = [languages.javascript.reason, languages.python.reason].filter(Boolean);
    if (reasons.length && !copying) copyStatus.textContent = reasons.join(' ');
  }
  function reportCopyError(error) {
    copyStatus.textContent = String(error?.message ?? error);
    local({level: 'error', code: 'TEXT_COPY_FAILED', origin: 'generation', message: copyStatus.textContent,
      ...(error?.sourceBlockId ? {sourceBlockId: error.sourceBlockId} : {})});
  }
  async function copy(language) {
    if (copying || typeof createTextCopy !== 'function') return;
    const state = availability()[language];
    if (!state.available) { reportCopyError(new Error(state.reason)); return; }
    copying = true;
    updateCopyControls();
    copyStatus.textContent = 'Creando copia independiente…';
    let generated;
    try {
      // Generate from current blocks, never from an old textarea or listing.
      // A project with several objects copies them all (scene2d-multi-sprite 2.2).
      generated = projectCopy?.(language) ?? generateApi3ProgramSource(editor.program(), language);
    } catch (error) {
      update();
      reportCopyError(error);
      copying = false;
      updateCopyControls();
      return;
    }
    try {
      await createTextCopy({language, source: generated.text, api: 'api3', variableIds: generated.variableIds, ...(generated.targetIds ? {targetIds: generated.targetIds} : {}),
        name: language === 'javascript' ? 'Copia JavaScript' : 'Copia Python'});
      copyStatus.textContent = `Copia ${language === 'javascript' ? 'JavaScript' : 'Python'} creada. Editarla no cambia tus bloques.`;
    } catch (error) { reportCopyError(error); }
    finally { copying = false; updateCopyControls(); }
  }
  function update() {
    const authoring = authoringKey();
    if (authoring !== lastAuthoring) {
      // Blockly authoring and text documents are independent sources.
      for (const origin of ['runner', 'generation', 'shell']) log.invalidateSources(origin);
      selection.textContent = '';
      lastAuthoring = authoring;
      copyStatus.textContent = '';
    }
    try {
      const owner = listingOwner();
      listing = generatedView(editor.program(), owner?.textOwner);
      code.value = listing.text;
      codeStatus.textContent = owner ? `Código de «${owner.name}» · actualizado desde tus bloques` : 'Actualizado desde tus bloques';
      lastFailure = null;
    } catch (error) {
      listing = null;
      code.value = '';
      codeStatus.textContent = 'No se pudo generar. Corrige los bloques y vuelve a intentar.';
      // An unavailable language is a stated limit, not an authoring error.
      if (error.unavailable) { codeStatus.textContent = error.message; updateCopyControls(); render(); return; }
      const fingerprint = `${authoring}:${error.sourceBlockId ?? ''}:${error.message}`;
      if (fingerprint !== lastFailure) {
        log.add({level: 'error', code: 'GENERATION_INVALID', origin: 'generation', message: error.message,
          ...(error.sourceBlockId ? {sourceBlockId: error.sourceBlockId} : {})});
        lastFailure = fingerprint;
      }
    }
    updateCopyControls();
    render();
  }
  languagePicker.addEventListener('change', update);
  copyJavascript.addEventListener('click', () => { void copy('javascript'); });
  copyPython.addEventListener('click', () => { void copy('python'); });
  document.querySelector('#clear-console').addEventListener('click', () => {
    log.clear(); selection.textContent = ''; render();
  });
  editor.subscribe(update);
  update();
  return Object.freeze({
    local,
    accept: (message, scope) => {
      const accepted = log.accept(message, scope);
      if (accepted) { if (!scope.sourcesCurrent) log.invalidateSources('runner'); render(); }
      return accepted;
    },
    reset: () => { log.reset(); selection.textContent = ''; render(); },
    invalidateSources: (origin = 'runner') => { log.invalidateSources(origin); render(); },
    invalidateTextSources: origin => {
      if (origin !== undefined && !['javascript', 'python'].includes(origin)) return false;
      for (const language of origin === undefined ? ['javascript', 'python'] : [origin]) log.invalidateSources(language);
      selection.textContent = '';
      render();
      return true;
    },
    snapshot: () => log.snapshot(),
    listing: () => structuredClone(listing)
  });
}
