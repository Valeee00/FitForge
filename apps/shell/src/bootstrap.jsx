import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fitforge/shared/styles';
import { Boundary } from '@fitforge/shared/ui';
import App from './App';
createRoot(document.getElementById('root')).render(<Boundary><App/></Boundary>);
