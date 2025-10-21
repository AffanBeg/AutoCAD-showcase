import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { AppLayout } from './App';
import { HomePage } from './pages/HomePage';
import { CreateShowcasePage } from './pages/CreateShowcasePage';
import { ShowcasePage } from './pages/ShowcasePage';
import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/create" element={<CreateShowcasePage />} />
            <Route path="/s/:slug" element={<ShowcasePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
