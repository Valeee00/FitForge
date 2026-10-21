import { createRepository, API_URL } from '@fitforge/shared/storage';
import { validWorkout } from '@fitforge/shared/domain';
export const key = 'fitforge.workouts.v1';
export const event = 'fitforge:workouts-updated';
const e = (id, name, muscle, sets, reps, load, rest = 60) => ({ id, name, muscle, sets, reps, load, rest });
const seed = [
 { id: 'template-a', name: 'Treino A · Peito e tríceps', description: 'Ficha de exemplo. Ajuste os exercícios e cargas ao seu plano.', days: ['Seg', 'Qui'], exercises: [e('a1', 'Supino reto', 'Peito', 3, 12, 20, 90), e('a2', 'Supino inclinado com halteres', 'Peito', 3, 12, 10), e('a3', 'Tríceps na polia', 'Braços', 3, 12, 15), e('a4', 'Abdominal no solo', 'Abdômen', 3, 15, 0)] },
 { id: 'template-b', name: 'Treino B · Costas e bíceps', description: 'Ficha de exemplo. Ajuste ao seu plano de treino.', days: ['Ter', 'Sex'], exercises: [e('b1', 'Puxada frontal', 'Costas', 3, 12, 25, 90), e('b2', 'Remada baixa', 'Costas', 3, 12, 20), e('b3', 'Rosca com halteres', 'Braços', 3, 12, 8)] },
 { id: 'template-c', name: 'Treino C · Pernas e ombros', description: 'Ficha de exemplo. Ajuste ao seu plano de treino.', days: ['Qua'], exercises: [e('c1', 'Agachamento livre', 'Pernas', 3, 10, 20, 90), e('c2', 'Leg press', 'Pernas', 3, 12, 40, 90), e('c3', 'Elevação lateral', 'Ombros', 3, 12, 5)] }
];
// Com API_URL definida, as fichas vêm do treinos-service através do API Gateway (/api/treinos).
export const repository = createRepository({ key, event, validate: validWorkout, seed, remote: API_URL ? { url: `${API_URL}/api/treinos` } : null });
export const listWorkouts = repository.read;
