// Presentation only: project recovery, replacement and persistence remain owned
// by the project controller. No authoring copy or navigation storage lives here.
export function createEntryJourneyUI({project, startCreation, select2D}) {
  const pick = id => document.getElementById(id);
  const title = pick('entry-heading'), description = pick('entry-description');
  const create = pick('entry-create'), resume = pick('entry-continue');
  const activities = pick('entry-activities'), open = pick('entry-open');
  const error = pick('entry-error');
  let busy = false;
  function focus(id) { const target = pick(id); target.focus({preventScroll:true}); target.scrollIntoView({block:'nearest'}); }
  function render(state) {
    const recovered = ['recovered', 'restored', 'opened'].includes(state.recoveryStatus);
    resume.hidden = !recovered;
    pick('entry-journey').dataset.resumable = String(recovered);
    resume.textContent = 'Continuar mi proyecto';
    title.textContent = recovered ? 'Continúa con tu idea' : 'Crea, prueba y descubre';
    description.textContent = {
      pending:'Buscando tu proyecto en este navegador…',
      new:'Empieza con una escena 2D o elige una actividad con tu docente.',
      recovered:`Tu proyecto «${state.name}» está listo para continuar. Tú decides cuándo ejecutarlo.`,
      restored:`Recuperamos una revisión anterior de «${state.name}». Revisa el aviso de recuperación.`,
      opened:`Estás trabajando en «${state.name}». Puedes continuar o explorar una actividad.`,
      corrupt:'Revisa el aviso de recuperación y descarga tu trabajo antes de elegir una copia nueva.',
      unavailable:'El guardado local no está disponible. Puedes editar y descargar tu proyecto.',
      error:'No se completó la recuperación. Revisa el aviso del proyecto antes de continuar.'
    }[state.recoveryStatus];
    create.disabled = busy || !state.ready || !state.available || state.recoveryBlocked;
    resume.disabled = open.disabled = busy || !state.ready || !state.available;
    activities.disabled = busy || !state.ready;
    create.textContent = busy ? 'Preparando tu escena…' : 'Crear mi primera escena';
    pick('entry-journey').setAttribute('aria-busy', String(busy || !state.ready));
  }
  const unsubscribe = project.subscribe(render);
  function enterEditor() { pick('entry-panel').open=false; focus('editor-heading'); }
  resume.addEventListener('click', enterEditor);
  activities.addEventListener('click', () => {
    pick('lessons-panel').open = true;
    document.dispatchEvent(new CustomEvent('gg-reveal', {detail: {element: pick('lesson-select')}}));
  });
  // The header toggle and the panel describe one disclosure state.
  const panel = pick('entry-panel'), toggle = pick('entry-toggle');
  const syncToggle = () => toggle.setAttribute('aria-expanded', String(panel.open));
  panel.addEventListener('toggle', syncToggle);
  toggle.addEventListener('click', () => {
    panel.open = !panel.open; syncToggle();
    if (panel.open) panel.querySelector(':scope > summary').focus();
  });
  syncToggle();
  // Running or stopping means the learner has entered: the start band closes
  // after that single action. Clicks while editing never close it, so a
  // double-click on a block field is not moved under the pointer.
  document.querySelector('.transport-bar').addEventListener('click', event => { if (panel.open && event.target.closest('button')) { panel.open = false; syncToggle(); } });
  document.querySelector('#authoring-context').addEventListener('change', () => { if (panel.open) { panel.open = false; syncToggle(); } });
  open.addEventListener('click', () => pick('open-project').click());
  create.addEventListener('click', async () => {
    if (busy) return;
    busy = true; error.textContent = ''; render(project.state());
    try {
      await startCreation();
      select2D();
      enterEditor();
    } catch (failure) { error.textContent = `No se pudo completar la preparación. ${failure.message}`; }
    finally { busy = false; render(project.state()); }
  });
  const advanced = pick('advanced-tools');
  advanced.addEventListener('toggle', () => {
    if (!advanced.open && advanced.contains(document.activeElement)) advanced.querySelector('summary').focus();
  });
  return Object.freeze({dispose:unsubscribe});
}
