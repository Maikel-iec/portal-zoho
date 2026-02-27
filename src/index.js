import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./output.css";

document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("mi-plugin-root");
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  }
});
