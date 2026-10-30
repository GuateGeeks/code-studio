import {validateLesson, lessonSteps} from './lessons.mjs';
import {validateProgram} from './contracts/program-contract.mjs';
import {validateSceneSnapshot} from './scene-inspection.mjs';

export function validateLessonVariable(value, expectedId) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 3 || !['id', 'name', 'value'].every(key => Object.hasOwn(value, key)) ||
      value.id !== expectedId || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 128 ||
      typeof value.value !== 'number' || !Number.isFinite(value.value) || Math.abs(value.value) > 1e6) throw new Error('La lectura de puntuación no es válida.');
  return {id: value.id, name: value.name, value: value.value};
}
function operationPresent(body, check) {
  return body.some(node => (node.kind === check.operation && (check.operation === 'move' ? node.steps === check.steps : node.costume === check.costume)) ||
    operationPresent(node.body ?? [], check) || operationPresent(node.elseBody ?? [], check));
}
// An authored check reads the scripts of its object: IR 2D v1 of a whole scene, or
// IR0, which is hero's. Whichever object is on screen, the answer is the same.
const scriptsOf = (ir, targetId) => (ir?.scripts ?? []).filter(script => (script.targetId ?? 'hero') === targetId);
export function evaluateLesson(lesson, {scene, variables = [], authoring = {}, identity, copyFacts = [], mode = 'main'}) {
  const model = validateLesson(lesson);
  const selectedSteps = lessonSteps(model, mode);
  const snapshot = validateSceneSnapshot(scene);
  const variableValues = new Map();
  for (const step of selectedSteps) for (const check of step.checks) if (check.kind === 'variable') {
    const reading = variables.find(variable => variable?.id === check.variableId);
    variableValues.set(check.variableId, validateLessonVariable(reading, check.variableId).value);
  }
  let ir = null;
  if (authoring.ir) { try { ir = validateProgram(authoring.ir, {objects: true, ...(authoring.resourceView ? {resourceView: authoring.resourceView} : {})}); } catch {} }
  const matchingCopy = Array.isArray(copyFacts) && copyFacts.find(fact => fact && fact.documentId === identity?.documentId &&
    ['javascript', 'python'].includes(fact.language) && fact.language === identity.backend &&
    (fact.projectId === undefined || fact.projectId === identity.projectId) &&
    typeof fact.blocklyHashAtCopy === 'string' && fact.blocklyHashAtCopy.length > 0);
  const steps = selectedSteps.map(step => {
    const checks = step.checks.map(check => {
      let passed = false; let message; let basis;
      const targetId = check.targetId ?? 'hero';
      switch (check.kind) {
        case 'position': {
          const sprite = snapshot.sprites.find(item => item.id === targetId);
          basis = 'execution';
          if (!sprite) { message = `Lectura de ejecución: este proyecto no tiene a «${targetId}», y este paso lo necesita.`; break; }
          const observed = sprite[check.axis];
          passed = Math.abs(observed - check.equals) <= check.tolerance;
          message = `Lectura de ejecución: ${check.axis}=${observed}; meta ${check.equals}.`; break;
        }
        case 'variable': {
          // With an owner, the reading must be that object's local variable.
          const owned = !Object.hasOwn(check, 'targetId') || snapshot.variables.some(item => item.id === check.variableId && (item.targetId ?? 'hero') === targetId);
          const observed = variableValues.get(check.variableId); passed = owned && observed === check.equals;
          message = `Lectura de ejecución: Puntos=${observed}; meta ${check.equals}.`; basis = 'execution'; break;
        }
        case 'authored-operation':
          passed = scriptsOf(ir, targetId).some(script => operationPresent(script.body, check));
          if (check.operation === 'move') message = passed ? `Autoría: tus bloques incluyen un movimiento de ${check.steps} pasos.`
            : `Autoría: tus bloques aún no tienen un movimiento de ${check.steps} pasos.`;
          else message = passed ? `Autoría: tu programa incluye el cambio al disfraz ${check.costume}. No se comprobaron píxeles.`
            : `Autoría: añade un cambio al disfraz ${check.costume}.`;
          basis = 'authoring'; break;
        case 'edited-in-text':
          passed = authoring.editedInText === true;
          message = passed ? 'Autoría: este programa recibió un cambio desde JavaScript o Python. No comprueba qué explicas sobre él.'
            : 'Cambia el programa en la vista JavaScript o Python y aplícalo al ejecutar o al volver a Bloques.';
          basis = 'authoring'; break;
        case 'text-copy':
          passed = Boolean(matchingCopy);
          message = passed ? 'Copia: se ejecutó el documento creado explícitamente desde tus bloques.' : 'Crea una copia JavaScript o Python y ejecuta ese documento.';
          basis = 'copy'; break;
        case 'blocks-unchanged':
          passed = Boolean(matchingCopy && typeof authoring.blocklyHash === 'string' && authoring.blocklyHash === matchingCopy.blocklyHashAtCopy);
          message = passed ? 'Autoría: los bloques coinciden con los de la creación de la copia.' : 'Conserva los bloques con los que creaste la copia y modifica solo el documento textual.';
          basis = 'authoring'; break;
      }
      return {kind: check.kind, passed, message, basis};
    });
    return {id: step.id, passed: checks.every(check => check.passed), checks};
  });
  return {passed: steps.every(step => step.passed), steps};
}
