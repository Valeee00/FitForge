import test from 'node:test';
import assert from 'node:assert/strict';
import { validWorkout, validSession, validDate, weeklyBuckets, localDate, workoutVolume } from '../packages/shared/src/domain.js';
import { createRepository } from '../packages/shared/src/storage.js';
const workout = { id: 'a', name: 'Superior', description: '', days: ['Seg'], exercises: [{ id: 'e', name: 'Supino', muscle: 'Peito', sets: 3, reps: 12, load: 20, rest: 90 }] };
const session = { id: 's', workoutId: 'a', workoutName: 'Superior', date: '2024-01-10', duration: 45, effort: 7, bodyWeight: null, notes: '' };
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };
test('validates complete workout and rejects empty/duplicate/invalid exercise data', () => {
 assert.equal(validWorkout(workout), true);
 for (const patch of [{ days: [] }, { days: ['Seg', 'Seg'] }, { exercises: [] }, { name: ' ' }, { exercises: [{ ...workout.exercises[0], load: -1 }] }, { exercises: [{ ...workout.exercises[0], reps: 3.5 }] }, { exercises: [{ ...workout.exercises[0], sets: Infinity }] }]) assert.equal(validWorkout({ ...workout, ...patch }), false);
 assert.equal(workoutVolume(workout), 720);
});
test('validates session and rejects future dates and invalid measurements', () => {
 assert.equal(validSession(session), true);
 for (const patch of [{ date: '2999-01-01' }, { date: '2024-02-30' }, { duration: 0 }, { effort: 11 }, { bodyWeight: 0 }, { duration: 2.5 }, { notes: 'x'.repeat(501) }]) assert.equal(validSession({ ...session, ...patch }), false);
});
test('calendar dates include leap year correctness', () => {
 assert.equal(validDate('2024-02-29'), true); assert.equal(validDate('2025-02-29'), false); assert.equal(validDate('2024-13-01'), false); assert.equal(validDate('x'), false);
});
test('week starts Monday, groups multiple sessions and crosses year boundary', () => {
 const rows = [{ ...session, date: '2024-12-30', duration: 30 }, { ...session, id: 's2', date: '2024-12-30', duration: 50 }, { ...session, id: 's3', date: '2025-01-05', duration: 60 }, { ...session, id: 's4', date: '2024-12-29', duration: 60 }];
 const week = weeklyBuckets(rows, new Date(2025, 0, 5));
 assert.equal(week.length, 7); assert.equal(week[0].date, '2024-12-30'); assert.equal(week[0].count, 2); assert.equal(week[0].minutes, 80); assert.equal(week[6].date, '2025-01-05'); assert.equal(week[6].minutes, 60);
 assert.equal(localDate(new Date(2024, 0, 1)), '2024-01-01');
});
test('repository CRUD persists edits, preserves deletion and separates domains', () => {
 const db = memory(); const opts = { key: 'workouts', seed: [workout], validate: validWorkout, event: 'test', storage: () => db };
 const r = createRepository(opts); assert.deepEqual(r.read(), [workout]);
 r.save({ ...workout, name: 'Editado' }); assert.equal(createRepository(opts).read()[0].name, 'Editado');
 r.save({ ...workout, id: 'b' }); assert.equal(r.read().length, 2); r.remove('a'); assert.equal(r.read()[0].id, 'b'); r.remove('b'); assert.deepEqual(createRepository(opts).read(), []);
 const s = createRepository({ ...opts, key: 'sessions', seed: [], validate: validSession }); s.save(session); assert.equal(s.read().length, 1); assert.equal(r.read().length, 0);
});
test('invalid persisted data is preserved and is never silently overwritten', () => {
 const db = memory(); db.setItem('test', '{invalid'); const r = createRepository({ key: 'test', validate: validWorkout, event: 'test', storage: () => db });
 assert.throws(() => r.read(), /não foram sobrescritos/); assert.throws(() => r.save(workout)); assert.equal(db.getItem('test'), '{invalid');
});
test('storage quota and invalid mutations do not report a successful save', () => {
 const db = memory(); const r = createRepository({ key: 'test', seed: [workout], validate: validWorkout, event: 'test', storage: () => db });
 assert.throws(() => r.save({ ...workout, days: [] }), /Dados inválidos/); assert.equal(db.getItem('test'), null);
 const blocked = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
 assert.throws(() => createRepository({ key: 'x', validate: validWorkout, storage: () => blocked }).save(workout), /sem espaço/);
});
