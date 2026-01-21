import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// i18n (language picker)
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);
