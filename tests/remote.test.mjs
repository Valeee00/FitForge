import test from 'node:test';
import assert from 'node:assert/strict';
import { validWorkout } from '../packages/shared/src/domain.js';
import { createRepository } from '../packages/shared/src/storage.js';

// Testes da sincronização com o API Gateway (Atividade 16), sem rede: fetch simulado.
const workout = { id: 'a', name: 'Superior', description: '', days: ['Seg'], exercises: [{ id: 'e', name: 'Supino', muscle: 'Peito', sets: 3, reps: 12, load: 20, rest: 90 }] };
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }; };
const json = (body, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function fakeApi(initial = []) {
  const rows = new Map(initial.map(r => [r.id, r])); const calls = [];
  const fetcher = async (url, { method = 'GET', body } = {}) => {
    calls.push(`${method} ${url}`);
    const id = decodeURIComponent(url.split('/api/treinos')[1].replace(/^\//, ''));
    if (method === 'GET') return json([...rows.values()]);
    if (method === 'POST') { const item = JSON.parse(body); if (rows.has(item.id)) return json({ message: 'existe' }, 409); rows.set(item.id, { ...item, createdAt: 'x' }); return json(item, 201); }
    if (method === 'PUT') { if (!rows.has(id)) return json({ message: 'não encontrada' }, 404); rows.set(id, JSON.parse(body)); return json(JSON.parse(body)); }
    if (method === 'DELETE') { if (!rows.delete(id)) return json(null, 404); return new Response(null, { status: 204 }); }
  };
  return { fetcher, calls, rows };
}
const repo = (api, db = memory(), seed = []) => createRepository({ key: 'w', seed, validate: validWorkout, event: 'test', storage: () => db, remote: { url: 'https://gw.test/api/treinos' }, fetcher: api.fetcher });

test('carrega a lista do backend e substitui o cache local', async () => {
  const api = fakeApi([{ ...workout, id: 'srv', createdAt: '2026-01-01T00:00:00' }]);
  const r = repo(api, memory(), [workout]);
  assert.equal(r.read()[0].id, 'a');            // antes da resposta: seed local
  await r.pending;
  assert.deepEqual(r.read().map(w => w.id), ['srv']);
});

test('criar usa POST, editar usa PUT, excluir usa DELETE', async () => {
  const api = fakeApi(); const r = repo(api); await r.pending;
  r.save(workout); await r.pending; assert.ok(api.rows.has('a'));
  r.save({ ...workout, name: 'Editado' }); await r.pending; assert.equal(api.rows.get('a').name, 'Editado');
  r.remove('a'); await r.pending; assert.equal(api.rows.size, 0);
  assert.deepEqual(api.calls.filter(c => !c.startsWith('GET')), ['POST https://gw.test/api/treinos', 'PUT https://gw.test/api/treinos/a', 'DELETE https://gw.test/api/treinos/a']);
});

test('o que foi salvo com a API fora do ar é enviado quando ela volta', async () => {
  const api = fakeApi(); const db = memory();
  let online = false;
  const fetcher = async (...args) => { if (!online) throw new Error('offline'); return api.fetcher(...args); };
  const r = createRepository({ key: 'w', validate: validWorkout, event: 'test', storage: () => db, remote: { url: 'https://gw.test/api/treinos' }, fetcher });
  await r.pending;
  r.save(workout); await r.pending;
  assert.equal(r.read().length, 1); assert.equal(api.rows.size, 0);       // ficou só no navegador
  online = true; await r.refresh();
  assert.ok(api.rows.has('a'));                                           // reenviado ao voltar
  assert.deepEqual(r.read().map(w => w.id), ['a']);                       // e não foi apagado do cache
});

test('exclusão offline também é reenviada', async () => {
  const api = fakeApi([workout]); const db = memory();
  let online = true;
  const fetcher = async (...args) => { if (!online) throw new Error('offline'); return api.fetcher(...args); };
  const r = createRepository({ key: 'w', validate: validWorkout, event: 'test', storage: () => db, remote: { url: 'https://gw.test/api/treinos' }, fetcher });
  await r.pending; online = false;
  r.remove('a'); await r.pending; assert.equal(api.rows.size, 1);
  online = true; await r.refresh();
  assert.equal(api.rows.size, 0); assert.deepEqual(r.read(), []);
});

test('dados recusados pelo servidor (400) não ficam presos na fila', async () => {
  const db = memory(); let posts = 0;
  const fetcher = async (url, { method = 'GET' } = {}) => { if (method === 'GET') return json([]); posts++; return json({ message: 'nome inválido' }, 400); };
  const r = createRepository({ key: 'w', validate: validWorkout, event: 'test', storage: () => db, remote: { url: 'https://gw.test/api/treinos' }, fetcher });
  await r.pending; r.save(workout); await r.pending; await r.refresh();
  assert.equal(posts, 1);
});

test('API fora do ar não impede salvar localmente', async () => {
  const db = memory();
  const r = createRepository({ key: 'w', validate: validWorkout, event: 'test', storage: () => db, remote: { url: 'https://gw.test/api/treinos' }, fetcher: async () => { throw new Error('ECONNREFUSED'); } });
  await r.pending; r.save(workout); await r.pending;
  assert.equal(r.read()[0].id, 'a');
});

test('resposta inválida do servidor não sobrescreve o cache', async () => {
  const db = memory(); db.setItem('w', JSON.stringify({ version: 1, items: [workout] }));
  const r = createRepository({ key: 'w', validate: validWorkout, event: 'test', storage: () => db, remote: { url: 'https://gw.test/api/treinos' }, fetcher: async () => json([{ id: 'x' }]) });
  await r.pending; assert.deepEqual(r.read(), [workout]);
});
