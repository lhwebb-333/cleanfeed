import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./hooks/useTheme";
import App from "./components/App";

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
