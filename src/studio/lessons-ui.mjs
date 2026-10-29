import {getLesson, lessonCatalog, lessonSteps, lessonKey} from '../lessons.mjs';
import {createLessonController} from './lesson-controller.mjs';

// Native controls and plain text only. Loading, reading and project identity
// come from the shell; this view never reaches into an editor or interpreter.
export function createLessonsUI(options) {
  const controls = Object.fromEntries(['select', 'title', 'introduction', 'steps', 'load', 'check', 'status', 'progress', 'error',
    'learning', 'objective', 'prerequisites', 'prediction', 'reflection', 'main', 'variant', 'route-title']
    .map(name => [name, document.querySelector(`#lesson-${name}`)]));
  if (Object.values(controls).some(element => !element)) throw new Error('Faltan controles de actividades en la página.');
  let ready = false; let renderedLesson = null;
  const results = new Map();
  const revealedHints = new Map();
  const externalChange = options?.onChange ?? (() => {});
  function render(state) {
    const lesson = getLesson(state.selectedLessonId);
    const steps = lessonSteps(lesson, state.mode);
    const route = state.mode === 'variant' ? lesson.learning.variant : lesson.learning;
    controls.select.value = state.selectedLessonId;
    const renderKey = `${state.selectedLessonId}:${state.mode}`;
    if (renderedLesson !== renderKey) {
      renderedLesson = renderKey; results.clear();
      controls.title.textContent = lesson.title;
      controls.introduction.textContent = lesson.introduction;
      controls.learning.hidden = !lesson.learning;
      controls.variant.hidden = !lesson.learning;
      controls.objective.textContent = lesson.learning?.objective ?? '';
      controls.prerequisites.replaceChildren(...(lesson.learning?.prerequisites ?? []).map(text => {
        const item = document.createElement('li'); item.textContent = text; return item;
      }));
      controls.prediction.textContent = route?.prediction ?? '';
      controls.reflection.textContent = route?.reflection ?? '';
      controls['route-title'].textContent = state.mode === 'variant' ? 'Reto variante' : 'Recorrido principal';
      const rows = steps.map(step => {
        const row = document.createElement('li'); row.dataset.stepId = step.id;
        const heading = document.createElement('h4'); heading.textContent = step.title;
        const instructions = document.createElement('p'); instructions.textContent = step.instructions;
        const result = document.createElement('p'); result.className = 'lesson-check-result'; result.textContent = 'Sin comprobar.';
        row.append(heading, instructions, result); results.set(step.id, result);
        if (step.hints.length) {
          const key = `${renderKey}:${step.id}`;
          const button = document.createElement('button'); button.type = 'button'; button.className = 'lesson-hint';
          const hints = document.createElement('ol'); hints.className = 'lesson-hints';
          hints.id = `lesson-hints-${step.id}`; button.setAttribute('aria-controls', hints.id);
          const count = document.createElement('output'); count.setAttribute('aria-live', 'polite');
          function showHints() {
            const shown = revealedHints.get(key) ?? 0;
            while (hints.children.length < shown) {
              const hint = document.createElement('li'); hint.textContent = step.hints[hints.children.length]; hints.append(hint);
            }
            hints.hidden = shown === 0;
            button.textContent = shown === 0 ? 'Mostrar primera pista' : shown < step.hints.length ? 'Siguiente pista' : 'Todas las pistas visibles';
            button.setAttribute('aria-label', `${button.textContent}: ${step.title}`);
            button.setAttribute('aria-disabled', String(shown === step.hints.length));
            count.textContent = `${shown} de ${step.hints.length} pistas visibles.`;
          }
          button.addEventListener('click', () => {
            revealedHints.set(key, Math.min((revealedHints.get(key) ?? 0) + 1, step.hints.length)); showHints();
          });
          showHints(); row.append(button, count, hints);
        }
        return row;
      });
      controls.steps.replaceChildren(...rows);
    }
    for (const step of steps) {
      const result = state.results.find(item => item.id === step.id);
      results.get(step.id).textContent = result ? `${result.passed ? 'Comprobado.' : 'Aún falta.'} ${result.checks.map(check => check.message).join(' ')}` : 'Sin comprobar.';
    }
    const busy = state.phase === 'loading' || state.phase === 'checking';
    controls.steps.setAttribute('aria-busy', String(busy));
    controls.select.disabled = !ready || state.phase === 'loading';
    for (const mode of ['main', 'variant']) {
      controls[mode].disabled = !ready || state.phase === 'loading';
      controls[mode].setAttribute('aria-pressed', String(state.mode === mode));
    }
    controls.load.disabled = controls.check.disabled = !ready || busy;
    controls.load.textContent = 'Cargar ejemplo y reemplazar el proyecto actual';
    controls.check.textContent = state.phase === 'checking' ? 'Comprobando…' : 'Comprobar';
    controls.status.textContent = state.message;
    controls.error.textContent = state.phase === 'error' ? state.message : '';
    const historical = state.historicalStepIds.filter(id => steps.some(step => step.id === id)).length;
    controls.progress.textContent = historical
      ? `Historial: ${historical} de ${steps.length} pasos completados${state.mode === 'variant' ? ' del reto variante' : ''}. Este historial no verifica los cambios actuales.`
      : 'El progreso de las actividades se guarda aparte del proyecto.';
    for (const earlier of state.earlierProgress ?? [])
      controls.progress.textContent += ` Revisión anterior ${earlier.revision}: ${earlier.completed} de ${earlier.total} pasos completados; se conserva.`;
    if (state.progressWarning) controls.progress.textContent += ` ${state.progressWarning}`;
    externalChange(state);
  }
  const controller = createLessonController({...options, onChange: render});
  const choices = lessonCatalog.map(lesson => {
    const option = document.createElement('option'); option.value = lessonKey(lesson);
    option.textContent = option.value === lesson.id ? lesson.title : `${lesson.title} · revisión anterior ${lesson.revision}`;
    return option;
  });
  controls.select.replaceChildren(...choices);
  function failed(error) {
    controls.error.textContent = String(error?.message ?? error);
    options?.onError?.({level: 'error', code: 'LESSON_ERROR', origin: 'shell', message: controls.error.textContent});
  }
  const selected = () => controller.select(controls.select.value);
  const loaded = () => { void controller.loadSelected().catch(failed); };
  const checked = () => { void controller.check().catch(failed); };
  const main = () => controller.selectMode('main');
  const variant = () => controller.selectMode('variant');
  controls.select.addEventListener('change', selected);
  controls.load.addEventListener('click', loaded);
  controls.check.addEventListener('click', checked);
  controls.main.addEventListener('click', main); controls.variant.addEventListener('click', variant);
  render(controller.state());
  return Object.freeze({
    state: controller.state, invalidate: controller.invalidate, select: controller.select,
    check: controller.check, loadSelected: controller.loadSelected, selectMode: controller.selectMode,
    setReady(value) { ready = Boolean(value); render(controller.state()); if (ready) void controller.refreshProgress(); },
    dispose() {
      controls.select.removeEventListener('change', selected); controls.load.removeEventListener('click', loaded); controls.check.removeEventListener('click', checked);
      controls.main.removeEventListener('click', main); controls.variant.removeEventListener('click', variant);
      controller.dispose();
    }
  });
}
