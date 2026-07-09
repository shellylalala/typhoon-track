import { TyphoonListPanel, MapContainer, TyphoonDataPanel } from "./components";
import { useTyphoonStore } from "./store/typhoon";

function App() {
  const selectedIds = useTyphoonStore((s) => s.selectedIds);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <TyphoonListPanel />
      </aside>
      <main className="map-area">
        <MapContainer selectedIds={selectedIds} />
      </main>
      <aside className="data-sidebar">
        <TyphoonDataPanel />
      </aside>
    </div>
  );
}

export default App;
