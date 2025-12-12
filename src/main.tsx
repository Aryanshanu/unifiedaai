import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize activity logger to capture all fetch calls and console errors
import '@/lib/activity-logger';

createRoot(document.getElementById("root")!).render(<App />);
