import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import App from "@/App";
import { ThemeProvider } from "@/context/ThemeContext";
import "@/styles/index.css";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt-BR", ptBR);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
