import { useEffect, useState } from 'react';
import { MainWindow } from './components/MainWindow';
import { SettingsView } from './components/SettingsView';

function getRoute(): 'main' | 'settings' {
  const hash = window.location.hash.replace(/^#/, '');
  return hash === '/settings' ? 'settings' : 'main';
}

export default function App() {
  const [route, setRoute] = useState<'main' | 'settings'>(() => getRoute());

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return route === 'settings' ? <SettingsView /> : <MainWindow />;
}
