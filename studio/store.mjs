const NAME = 'gg-studio';

function request(result) {
  return new Promise((resolve, reject) => {
    result.onsuccess = () => resolve(result.result);
    result.onerror = () => reject(result.error);
  });
}

function done(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
}

export async function openStore() {
  const opening = indexedDB.open(NAME, 1);
  opening.onupgradeneeded = () => {
    opening.result.createObjectStore('projects', {keyPath: 'key'});
    opening.result.createObjectStore('students', {keyPath: 'name'});
  };
  const blocked = new Promise((_, reject) => { opening.onblocked = () => reject(new Error('Base de datos bloqueada')); });
  const db = await Promise.race([request(opening), blocked]);
  const all = name => request(db.transaction(name).objectStore(name).getAll());
  const write = (name, change) => {
    const transaction = db.transaction(name, 'readwrite');
    change(transaction.objectStore(name));
    return done(transaction);
  };
  return {
    list: async student => (await all('projects')).filter(record => record.student === student),
    all: () => all('projects'),
    put: record => write('projects', store => store.put(record)),
    students: async () => (await all('students')).map(student => student.name).sort((a, b) => a.localeCompare(b, 'es')),
    addStudent: name => write('students', store => store.put({name})),
    removeAll: () => write('projects', store => store.clear()),
    restore: (records, students) => {
      const transaction = db.transaction(['projects', 'students'], 'readwrite');
      for (const record of records) transaction.objectStore('projects').put(record);
      for (const name of students) transaction.objectStore('students').put({name});
      return done(transaction);
    }
  };
}
