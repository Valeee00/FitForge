import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fitforge/shared/styles';
import { Boundary } from '@fitforge/shared/ui';
import App from './App';
// Standalone mode is intentionally isolated; pass workouts from the host for creation.
createRoot(document.getElementById('root')).render(<div className="standalone"><a className="standalone-back" href="http://localhost:5000">← Abrir aplicativo completo</a><Boundary><App /></Boundary></div>);
