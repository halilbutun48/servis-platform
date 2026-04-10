import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { SessionProvider } from "./state/sessionProvider";

createRoot(document.getElementById("root")).render(
  <SessionProvider>
    <App />
  </SessionProvider>
);