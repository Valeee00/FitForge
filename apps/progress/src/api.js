import { createRepository, API_URL } from '@fitforge/shared/storage';
import { validSession } from '@fitforge/shared/domain';
export const key = 'fitforge.sessions.v1';
export const event = 'fitforge:sessions-updated';
// Com API_URL definida, as sessões vêm do progresso-service através do API Gateway (/api/sessoes).
export const repository = createRepository({ key, event, validate: validSession, remote: API_URL ? { url: `${API_URL}/api/sessoes` } : null });
export const listSessions = repository.read;
