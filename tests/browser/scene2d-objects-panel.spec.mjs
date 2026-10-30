import {test,expect} from '@playwright/test';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

// scene2d-multi-sprite tarea 3.1 (E2, 30/10/2026): the objects panel. Stage and
// sprites in one single-select listbox; one Blockly editor mounted for the
// selected object while the others stay serialized with their drafts, Undo and
// views. Selecting, adding, renaming, duplicating and deleting never run anything.
test.setTimeout(240000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const mounted=page=>page.evaluate(()=>studioProbe.authoring.mountedObject());
const capture=page=>page.evaluate(()=>studioProbe.authoring.capture());
const config=page=>page.evaluate(()=>studioProbe.authoring.captureCapabilities().config['gg.sprites']);
const list=page=>page.locator('#objects-list');
const option=(page,name)=>page.getByRole('option',{name,exact:true});
const names=page=>page.locator('#objects-list [role=option]').allInnerTexts();
const editing=page=>page.locator('#editing-context');
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function nameForm(page,name){
  const input=page.locator('#object-name');
  await expect(input).toBeFocused();
  await input.fill(name);await input.press('Enter');
}
async function add(page,name){
  await clickVisible(page,page.locator('#object-add'));
  await nameForm(page,name);
  await expect(option(page,name)).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function mode(page,value){await clickVisible(page,page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
const blockIds=state=>{const ids=[];const walk=value=>{if(!value||typeof value!=='object')return;if(value.type&&value.id)ids.push(value.id);Object.values(value).forEach(walk);};walk(state?.blocks);return ids;};

test('MS-BROWSER-007: add, script, rename, duplicate and delete an object; everything survives a reload and nothing runs',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);
  await expect(page.getByRole('listbox',{name:'Objetos del proyecto'})).toBeVisible();
  expect(await names(page)).toEqual(['Escenario','hero']);
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  await expect(option(page,'Escenario')).toHaveAttribute('aria-selected','false');
  await expect(editing(page)).toHaveText('Editando: hero · bloques');
  const heroBlocks=(await capture(page)).scene2d.sprites.hero;

  await clickVisible(page,page.locator('#object-add'));
  // The form suggests a free name, selected, so Enter is enough.
  await expect(page.locator('#object-name')).toBeFocused();
  await expect(page.locator('#object-name')).toHaveValue('Objeto 2');
  await nameForm(page,'Cesta');
  await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  await expect(option(page,'Cesta')).toBeFocused();
  await expect(editing(page)).toHaveText('Editando: Cesta · bloques');
  await expect(page.locator('#objects-status')).toContainText('«Cesta»');
  await expect(page.locator('#objects-status')).toContainText('al ejecutar');
  await expect(page.locator('#run-editor')).toBeEnabled();
  const objects=await config(page),cesta=objects.sprites[1].id;
  expect(objects.sprites.map(sprite=>sprite.name)).toEqual(['hero','Cesta']);
  expect(cesta).toMatch(/^sprite-/);
  expect(await mounted(page)).toBe(cesta);
  let authored=await capture(page);
  expect(authored.scene2d.sprites.hero).toEqual(heroBlocks);
  expect(authored.scene2d.sprites[cesta].blocks?.blocks??[]).toEqual([]);
  expect(authored.resources.costumes.filter(item=>item.ownerId===cesta).map(item=>item.id)).toEqual([objects.sprites[1].costume]);
  expect((await settled(snapshot,page)).threads).toBe(0);

  // A script of its own, in text; hero's stays.
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onStart(() => {\n  cesta.say("Soy Cesta");\n});\n');
  await mode(page,'blocks');
  authored=await capture(page);
  expect(blockIds(authored.scene2d.sprites[cesta]).length).toBeGreaterThan(1);
  expect(authored.scene2d.sprites.hero).toEqual(heroBlocks);

  // Rename keeps the ID.
  await clickVisible(page,page.locator('#object-rename'));
  await expect(page.locator('#object-name')).toHaveValue('Cesta');
  await nameForm(page,'Cesta Roja');
  await expect(option(page,'Cesta Roja')).toBeFocused();
  expect((await config(page)).sprites[1]).toMatchObject({id:cesta,name:'Cesta Roja'});
  await expect(editing(page)).toHaveText('Editando: Cesta Roja · bloques');

  // Duplicate: a new ID, a free name, the same program with its own block IDs.
  await clickVisible(page,page.locator('#object-duplicate'));
  await expect(option(page,'Cesta Roja 2')).toHaveAttribute('aria-selected','true');
  await expect(option(page,'Cesta Roja 2')).toBeFocused();
  await expect(page.locator('#run-editor')).toBeEnabled();
  const three=await config(page),copy=three.sprites[2].id;
  expect(new Set(three.sprites.map(sprite=>sprite.id)).size).toBe(3);
  authored=await capture(page);
  expect(blockIds(authored.scene2d.sprites[copy]).length).toBe(blockIds(authored.scene2d.sprites[cesta]).length);
  expect(blockIds(authored.scene2d.sprites[copy]).filter(id=>blockIds(authored.scene2d.sprites[cesta]).includes(id))).toEqual([]);
  expect(await page.evaluate(()=>studioProbe.authoring.sceneProgram().scripts.map(script=>script.targetId))).toEqual(expect.arrayContaining([cesta,copy]));
  expect((await settled(snapshot,page)).threads).toBe(0);

  // Reopening keeps IDs, scripts and the selected object, and runs nothing.
  await page.evaluate(()=>studioProbe.project.flush());
  await page.reload();await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(await names(page)).toEqual(['Escenario','hero','Cesta Roja','Cesta Roja 2']);
  await expect(option(page,'Cesta Roja 2')).toHaveAttribute('aria-selected','true');
  expect(await mounted(page)).toBe(copy);
  expect((await config(page)).sprites.map(sprite=>sprite.id)).toEqual(['hero',cesta,copy]);
  expect((await settled(snapshot,page)).threads).toBe(0);

  // Delete asks first; the answer no changes nothing and focus stays on the button.
  let question='';
  page.once('dialog',dialog=>{question=dialog.message();void dialog.dismiss();});
  await clickVisible(page,page.locator('#object-delete'));
  await expect(page.locator('#object-delete')).toBeFocused();
  expect(question).toContain('«Cesta Roja 2»');
  expect(question).toContain('No se puede deshacer');
  expect(await names(page)).toHaveLength(4);
  page.once('dialog',dialog=>void dialog.accept());
  await clickVisible(page,page.locator('#object-delete'));
  await expect(option(page,'Cesta Roja 2')).toHaveCount(0);
  await expect(option(page,'Cesta Roja')).toHaveAttribute('aria-selected','true');
  await expect(option(page,'Cesta Roja')).toBeFocused();
  await expect(editing(page)).toHaveText('Editando: Cesta Roja · bloques');
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(await mounted(page)).toBe(cesta);
  authored=await capture(page);
  expect(Object.keys(authored.scene2d.sprites).sort()).toEqual(['hero',cesta].sort());
  expect(authored.resources.costumes.some(item=>item.ownerId===copy)).toBe(false);
  expect((await settled(snapshot,page)).threads).toBe(0);
  expect(errors).toEqual([]);
});

test('MS-BROWSER-008: keyboard follows the APG listbox; focus is never lost, also after deleting',async({page})=>{
  await open(page);await add(page,'Cesta');await add(page,'Pelota');
  // Tab lands on the selected option; arrows move focus without selecting.
  await page.locator('#authoring-context').focus();
  const listbox=list(page);
  await option(page,'Pelota').focus();
  await expect(listbox).toHaveAttribute('aria-orientation','horizontal');
  await expect(page.locator('#objects-list [tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('ArrowLeft');
  await expect(option(page,'Cesta')).toBeFocused();
  await expect(option(page,'Pelota')).toHaveAttribute('aria-selected','true');
  expect((await mounted(page))).not.toBe('hero');
  await page.keyboard.press('Home');await expect(option(page,'Escenario')).toBeFocused();
  await page.keyboard.press('ArrowLeft');await expect(option(page,'Pelota')).toBeFocused();
  await page.keyboard.press('ArrowRight');await expect(option(page,'Escenario')).toBeFocused();
  await page.keyboard.press('End');await expect(option(page,'Pelota')).toBeFocused();
  await page.keyboard.press('ArrowUp');await expect(option(page,'Cesta')).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect(option(page,'Pelota')).toBeFocused();
  // Leaving and coming back returns to the selected option, not the last focused one.
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('Tab');
  await expect(page.locator('#object-add')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(option(page,'Pelota')).toBeFocused();
  // Enter and Space select.
  await page.keyboard.press('Home');await page.keyboard.press('Enter');
  await expect(option(page,'Escenario')).toHaveAttribute('aria-selected','true');
  await expect(option(page,'Escenario')).toBeFocused();
  expect(await mounted(page)).toBe('stage');
  await expect(editing(page)).toHaveText('Editando: Escenario · bloques');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  expect(await mounted(page)).toBe('hero');
  expect((await settled(snapshot,page)).threads).toBe(0);
  // Esc closes the name form and returns to the button that opened it.
  await page.locator('#object-rename').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#object-name')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#object-name-form')).toBeHidden();
  await expect(page.locator('#object-rename')).toBeFocused();
  expect((await config(page)).sprites[0].name).toBe('hero');
  // Deleting with the keyboard: the next sprite takes over, and focus with it.
  page.once('dialog',dialog=>void dialog.accept());
  await page.locator('#object-delete').focus();await page.keyboard.press('Enter');
  await expect(option(page,'hero')).toHaveCount(0);
  await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  await expect(option(page,'Cesta')).toBeFocused();
  await expect(page.locator('#objects-list [tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('#run-editor')).toBeEnabled();
  // The last one of the row: focus goes to the previous one.
  await page.locator('#objects-list [role=option]').last().focus();await page.keyboard.press('Enter');
  await expect(option(page,'Pelota')).toHaveAttribute('aria-selected','true');
  page.once('dialog',dialog=>void dialog.accept());
  await page.locator('#object-delete').focus();await page.keyboard.press('Enter');
  await expect(option(page,'Cesta')).toBeFocused();
  await expect(page.locator('#run-editor')).toBeEnabled();
  // The last sprite stays, and the button says why instead of disappearing.
  await page.locator('#object-delete').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#object-delete')).toBeFocused();
  await expect(page.locator('#object-delete')).toHaveAttribute('aria-disabled','true');
  await expect(page.locator('#objects-status')).toContainText('al menos un objeto');
  // The stage has no name or copies to change.
  await option(page,'Escenario').click();
  await expect(option(page,'Escenario')).toHaveAttribute('aria-selected','true');
  for(const control of ['#object-rename','#object-duplicate','#object-delete']){
    await expect(page.locator(control)).toHaveAttribute('aria-disabled','true');
    await page.locator(control).focus();await page.keyboard.press('Enter');
    await expect(page.locator('#objects-status')).toContainText('escenario');
    await expect(page.locator('#object-name-form')).toBeHidden();
  }
});

test('MS-BROWSER-009: names are normalized and refused beside the field; the limit and every failure are explained',async({page})=>{
  await open(page);await add(page,'Cesta');
  await page.locator('#object-rename').focus();await page.keyboard.press('Enter');
  const input=page.locator('#object-name'),problem=page.locator('#object-name-error');
  for(const [typed,cause] of [['   ','Escribe un nombre'],['hero','Ya hay un objeto llamado «hero»'],['ESCENARIO','nombre del escenario']]){
    await input.fill(typed);await input.press('Enter');
    await expect(problem).toContainText(cause);
    await expect(input).toHaveAttribute('aria-invalid','true');
    await expect(input).toBeFocused();
    expect((await config(page)).sprites[1].name).toBe('Cesta');
  }
  // Typing clears the complaint; an emoji joined with ZWJ is stored without it.
  await input.fill('👩‍💻 Cesta');
  await expect(input).not.toHaveAttribute('aria-invalid','true');
  await expect(problem).toBeHidden();
  await input.press('Enter');
  await expect(option(page,'👩💻 Cesta')).toBeFocused();
  expect((await config(page)).sprites[1].name).toBe('👩💻 Cesta');
  await expect(page.locator('#objects-status')).toContainText('Se guardó como');
  // Its identifier is still valid text: the view writes it and reads it back.
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onStart(() => {\n  cesta.say("emoji");\n});\n');
  await mode(page,'blocks');
  // Eight sprites: Add explains the limit and stays focusable.
  for(const name of ['C','D','E','F','G','H'])await add(page,name);
  expect(await names(page)).toHaveLength(9);
  await page.locator('#object-add').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#object-add')).toHaveAttribute('aria-disabled','true');
  await expect(page.locator('#object-add')).toBeFocused();
  await expect(page.locator('#objects-status')).toContainText('hasta 8');
  await expect(page.locator('#object-name-form')).toBeHidden();
  await page.locator('#object-duplicate').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#objects-status')).toContainText('hasta 8');
});

test('MS-BROWSER-010: a rejected change of object is explained; the views follow rename, Undo and rollback',async({page})=>{
  await open(page);await add(page,'Cesta');
  const cesta=await mounted(page),source=page.locator('#text-source');
  await option(page,'hero').click();
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  await mode(page,'javascript');
  // Text with an error keeps the object; the panel says why and focus goes to the line.
  const foreign='onStart(() => {\n  hero.say("Hola");\n  cesta.move(10);\n});\n';
  await source.fill(foreign);
  await option(page,'Cesta').click();
  await expect(page.locator('#text-error')).toContainText('Línea 3');
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#objects-status')).toContainText('Sigues en «hero»');
  await expect(page.locator('#objects-status')).toContainText('texto');
  await expect(source).toBeFocused();
  await expect(source).toHaveValue(foreign);
  // selectObject tells its causes apart.
  const result=await page.evaluate(id=>studioProbe.syncedViews.selectObject(id),cesta);
  expect(result).toMatchObject({ok:false,reason:'rejected'});
  const raced=await page.evaluate(id=>{const views=studioProbe.syncedViews;const first=views.selectObject(id);return Promise.all([first,views.selectObject('stage')]);},cesta);
  expect(raced[1]).toMatchObject({ok:false,reason:'busy'});
  expect(raced[0]).toMatchObject({ok:false,reason:'rejected'});
  const cancelled=await page.evaluate(id=>{const views=studioProbe.syncedViews;const pending=views.selectObject(id);views.cancelAnalysis();return pending;},cesta);
  expect(cancelled).toMatchObject({ok:false,reason:'cancelled'});
  expect(await page.evaluate(()=>studioProbe.syncedViews.selectObject('hero'))).toMatchObject({ok:true,reason:'current'});
  // A failed object add waits for the text as well: nothing was added.
  await clickVisible(page,page.locator('#object-add'));await nameForm(page,'Pelota');
  await expect(page.locator('#objects-status')).toContainText('Sigues en «hero»');
  expect(await names(page)).toEqual(['Escenario','hero','Cesta']);

  // Rename with the text view open: the live text follows, it is the same program,
  // and Blocks accepts it.
  await source.fill('onStart(() => {\n  hero.say("Hola");\n});\n');
  await page.locator('#object-rename').focus();await page.keyboard.press('Enter');
  await nameForm(page,'Rojo');
  await expect(source).toHaveValue(/^onStart\(\(\) => \{\n {2}rojo\.say\("Hola"\);/m);
  await expect(page.locator('#text-document-status')).toHaveText('Es el mismo programa.');
  await expect(option(page,'Rojo')).toBeFocused();
  await mode(page,'blocks');
  await expect(page.locator('#text-error')).toHaveText('');
  const point=(await capture(page)).scene2d.sprites.hero;

  // Undo after leaving and returning: the point moved to objects, its hash is corrected.
  await mode(page,'javascript');
  await page.evaluate(()=>{ // The hash of the prepared state differs from the applied one (as a reload can).
    const digest=crypto.subtle.digest.bind(crypto.subtle);let calls=0;
    crypto.subtle.digest=async(...args)=>{const value=await digest(...args);if(++calls===1){const bytes=new Uint8Array(value);bytes[0]^=255;return bytes.buffer;}return value;};
    window.__restoreDigest=()=>{crypto.subtle.digest=digest;};
  });
  await source.fill((await source.inputValue()).replace('"Hola"','"Hola otra vez"'));
  await option(page,'Cesta').click();
  await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  await expect.poll(async()=>(await capture(page)).codeViews.objects.hero?.restorePoint?.id).toBeTruthy();
  await page.evaluate(()=>window.__restoreDigest());
  await option(page,'Rojo').click();
  await expect(option(page,'Rojo')).toHaveAttribute('aria-selected','true');
  let asked=null;page.on('dialog',dialog=>{asked=dialog.message();void dialog.accept();});
  await clickVisible(page,page.locator('#code-view-undo'));
  await expect.poll(async()=>(await capture(page)).scene2d.sprites.hero).toEqual(point);
  expect(asked).toBeNull();

  // Rollback: a failure after mounting returns to the object and its text, with the cause.
  await mode(page,'javascript');
  const text=await source.inputValue();
  // A conversion still in flight on this object refuses the switch after the mount.
  const pending=await page.evaluate(()=>{const entry=studioProbe.codeViews.get('2d');
    studioProbe.codeViews.set({...entry,pendingRestorePoint:{id:crypto.randomUUID(),workspace:{},scriptOrder:null,appliedHash:'a'.repeat(64)}});return entry;});
  const failed=await page.evaluate(id=>studioProbe.syncedViews.selectObject(id),cesta);
  expect(failed).toMatchObject({ok:false,reason:'failed'});
  expect(failed.message).toContain('conversión en curso');
  expect(await mounted(page)).toBe('hero');
  await expect(source).toHaveValue(text);
  await expect(option(page,'Rojo')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#text-document-status')).toHaveText('Es el mismo programa.');
  expect((await capture(page)).codeViews?.objectId??'hero').toBe('hero');
  await page.evaluate(entry=>studioProbe.codeViews.set(entry),pending);
  await mode(page,'blocks');
  expect(await page.evaluate(id=>studioProbe.syncedViews.selectObject(id),cesta)).toMatchObject({ok:true});
  expect(await mounted(page)).toBe(cesta);
});

test('MS-BROWSER-011: each object keeps its own Blockly history and view; drafts survive changing object',async({page})=>{
  await open(page);
  const blocks=()=>page.evaluate(()=>studioProbe.editor.save().blocks?.blocks?.length??0);
  const heroCount=await blocks();
  expect(heroCount).toBeGreaterThan(0);
  const surface=page.locator('#blockly-editor');
  // A real deletion on hero, undone later on hero only.
  const root=surface.locator('.blocklyDraggable').first();
  await root.click({position:{x:12,y:12}});
  await page.keyboard.press('Delete');
  await expect.poll(blocks).toBe(heroCount-1);
  await add(page,'Cesta');
  expect(await blocks()).toBe(0);
  // Ctrl+Z on the other object does not bring hero's block here.
  await surface.locator('.blocklyMainBackground').click({position:{x:300,y:200}});
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(200);
  expect(await blocks()).toBe(0);
  await option(page,'hero').click();
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  expect(await blocks()).toBe(heroCount-1);
  await surface.locator('.blocklyMainBackground').click({position:{x:300,y:200}});
  await page.keyboard.press('Control+z');
  await expect.poll(blocks).toBe(heroCount);
});

test('MS-BROWSER-012: Run starts every object, Detener stops them; the stage offers only what it can do',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);
  await add(page,'Cesta');
  const cesta=await mounted(page);
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onMessage("hola", () => {\n  cesta.setX(77);\n});\n');
  await mode(page,'blocks');
  await option(page,'hero').click();
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onStart(() => {\n  broadcastAndWait("hola");\n});\n');
  await mode(page,'blocks');
  // The result does not call the other object's selection a change.
  await clickVisible(page,page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).sprites?.find(sprite=>sprite.id===cesta)?.x,{timeout:30000}).toBe(77);
  await option(page,'Cesta').click();
  await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  await page.waitForTimeout(400);
  await expect(page.locator('#result-pending')).toBeHidden();
  await expect(page.locator('#result-context')).toContainText('activo');
  await clickVisible(page,page.locator('#stop-result'));
  await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
  // The example belongs to a single sprite: it is offered only there.
  await expect(page.locator('#restore-editor')).toBeHidden();
  // Toolbox of the stage: no motion, looks or clones; sprites keep theirs.
  const categories=()=>page.evaluate(()=>[...document.querySelectorAll('#blockly-editor .blocklyToolbox [role=treeitem]')].map(node=>node.textContent.trim()));
  const sprite=await categories();
  expect(sprite).toEqual(expect.arrayContaining(['Movimiento','Apariencia','Clones']));
  await option(page,'Escenario').click();
  await expect(option(page,'Escenario')).toHaveAttribute('aria-selected','true');
  await expect.poll(categories).not.toContain('Movimiento');
  const stage=await categories();
  expect(stage).not.toContain('Apariencia');
  expect(stage).not.toContain('Clones');
  expect(stage).toEqual(expect.arrayContaining(['Eventos','Control','Sonido','Variables']));
  await option(page,'hero').click();
  await expect.poll(categories).toContain('Movimiento');
  // A copy written for every object, kept for later.
  await clickVisible(page,page.locator('#copy-javascript'));
  await expect(page.locator('#authoring-context')).toHaveValue('text');
  await selectContext(page,'2d');
  // Project without hero: it still runs, and the inspector does not name hero.
  page.once('dialog',dialog=>void dialog.accept());
  await clickVisible(page,page.locator('#object-delete'));
  await expect(option(page,'hero')).toHaveCount(0);
  await expect(page.locator('#run-editor')).toBeEnabled();
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onStart(() => {\n  cesta.setX(50);\n});\n');
  await mode(page,'blocks');
  await clickVisible(page,page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).sprites?.find(sprite=>sprite.id===cesta)?.x,{timeout:30000}).toBe(50);
  await clickVisible(page,page.locator('#stop-result'));
  await page.getByRole('tab',{name:'Propiedades'}).click();
  // Authored facts name the sprites of the project. The idle runner's own reading is
  // not authoring (it shows its built-in scene until the next Run).
  const inspector=page.locator('.scene-inspector');
  await inspector.locator('summary',{hasText:'Estado inicial'}).click();
  await expect(page.locator('#inspector-initial')).toContainText('Cesta');
  await expect(page.locator('#inspector-initial')).not.toContainText('hero');
  await expect(page.locator('#inspector-variables-heading')).toHaveText('Variables locales de Cesta');
  await expect(page.locator('#inspector-object option[value=hero]')).toHaveText('Cesta · Sprite');
  // The copy names an object that is gone: it says so instead of failing inside the scene.
  await selectContext(page,'text');
  await clickVisible(page,page.locator('#run-document'));
  await expect(page.locator('#text-error')).toContainText('«hero», que ya no está en el proyecto');
  expect(errors).toEqual([]);
});

test('MS-BROWSER-014: a project of one workspace keeps its screen: no panel, no object in «Editando»',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    const app=path=>import(new URL('./app/'+path,location.href).href);
    const [{createProject},{createCapabilities}]=await Promise.all([app('project-format.mjs'),app('contracts/packs.mjs')]);
    const capture=studioProbe.authoring.capture();
    const document=await createProject({name:'Antes',blockly:capture.blockly,deviceSource:'',catalog:studioProbe.project.catalog(),capabilities:createCapabilities(['gg.sprites'],{versions:{'gg.sprites':'0.2.0'}})});
    await studioProbe.project.open(JSON.stringify(document));
  });
  await expect(page.locator('#run-editor')).toBeEnabled();
  await expect(page.locator('#objects-panel')).toBeHidden();
  await expect(editing(page)).toHaveText('Editando bloques');
  expect(await mounted(page)).toBeNull();
});

const views=[['desktop',1440,900],['laptop',1280,720],['narrow',390,844],['zoom',320,568]];
for(const [label,width,height] of views)test('MS-BROWSER-013: the panel fits '+label+' '+width+'×'+height+' without page overflow',async({page})=>{
  await page.setViewportSize({width,height});
  await open(page);
  // The nominal case: the start band is closed, as it is after the first action.
  if(await page.locator('#entry-panel').evaluate(node=>node.open))await page.locator('#entry-toggle').click();
  for(const name of ['Cesta','Pelota con un nombre bien largo','Robot']){await add(page,name);await page.locator('#objects-status').waitFor({state:'attached'});}
  const box=await page.evaluate(()=>{
    const rect=selector=>{const value=document.querySelector(selector).getBoundingClientRect();return {left:value.left,right:value.right,top:value.top,bottom:value.bottom,width:value.width,height:value.height};};
    return {viewport:innerWidth,scroll:document.scrollingElement.scrollWidth,panel:rect('#objects-panel'),editor:rect('#blockly-editor'),
      options:[...document.querySelectorAll('#objects-list [role=option]')].map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};}),
      buttons:[...document.querySelectorAll('#objects-panel button:not([hidden])')].filter(node=>node.getClientRects().length).map(node=>node.getBoundingClientRect().height)};
  });
  expect(box.scroll).toBeLessThanOrEqual(box.viewport);
  expect(box.panel.right).toBeLessThanOrEqual(box.viewport);
  for(const item of box.options){expect(item.left).toBeGreaterThanOrEqual(0);expect(item.right).toBeLessThanOrEqual(box.viewport);expect(item.height).toBeGreaterThanOrEqual(44);}
  for(const height of box.buttons)expect(height).toBeGreaterThanOrEqual(44);
  if(label==='desktop'||label==='laptop')expect(box.editor.height).toBeGreaterThanOrEqual(300);
  await page.locator('#objects-panel').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifactPath('objects-panel-'+label+'.png')});
  await option(page,'Cesta').click();await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  await clickVisible(page,page.locator('#object-rename'));
  await expect(page.locator('#object-name')).toBeFocused();
  await page.locator('#object-name').fill('hero');await page.locator('#object-name').press('Enter');
  await expect(page.locator('#object-name-error')).toBeVisible();
  expect(await page.evaluate(()=>document.scrollingElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:artifactPath('objects-panel-'+label+'-form.png')});
});
