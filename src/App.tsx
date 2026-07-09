import {
  TyphoonListPanel,
  MapContainer,
  TyphoonDataPanel,
  PlaybackBar,
  ImpactPanel,
} from "./components";
import { useTyphoonStore } from "./store/typhoon";

function App() {
  const selectedIds = useTyphoonStore((s) => s.selectedIds);
  const activeTabId = useTyphoonStore((s) => s.activeTabId);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <TyphoonListPanel />
      </aside>
      <main className="map-area">
        <MapContainer selectedIds={selectedIds} activeTabId={activeTabId} />
      </main>
      <aside className="data-sidebar">
        <TyphoonDataPanel />
        <ImpactPanel />
      </aside>
      <PlaybackBar />
    </div>
  );
}

export default App;
