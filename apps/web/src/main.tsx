import '@fontsource/bowlby-one/400.css';
import '@fontsource-variable/archivo/index.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/shantell-sans/500.css';
import '@fontsource/shantell-sans/700.css';
import '@pin-thirteen/design-system/paper.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistence } from './persistence';
import { useApp } from './store';

void requestPersistence();
void useApp.getState().init();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
