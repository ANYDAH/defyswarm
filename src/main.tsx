import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  document.documentElement.dataset.theme = localStorage.getItem('defyswarm-theme') === 'dark' ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

createRoot(document.getElementById('root')!).render(<App />);
