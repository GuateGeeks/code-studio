import {expect} from '@playwright/test';

// Scratch coordinates describe the fitted 480×360 image, not the surrounding
// canvas element. The integrated pane can letterbox that image on either axis.
export async function clickStagePoint(page,canvas,x,y=0) {
  await page.locator('#runner-slot').scrollIntoViewIfNeeded();
  await canvas.scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const bounds=await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const width=Math.min(bounds.width,bounds.height*4/3),height=width*3/4;
  expect(width).toBeGreaterThan(0);
  await page.mouse.click(bounds.x+(bounds.width-width)/2+width*(x+240)/480,
    bounds.y+(bounds.height-height)/2+height*(180-y)/360);
}

// Use the same visible context selector as a learner. No hidden controls,
// injected presentation state or forced clicks.
export async function selectContext(page,id) {
  const picker=page.locator('#authoring-context');
  if(await picker.inputValue()===id)return;
  await picker.scrollIntoViewIfNeeded();
  await expect(picker).toBeInViewport();
  await picker.selectOption(id);
}

// A consultation panel is shown by selecting its tab, as a learner would.
export async function revealPanel(page,control) {
  const panel=control.locator('xpath=ancestor::*[@role="tabpanel"][1]');
  if(!await panel.count())return;
  if(await panel.evaluate(node=>!node.hidden))return;
  const tab=page.locator('#'+await panel.getAttribute('aria-labelledby'));
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected','true');
}
// Make a control visible as a learner would: select its tab and open closed
// disclosures or header menus around it, without clicking the control itself.
export async function revealControl(page,control) {
  await revealPanel(page,control);
  const closed=control.locator('xpath=ancestor::details[not(@open)]');
  for(let index=await closed.count()-1;index>=0;index--){
    if(await closed.nth(index).getAttribute('id')==='entry-panel'){await page.locator('#entry-toggle').click();continue;}
    await closed.nth(index).locator(':scope > summary').click();
  }
}
// Select a consultation tool by its visible tab name with the keyboard.
export async function consult(page,name) {
  const tab=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name,exact:true});
  await tab.scrollIntoViewIfNeeded();
  await tab.focus();await tab.press('Enter');
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#'+await tab.getAttribute('aria-controls'))).toBeVisible();
  return tab;
}
// Program modes are native radio groups (Bloques · JavaScript · Python).
export async function chooseMode(page,group,value) {
  const input=page.locator('#'+group+' input[value="'+value+'"]');
  await input.scrollIntoViewIfNeeded();
  await input.check();
}
// Role locators ignore hidden panels: look through the visible tabs as a learner would.
export async function findInConsultation(page,control) {
  if(await control.count())return;
  for(const tab of await page.locator('#dock-tabs [role=tab]:not([hidden])').all()){
    await tab.click();
    if(await control.count())return;
  }
  // Header menus (Archivo, Preparar para clase) are opened from their summaries.
  for(const id of ['#project-menu','#offline-panel']){
    const menu=page.locator(id);if(await menu.evaluate(node=>node.open))continue;
    await menu.locator(':scope > summary').click();
    if(await control.count())return;
    await menu.locator(':scope > summary').click();
  }
}
export async function clickVisible(page,control) {
  if(control===undefined){control=page;page=control.page();}
  await findInConsultation(page,control);
  // An open header menu covers part of the station; close it unless it holds the target.
  if(await control.count())for(const menu of await page.locator('header details.app-menu[open]').all())
    if(!await control.first().evaluate((target,node)=>node.contains(target),await menu.elementHandle()))await menu.locator(':scope > summary').click();
  await revealPanel(page,control);
  const closed=control.locator('xpath=ancestor::details[not(@open)]');
  for(let index=await closed.count()-1;index>=0;index--) {
    const details=await closed.nth(index).elementHandle();
    const targetsSummary=await control.evaluate((target,panel)=>panel.querySelector(':scope > summary').contains(target),details);
    await details.dispose();
    if(targetsSummary)continue;
    // The start panel is reopened from the header «Inicio» toggle while it is closed.
    if(await closed.nth(index).getAttribute('id')==='entry-panel'){await page.locator('#entry-toggle').click();continue;}
    const summary=closed.nth(index).locator(':scope > summary');
    await summary.scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await summary.click();
  }
  const target=await control.elementHandle(),hosts=[];
  try {
    // Reveal outer frames first. A nested offscreen simulator can suspend the
    // animation frames that scrollIntoView uses to check the target's stability.
    let frame=await target.ownerFrame();
    while(frame?.parentFrame()){hosts.push(await frame.frameElement());frame=frame.parentFrame();}
    for(const host of [...hosts].reverse())await host.scrollIntoViewIfNeeded();
    // Live lists (console entries) may re-render the same control between steps; retry on detachment only.
    for(let attempt=0;;attempt++){
      try{
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeInViewport();
        // Chromium needs a compositor frame after scrolling across the isolated preview.
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await control.click();
        break;
      }catch(error){if(attempt>=2||!/not attached/i.test(error.message))throw error;}
    }
  }finally{
    // Stop and popup actions can destroy the frame that owned these handles.
    await Promise.allSettled([target,...hosts].map(handle=>handle.dispose()));
  }
}
