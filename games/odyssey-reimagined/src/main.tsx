import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const App = lazy(() => import("./App"));
const CharacterLab = lazy(() => import("./CharacterLab"));
const isCharacterLab = new URLSearchParams(window.location.search).get("lab") === "character";

const loadingStyle = {
  minHeight: "100svh",
  display: "grid",
  placeItems: "center",
  background: "#06171b",
  color: "#eee1c5",
  font: "500 13px/1.4 system-ui, sans-serif",
  letterSpacing: ".12em",
} as const;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div style={loadingStyle}>LOADING THREE.JS STAGE</div>}>
      {isCharacterLab ? <CharacterLab /> : <App />}
    </Suspense>
  </StrictMode>,
);
