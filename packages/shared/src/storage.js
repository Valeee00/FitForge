/**
 * Per-domain repository. Writes are atomic: listeners see only persisted data.
 *
 * Sem `remote`: funciona 100% local (localStorage), como na Atividade 13.
 * Com `remote` (URL do API Gateway): o localStorage vira um cache. A leitura
 * continua síncrona para as telas; em segundo plano o repositório busca a
 * lista no backend e envia cada gravação/exclusão ao microsserviço pelo
 * gateway. Se a API estiver fora do ar, o app segue funcionando localmente.
 */
export const API_STATUS_EVENT = 'fitforge:api-status';

export function createRepository({ key, seed = [], validate, event, storage = () => window.localStorage, remote = null, fetcher = (...args) => globalThis.fetch(...args) }) {
  const read = () => {
    let raw;
    try { raw = storage().getItem(key); } catch { throw new Error('O navegador bloqueou o armazenamento local. Permita-o para salvar seus dados.'); }
    if (raw === null) return structuredClone(seed);
    try {
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.items) || !data.items.every(validate)) throw new Error();
      const ids = data.items.map(item => item.id);
      if (new Set(ids).size !== ids.length) throw new Error();
      return data.items;
    } catch { throw new Error('Os dados salvos estão em formato inválido. Exporte ou revise o armazenamento pelo navegador antes de continuar. Seus dados não foram sobrescritos.'); }
  };
  const write = items => {
    if (!items.every(validate)) throw new Error('Dados inválidos. Revise os campos antes de salvar.');
    try { storage().setItem(key, JSON.stringify({ version: 1, items })); }
    catch { throw new Error('Não foi possível salvar. O armazenamento está bloqueado ou sem espaço.'); }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(event));
    return items;
  };

  // ---------------------------------------------------------------- remoto
  // Operações que ainda não chegaram ao servidor (ex.: feitas com a API fora do ar).
  const pendingKey = `${key}.pendentes`;
  const readPending = () => { try { const p = JSON.parse(storage().getItem(pendingKey)); return { upserts: Array.isArray(p?.upserts) ? p.upserts : [], deletes: Array.isArray(p?.deletes) ? p.deletes : [] }; } catch { return { upserts: [], deletes: [] }; } };
  const writePending = p => { try { storage().setItem(pendingKey, JSON.stringify(p)); } catch { /* cache cheio: segue sem fila */ } };
  const mark = (id, op) => { const p = readPending(); p.upserts = p.upserts.filter(x => x !== id); p.deletes = p.deletes.filter(x => x !== id); if (op) p[op].push(id); writePending(p); };

  const status = (online, message = '') => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(API_STATUS_EVENT, { detail: { key, online, message } }));
  };
  const request = (method, path = '', body) => fetcher(`${remote.url}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const failure = async (response, fallback) => {
    try { const data = await response.json(); return data.message || fallback; } catch { return fallback; }
  };
  /** POST se for novo, PUT se já existir — com correção automática (404 → POST, 409 → PUT). */
  const sendUpsert = async (item, isNew) => {
    const path = `/${encodeURIComponent(item.id)}`;
    let response = await request(isNew ? 'POST' : 'PUT', isNew ? '' : path, item);
    if (!isNew && response.status === 404) response = await request('POST', '', item);
    else if (isNew && response.status === 409) response = await request('PUT', path, item);
    if (!response.ok) {
      const message = await failure(response, `HTTP ${response.status}`);
      // 4xx = o servidor recusou os dados: não adianta reenviar depois
      throw Object.assign(new Error(message), { rejected: response.status >= 400 && response.status < 500 });
    }
  };
  const sendDelete = async id => {
    const response = await request('DELETE', `/${encodeURIComponent(id)}`);
    if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
  };
  /** Reenvia o que ficou pendente. Lança erro se o servidor continuar inacessível. */
  const flush = async () => {
    const pending = readPending(); if (!pending.upserts.length && !pending.deletes.length) return;
    const local = read();
    for (const id of pending.deletes) { await sendDelete(id); mark(id, null); }
    for (const id of pending.upserts) {
      const item = local.find(row => row.id === id);
      if (item) {
        try { await sendUpsert(item, false); }
        catch (error) { if (!error.rejected) throw error; }
      }
      mark(id, null);
    }
  };
  /** Sincroniza: envia pendências e baixa a lista do servidor (fonte da verdade). */
  const refresh = async () => {
    if (!remote) return null;
    try {
      await flush();
      const response = await request('GET');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = await response.json();
      if (!Array.isArray(items) || !items.every(validate)) throw new Error('resposta em formato inválido');
      write(items);
      status(true);
      return items;
    } catch (error) {
      status(false, `Servidor indisponível (${error.message}). Usando os dados deste navegador.`);
      return null;
    }
  };
  const pushSave = async (item, isNew) => {
    try { await sendUpsert(item, isNew); mark(item.id, null); status(true); await refresh(); }
    catch (error) {
      if (error.rejected) { mark(item.id, null); status(true, `O servidor recusou a gravação: ${error.message}`); }
      else status(false, `Salvo só neste navegador; será enviado quando o servidor voltar. (${error.message})`);
    }
  };
  const pushRemove = async id => {
    try { await sendDelete(id); mark(id, null); status(true); await refresh(); }
    catch (error) { status(false, `Exclusão feita neste navegador; será enviada quando o servidor voltar. (${error.message})`); }
  };

  // Encadeia as sincronizações para que nunca rodem duas ao mesmo tempo
  let chain = Promise.resolve();
  const enqueue = job => (chain = chain.then(job, job));

  const repository = {
    read,
    remote: Boolean(remote),
    refresh: () => (remote ? enqueue(refresh) : Promise.resolve(null)),
    save(item) {
      const items = read(); const index = items.findIndex(row => row.id === item.id);
      if (index < 0) items.unshift(item); else items[index] = item;
      const result = write(items);
      if (remote) { mark(item.id, 'upserts'); repository.pending = enqueue(() => pushSave(item, index < 0)); }
      return result;
    },
    remove(id) {
      const result = write(read().filter(row => row.id !== id));
      if (remote) { mark(id, 'deletes'); repository.pending = enqueue(() => pushRemove(id)); }
      return result;
    },
    pending: Promise.resolve()
  };
  if (remote) repository.pending = enqueue(refresh);
  return repository;
}

/** URL do API Gateway definida no build (variável FITFORGE_API_URL). Vazia = modo local. */
export const API_URL = (typeof __FITFORGE_API_URL__ !== 'undefined' ? __FITFORGE_API_URL__ : '').replace(/\/+$/, '');
