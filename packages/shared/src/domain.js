export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const MUSCLES = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Abdômen', 'Corpo inteiro'];
export const uuid = () => crypto.randomUUID();
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
export const fullDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
export const validExercise = e => e && text(e.id, 1, 80) && text(e.name, 2, 80) && MUSCLES.includes(e.muscle) && Number.isInteger(e.sets) && number(e.sets, 1, 20) && Number.isInteger(e.reps) && number(e.reps, 1, 100) && number(e.load, 0, 500) && Number.isInteger(e.rest) && number(e.rest, 0, 600);
export const validWorkout = w => w && text(w.id, 1, 80) && text(w.name, 2, 80) && text(w.description, 0, 250) && Array.isArray(w.days) && w.days.length > 0 && w.days.every(d => DAYS.includes(d)) && new Set(w.days).size === w.days.length && Array.isArray(w.exercises) && w.exercises.length > 0 && w.exercises.length <= 30 && w.exercises.every(validExercise) && new Set(w.exercises.map(e => e.id)).size === w.exercises.length;
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !isNaN(parsed) && localDate(parsed) === value;
}
export const validSession = s => s && text(s.id, 1, 80) && text(s.workoutId, 1, 80) && text(s.workoutName, 2, 80) && validDate(s.date) && s.date <= localDate() && Number.isInteger(s.duration) && number(s.duration, 1, 360) && Number.isInteger(s.effort) && number(s.effort, 1, 10) && (s.bodyWeight === null || number(s.bodyWeight, 20, 400)) && text(s.notes, 0, 500);
export const workoutVolume = workout => workout.exercises.reduce((sum, e) => sum + e.sets * e.reps * e.load, 0);
export function weeklyBuckets(sessions, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start); day.setDate(day.getDate() + index);
    const date = localDate(day);
    const rows = sessions.filter(s => s.date === date);
    return { date, label: DAYS[index], count: rows.length, minutes: rows.reduce((sum, s) => sum + s.duration, 0) };
  });
}
export const sortedSessions = sessions => [...sessions].sort((a, b) => b.date.localeCompare(a.date));
