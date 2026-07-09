import { MapContainer, TyphoonListPanel } from "./components";

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <TyphoonListPanel />
      </aside>
      <main className="map-area">
        <MapContainer />
      </main>
    </div>
  );
}

export default App;
