import {renameProject} from './project.mjs';

const MISSION_TIMEOUT = 90000;
const UNNAMED = 'untitled';

// PXT may open a blank project of its own before the mission, and it names the mission 'untitled'.
// Only that blank is dropped: anything else saved in a mission session is the student's work.
export function missionFilter(title, stored) {
  const blank = new Set();
  let mission = null;
  return project => {
    const {id, tutorial, name} = project.header;
    if (!mission && tutorial && !stored.has(id)) mission = id;
    if (id === mission) return name === UNNAMED ? renameProject(project, title) : project;
    if (stored.has(id) || (mission && !blank.has(id))) return project;
    blank.add(id);
    return null;
  };
}

export function findMission(records, title) {
  const missions = records.filter(({project: {header}}) => (header.tutorial || header.tutorialCompleted) && header.name === title && !header.isDeleted);
  return missions.sort((a, b) => b.at - a.at)[0];
}

// Returns the function that reports the editor's answer.
export function watchMission({timeout = MISSION_TIMEOUT, onFailed}) {
  let answered = false;
  const answer = ok => {
    if (answered) return;
    answered = true;
    clearTimeout(timer);
    if (!ok) onFailed();
  };
  const timer = setTimeout(() => answer(false), timeout);
  return answer;
}
