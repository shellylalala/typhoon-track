import { TyphoonListPanel } from "./components";

const App = () => {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <TyphoonListPanel />
      </aside>
      <main className="map-area">
        {/* Phase 3 放地图 */}
        <div style={{ padding: 40, color: "#888" }}>
          地图区域 — 已选台风数量将在 Phase 3-5 渲染
        </div>
      </main>
    </div>
  );
};
export default App;
