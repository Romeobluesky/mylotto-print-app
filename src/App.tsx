import { useEffect, useState } from 'react';
import { MainWindow } from './components/MainWindow';
import { SettingsView } from './components/SettingsView';
import { ManualInputView } from './components/ManualInputView';

type Route = 'main' | 'settings' | 'manual-input';

function getRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === '/settings') return 'settings';
  if (hash === '/manual-input') return 'manual-input';
  return 'main';
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => getRoute());

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'settings') return <SettingsView />;
  if (route === 'manual-input') return <ManualInputView />;
  return <MainWindow />;
}
