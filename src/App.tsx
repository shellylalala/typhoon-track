import { MapContainer, TyphoonListPanel } from "./components";

import { useTyphoonStore } from "./store/typhoon";

function App() {
  const selectedIds = useTyphoonStore((s) => s.selectedIds);
  const firstId = selectedIds.values().next().value ?? null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <TyphoonListPanel />
      </aside>
      <main className="map-area">
        <MapContainer typhoonId={firstId} />
      </main>
    </div>
  );
}

export default App;
