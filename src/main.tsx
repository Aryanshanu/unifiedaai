import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize structured logger to capture all fetch calls, errors, navigation, and performance
import '@/lib/structured-logger';

createRoot(document.getElementById("root")!).render(<App />);
