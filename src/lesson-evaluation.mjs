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
  return body.some(node => (node.kind === check.operation && node.costume === check.costume) ||
    operationPresent(node.body ?? [], check) || operationPresent(node.elseBody ?? [], check));
}
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
  if (authoring.ir) { try { ir = validateProgram(authoring.ir); } catch {} }
  const matchingCopy = Array.isArray(copyFacts) && copyFacts.find(fact => fact && fact.documentId === identity?.documentId &&
    ['javascript', 'python'].includes(fact.language) && fact.language === identity.backend &&
    (fact.projectId === undefined || fact.projectId === identity.projectId) &&
    typeof fact.blocklyHashAtCopy === 'string' && fact.blocklyHashAtCopy.length > 0);
  const steps = selectedSteps.map(step => {
    const checks = step.checks.map(check => {
      let passed = false; let message; let basis;
      switch (check.kind) {
        case 'position': {
          const observed = snapshot.sprites[0][check.axis];
          passed = Math.abs(observed - check.equals) <= check.tolerance;
          message = `Lectura de ejecución: ${check.axis}=${observed}; meta ${check.equals}.`; basis = 'execution'; break;
        }
        case 'variable': {
          const observed = variableValues.get(check.variableId); passed = observed === check.equals;
          message = `Lectura de ejecución: Puntos=${observed}; meta ${check.equals}.`; basis = 'execution'; break;
        }
        case 'authored-operation':
          passed = Boolean(ir?.scripts.some(script => operationPresent(script.body, check)));
          message = passed ? `Autoría: tu programa incluye el cambio al disfraz ${check.costume}. No se comprobaron píxeles.`
            : `Autoría: añade un cambio al disfraz ${check.costume}.`; basis = 'authoring'; break;
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
