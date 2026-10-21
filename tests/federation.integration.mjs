/** Executes the actual production host/remote bundles in a simulated DOM.
 * This tests federation integration; it is not a browser visual inspection.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom';
const root = path.resolve('dist');
async function eventually(check, description) {
  const end = Date.now() + 15000;
  while (Date.now() < end) { if (check()) return; await new Promise(r => setTimeout(r, 20)); }
  throw new Error(`Timeout: ${description}`);
}
async function boot({ missing = null, prefix = '', saved = {} } = {}) {
  class Files extends ResourceLoader {
    fetch(url) {
      const pathname = new URL(url).pathname.replace(prefix, '');
      if (missing && pathname.includes(missing)) return Promise.reject(new Error('simulated remote failure'));
      const target = path.resolve(root, '.' + pathname);
      if (!target.startsWith(root + path.sep)) return Promise.reject(new Error('invalid path'));
      return readFile(target);
    }
  }
  const errors = []; const vc = new VirtualConsole(); vc.on('error', value => errors.push(value)); vc.on('jsdomError', value => errors.push(value));
  const dom = new JSDOM(await readFile(path.join(root, 'index.html'), 'utf8'), {
    url: `https://fitforge.test${prefix}/`, runScripts: 'dangerously', resources: new Files(), virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(window) {
      for (const [key, value] of Object.entries(saved)) window.localStorage.setItem(key, value);
      window.structuredClone = structuredClone;
      window.crypto.randomUUID = randomUUID;
      window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
      window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    }
  });
  await eventually(() => dom.window.document.querySelector('h1'), 'host starts');
  const document = dom.window.document;
  const click = el => { assert.ok(el, 'element exists'); el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); };
  const buttons = text => [...document.querySelectorAll('button')].find(el => el.textContent.includes(text));
  const input = (el, value) => {
    const proto = el.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new dom.window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  const navigate = async route => {
    dom.window.location.hash = `/${route}`;
    await eventually(() => document.querySelector('h1')?.textContent === (route === 'workouts' ? 'Meus treinos' : 'Meu progresso'), 'remote UI loads');
  };
  return { dom, document, errors, click, buttons, input, navigate };
}
test('production federation loads both remotes, CRUD syncs shell and reload persists data', async () => {
 const ctx = await boot(); const { dom, document, click, buttons, input, navigate, errors } = ctx;
 try {
  await eventually(() => document.querySelectorAll('.stat-value')[0]?.textContent === '3', 'workout remote API loads');
  assert.ok(dom.window.fitforge_workouts); assert.ok(dom.window.fitforge_progress);
  await navigate('workouts'); await eventually(() => document.querySelectorAll('.workout-card').length === 3, 'workout state read completes'); assert.equal(document.querySelectorAll('.workout-card').length, 3);
  click(buttons('Nova ficha')); await eventually(() => document.querySelector('dialog[open]'), 'workout form opens');
  input(document.querySelector('dialog input[placeholder="Ex.: Treino A · Superior"]'), 'Treino integração');
  input(document.querySelector('dialog input[placeholder="Nome do exercício"]'), 'Remada teste');
  document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await eventually(() => document.querySelectorAll('.workout-card').length === 4, 'workout is persisted');
  assert.equal(JSON.parse(dom.window.localStorage.getItem('fitforge.workouts.v1')).items.length, 4);
  // Edit the newly created routine through its exposed component.
  click(document.querySelector('button[aria-label="Editar Treino integração"]')); await eventually(() => document.querySelector('dialog[open]'), 'edit opens');
  input(document.querySelector('dialog input[placeholder="Ex.: Treino A · Superior"]'), 'Treino editado');
  document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await eventually(() => document.querySelector('button[aria-label="Editar Treino editado"]'), 'edit saved');
  const createdId = JSON.parse(dom.window.localStorage.getItem('fitforge.workouts.v1')).items.find(w => w.name === 'Treino editado').id;
  const card = [...document.querySelectorAll('.workout-card')].find(el => el.textContent.includes('Treino editado'));
  click([...card.querySelectorAll('button')].find(el => el.textContent.includes('Registrar sessão')));
  await eventually(() => document.querySelector('dialog[open] select')?.value === createdId, 'host passes selected routine to progress remote');
  input(document.querySelector('dialog input[type=number]'), '35');
  document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await eventually(() => document.querySelectorAll('.session-row').length === 1, 'session saved');
  assert.equal(JSON.parse(dom.window.localStorage.getItem('fitforge.sessions.v1')).items[0].duration, 35);
  // Delete the source routine; the session retains a historical name snapshot.
  await navigate('workouts'); click(document.querySelector('button[aria-label="Excluir Treino editado"]'));
  await eventually(() => document.querySelector('dialog[open]'), 'delete confirmation'); click([...document.querySelectorAll('dialog button')].find(el => el.textContent === 'Excluir'));
  await eventually(() => document.querySelectorAll('.workout-card').length === 3, 'workout deleted');
  await navigate('progress'); assert.ok(document.querySelector('.session-row').textContent.includes('Treino editado'));
  click(document.querySelector('.session-row button[aria-label^="Editar sessão"]')); await eventually(() => document.querySelector('dialog[open]'), 'historical edit opens');
  input(document.querySelector('dialog input[type=number]'), '40');
  document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await eventually(() => document.querySelector('.session-row')?.textContent.includes('40 min'), 'historical session editable');
  click(document.querySelector('.session-row button[aria-label^="Excluir sessão"]')); await eventually(() => document.querySelector('dialog[open]'), 'session delete confirmation');
  click([...document.querySelectorAll('dialog button')].find(el => el.textContent === 'Excluir'));
  await eventually(() => !document.querySelector('.session-row'), 'session removed');
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('fitforge.sessions.v1')).items, []);
  assert.equal(errors.length, 0, errors.map(String).join('\n'));
  const saved = Object.fromEntries(Object.keys(dom.window.localStorage).map(key => [key, dom.window.localStorage.getItem(key)]));
  const restarted = await boot({ saved });
  try { await restarted.navigate('workouts'); await eventually(() => restarted.document.querySelectorAll('.workout-card').length === 3, 'persisted state read completes'); assert.equal(restarted.document.querySelectorAll('.workout-card').length, 3); await restarted.navigate('progress'); assert.equal(restarted.document.querySelectorAll('.session-row').length, 0); assert.equal(restarted.errors.length, 0); } finally { restarted.dom.window.close(); }
 } finally { dom.window.close(); }
});
test('production federation resolves remote paths under a deployment subdirectory', async () => {
 const { dom, document, errors, navigate } = await boot({ prefix: '/fitforge' });
 try { await navigate('workouts'); await eventually(() => document.querySelectorAll('.workout-card').length === 3, 'workout state read completes'); assert.equal(document.querySelectorAll('.workout-card').length, 3); await navigate('progress'); assert.equal(document.querySelector('h1').textContent, 'Meu progresso'); assert.equal(errors.length, 0, errors.map(String).join('\n')); } finally { dom.window.close(); }
});
test('a missing workout remote keeps shell and the progress remote available', async () => {
 const { dom, document, navigate } = await boot({ missing: 'mfe-workouts/remoteEntry.js' });
 try {
  await eventually(() => document.querySelector('[role=alert]')?.textContent.includes('Fichas indisponíveis'), 'isolated remote error');
  assert.ok(document.querySelector('nav')); await navigate('progress'); assert.ok(document.querySelector('h1')); assert.equal(document.querySelector('h1').textContent, 'Meu progresso');
  dom.window.location.hash = '/workouts'; await eventually(() => document.body.textContent.includes('Este módulo está indisponível'), 'boundary catches remote failure');
  assert.ok(document.querySelector('nav'));
 } finally { dom.window.close(); }
});
