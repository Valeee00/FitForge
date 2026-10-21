import React, { useEffect, useState } from 'react';
import { Search, Pencil, Trash2, Copy, Play, ChevronDown, ChevronUp, Clock3, Dumbbell } from 'lucide-react';
import { PageHeader, Button, Plus, Empty, Notice, Modal, Field, Confirm } from '@fitforge/shared/ui';
import { DAYS, MUSCLES, uuid, workoutVolume } from '@fitforge/shared/domain';
import { repository, key, event } from './api';
const blankExercise = () => ({ id: uuid(), name: '', muscle: 'Peito', sets: 3, reps: 12, load: 0, rest: 60 });
const blankWorkout = () => ({ id: uuid(), name: '', description: '', days: ['Seg'], exercises: [blankExercise()] });

function WorkoutForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(() => structuredClone(initial));
  const [error, setError] = useState('');
  const change = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const changeExercise = (id, field, value) => setForm(f => ({ ...f, exercises: f.exercises.map(e => e.id === id ? { ...e, [field]: value } : e) }));
  const submit = e => { e.preventDefault(); setError(''); try { if (!form.days.length) throw new Error('Selecione pelo menos um dia da semana.'); onSave({ ...form, name: form.name.trim(), description: form.description.trim(), exercises: form.exercises.map(e => ({ ...e, name: e.name.trim() })) }); } catch (err) { setError(err.message); } };
  return <Modal title={initial.name ? 'Editar ficha de treino' : 'Nova ficha de treino'} wide onClose={onClose}><form onSubmit={submit}>
    <Notice error>{error}</Notice>
    <div className="form-grid"><Field label="Nome da ficha"><input autoFocus required minLength={2} maxLength={80} placeholder="Ex.: Treino A · Superior" value={form.name} onChange={e => change('name', e.target.value)}/></Field><Field label="Descrição (opcional)"><input maxLength={250} placeholder="Objetivo ou observação" value={form.description} onChange={e => change('description', e.target.value)}/></Field></div>
    <fieldset className="day-field"><legend>Dias de treino</legend><div className="day-picker">{DAYS.map(day => <label key={day} className={form.days.includes(day) ? 'selected' : ''}><input type="checkbox" checked={form.days.includes(day)} onChange={() => change('days', form.days.includes(day) ? form.days.filter(d => d !== day) : [...form.days, day])}/>{day}</label>)}</div></fieldset>
    <div className="section-line"><h3>Exercícios <span className="muted">({form.exercises.length}/30)</span></h3><span className="muted small">Carga por equipamento ou halter</span></div>
    <div className="exercise-edit-list">{form.exercises.map((exercise, index) => <div className="exercise-editor" key={exercise.id}><div className="section-line"><span className="eyebrow">EXERCÍCIO {String(index + 1).padStart(2, '0')}</span><button type="button" className="icon-btn" aria-label={`Remover exercício ${index + 1}`} disabled={form.exercises.length === 1} onClick={() => change('exercises', form.exercises.filter(e => e.id !== exercise.id))}><Trash2 size={16}/></button></div>
      <div className="form-grid"><Field label="Exercício"><input required minLength={2} maxLength={80} placeholder="Nome do exercício" value={exercise.name} onChange={e => changeExercise(exercise.id, 'name', e.target.value)}/></Field><Field label="Grupo muscular"><select value={exercise.muscle} onChange={e => changeExercise(exercise.id, 'muscle', e.target.value)}>{MUSCLES.map(m => <option key={m}>{m}</option>)}</select></Field></div>
      <div className="form-grid four">{[['sets', 'Séries', 1, 20, 1], ['reps', 'Repetições', 1, 100, 1], ['load', 'Carga (kg)', 0, 500, 0.5], ['rest', 'Descanso (s)', 0, 600, 1]].map(([field, label, min, max, step]) => <Field key={field} label={label}><input type="number" required min={min} max={max} step={step} value={exercise[field]} onChange={e => changeExercise(exercise.id, field, e.target.value === '' ? '' : Number(e.target.value))}/></Field>)}</div>
    </div>)}</div>
    <Button type="button" variant="secondary" disabled={form.exercises.length >= 30} onClick={() => change('exercises', [...form.exercises, blankExercise()])}><Plus size={16}/>Adicionar exercício</Button>
    <div className="form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Salvar ficha</Button></div>
  </form></Modal>;
}
function WorkoutCard({ workout, onEdit, onDelete, onCopy, onStart }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="panel workout-card"><div className="workout-card-head"><span className="workout-icon"><Dumbbell size={24}/></span><div className="card-tools"><button className="icon-btn" aria-label={`Duplicar ${workout.name}`} title="Duplicar ficha" onClick={onCopy}><Copy size={17}/></button><button className="icon-btn" aria-label={`Editar ${workout.name}`} title="Editar ficha" onClick={onEdit}><Pencil size={17}/></button><button className="icon-btn delete" aria-label={`Excluir ${workout.name}`} title="Excluir ficha" onClick={onDelete}><Trash2 size={17}/></button></div></div>
    <h2>{workout.name}</h2><p className="muted card-description">{workout.description || 'Sua ficha personalizada.'}</p><div className="tags">{DAYS.filter(d => workout.days.includes(d)).map(day => <span className="tag" key={day}>{day}</span>)}</div>
    <div className="workout-meta"><span><Dumbbell size={15}/>{workout.exercises.length} exercícios</span><span><Clock3 size={15}/>{workout.exercises.reduce((n, e) => n + e.sets, 0)} séries</span></div>
    <button className="expand-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Ocultar exercícios' : 'Ver exercícios'}{expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>
    {expanded && <div className="exercise-detail">{workout.exercises.map((e, i) => <div className="exercise-detail-row" key={e.id}><span className="exercise-number">{String(i + 1).padStart(2, '0')}</span><div><strong>{e.name}</strong><small>{e.muscle} · {e.rest}s de descanso</small></div><span>{e.sets} × {e.reps}<small>{e.load ? `${e.load} kg` : 'Sem carga'}</small></span></div>)}<p className="muted small">Volume planejado: {workoutVolume(workout).toLocaleString('pt-BR')} kg × repetições. Cargas não somam automaticamente os dois halteres.</p></div>}
    {onStart && <Button variant="secondary" className="full" onClick={onStart}><Play size={16}/>Registrar sessão</Button>}
  </article>;
}
export default function WorkoutApp({ onStart }) {
  const [workouts, setWorkouts] = useState([]); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''); const [day, setDay] = useState('Todos'); const [editor, setEditor] = useState(null); const [deleting, setDeleting] = useState(null);
  const load = () => { try { setWorkouts(repository.read()); setError(''); } catch (err) { setError(err.message); } };
  useEffect(() => { load(); const sync = e => { if (e.type !== 'storage' || e.key === key) load(); }; window.addEventListener(event, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(event, sync); window.removeEventListener('storage', sync); }; }, []);
  const save = item => { repository.save(item); setEditor(null); setNotice('Ficha salva. Bom treino!'); load(); };
  const remove = () => { try { repository.remove(deleting.id); setDeleting(null); setNotice('Ficha excluída. Sessões anteriores foram preservadas.'); load(); } catch (err) { setDeleting(null); setError(err.message); } };
  const filtered = workouts.filter(w => w.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) && (day === 'Todos' || w.days.includes(day)));
  return <><PageHeader eyebrow="PLANEJAMENTO" title="Meus treinos" description="Seu plano, do primeiro ao último exercício." action={<Button onClick={() => setEditor(blankWorkout())}><Plus size={18}/>Nova ficha</Button>}/><Notice error>{error}</Notice><Notice>{notice}</Notice>
    <div className="toolbar"><div className="search"><Search size={18}/><input aria-label="Buscar fichas" placeholder="Buscar treino pelo nome..." value={query} onChange={e => setQuery(e.target.value)}/></div><select aria-label="Filtrar por dia" value={day} onChange={e => setDay(e.target.value)}>{['Todos', ...DAYS].map(d => <option key={d} value={d}>{d === 'Todos' ? 'Todos os dias' : d}</option>)}</select><span className="muted small">{filtered.length} {filtered.length === 1 ? 'ficha' : 'fichas'}</span></div>
    {filtered.length ? <div className="workout-grid">{filtered.map(w => <WorkoutCard key={w.id} workout={w} onEdit={() => setEditor(w)} onDelete={() => setDeleting(w)} onCopy={() => setEditor({ ...structuredClone(w), id: uuid(), name: `${w.name.slice(0, 70)} (cópia)`, exercises: w.exercises.map(e => ({ ...e, id: uuid() })) })} onStart={onStart ? () => onStart(w.id) : null}/>)}</div> : <Empty title={workouts.length ? 'Nenhuma ficha encontrada' : 'Monte seu primeiro treino'} description={workouts.length ? 'Tente outro nome ou dia da semana.' : 'Crie uma ficha e adicione os exercícios do seu plano.'} action={<Button onClick={() => setEditor(blankWorkout())}><Plus size={16}/>Criar ficha</Button>}/>}
    <p className="footnote">As fichas iniciais são exemplos editáveis. {repository.remote ? 'Os registros são salvos no servidor (API Gateway) e ficam em cache neste navegador.' : 'Os registros ficam salvos neste navegador.'}</p>
    {editor && <WorkoutForm initial={editor} onClose={() => setEditor(null)} onSave={save}/>} {deleting && <Confirm title="Excluir ficha?" onClose={() => setDeleting(null)} onConfirm={remove}>A ficha “{deleting.name}” será removida. As sessões já registradas continuarão no histórico.</Confirm>}
  </>;
}
