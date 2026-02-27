import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiWP, TOKEN } from '../util/proyect-config';

const REQUEST_TIMEOUT = 4000; // 4 segundos
const RELOAD_DELAY = 1500;    // 1.5 segundos

const PLUGIN_VERSION = process.env.PLUGIN_VERSION; // Obtiene PLUGIN_VERSION de las variables de entorno
/**
 * Componente de orden superior (HOC) que actúa como una barrera de protección.
 * Detecta si la versión del plugin (frontend) es diferente a la versión del servidor (backend).
 * Si hay una discrepancia, bloquea la interfaz de usuario y muestra un mensaje de error
 * que instruye al usuario a limpiar la caché del navegador.
 * 
 * Este enfoque es crucial para evitar errores causados por código desactualizado en el navegador
 * del usuario después de una actualización del servidor.
 * 
 * El diseño es completamente responsive, por lo que funciona y se visualiza correctamente
 * tanto en dispositivos de escritorio como en móviles.
 * 
**/
export default function VersionMismatchDetector({ children }) {
  // --- ESTADOS ---
  const [isMismatch, setIsMismatch] = useState(false);
  const [serverVersion, setServerVersion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  // Detecta si el usuario está en un dispositivo móvil para mostrar instrucciones adecuadas.
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    // --- PASO 1: Iniciar la verificación de la versión al montar el componente ---
    const fetchServerVersion = async () => {
      // If PLUGIN_VERSION is not set at build time, don't block the UI — just warn.
      if (!PLUGIN_VERSION) {
        console.warn("PLUGIN_VERSION is not defined at build time. Version mismatch detector will be skipped.");
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        // Construcción de cabeceras simplificada y más robusta.
        // Se eliminó el encabezado 'Cache-Control' para evitar problemas de preflight de CORS durante el desarrollo.
        const headers = {};

        const tokenKey = Object.keys(TOKEN || {})[0];
        if (tokenKey) headers[tokenKey] = TOKEN[tokenKey];

        // Añadimos un parámetro de timestamp a la URL para evitar que el navegador cachee la respuesta de la API.
        const cacheBustingUrl = `${apiWP}/version?t=${new Date().getTime()}`;
        const response = await axios.get(cacheBustingUrl, { 
          headers, 
          signal: controller.signal 
        });
        const fetchedServerVersion = response?.data?.version;
        setServerVersion(fetchedServerVersion || null);

        // console.log('URL usada para la verificación de versión:', cacheBustingUrl);
          // console.log('Bienvenid@ a Centro de Pagos', PLUGIN_VERSION)
        // console.log('--- ANÁLISIS DEL DETECTOR DE VERSIÓN ---');
        // console.log(`Versión del Frontend (cargada en el navegador): '${PLUGIN_VERSION}'`);
        // console.log(`Versión del Backend (obtenida de la API): '${fetchedServerVersion}'`);
        // console.log('¿Son diferentes?:', fetchedServerVersion !== PLUGIN_VERSION);


        // Comparamos las versiones.
        if (fetchedServerVersion && fetchedServerVersion !== PLUGIN_VERSION) {
          console.error('¡Discrepancia de versiones detectada! Mostrando pantalla de "Aplicando actualizaciones..."');
          setIsMismatch(true);
        }
        setFetchFailed(false);

      } catch (err) {
        const message = err.name === 'CanceledError'
          ? 'La solicitud para verificar la versión tardó demasiado en responder (timeout).'
          : 'No se pudo verificar la versión del servidor. Esto podría indicar un problema de conexión.';
        console.error('Error fetching server version:', message, err);
        setError(message);
        setFetchFailed(true);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };

    fetchServerVersion();
    // cleanup
    return () => {};

  }, []);

  // Este useEffect debe estar aquí, antes de cualquier retorno condicional,
  // para cumplir con las Reglas de los Hooks de React.
  useEffect(() => {
    if (isMismatch) {
      // Se espera un breve momento (1.5 segundos) para que el usuario pueda leer el mensaje
      // antes de que la página se recargue automáticamente.

      // Forzar la recarga con un parámetro de cache-busting en la URL.
      // Esto es más robusto contra cachés agresivas de servidor/CDN/plugins.
      const timer = setTimeout(() => {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('force_reload', `_${new Date().getTime()}`); // Añade un timestamp único
          window.location.href = url.toString();
        } catch (e) {
          // Si todo falla, recurrimos al reload simple.
          window.location.reload(true);
        }
      }, RELOAD_DELAY); // Damos un tiempo para que el usuario vea el mensaje.

      return () => clearTimeout(timer); // Limpieza del temporizador.
    }
  }, [isMismatch]); // Este efecto se ejecuta solo cuando 'isMismatch' cambia a 'true'.

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-25 flex items-center justify-center z-50">
        <div className="loading loading-spinner loading-lg text-black"></div>
        <p className="text-black ml-4">Verificando versiones del sistema...</p>
      </div>
    );
  }

  if (isMismatch) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-25 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-box shadow-xl text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-sl-pink-500 mb-4">Aplicando actualizaciones...</h2>
          <p className="text-black mb-6">Hemos mejorado nuestro sistema. La página se actualizará automáticamente en un momento.</p>
          <span className="loading loading-spinner loading-lg text-sl-pink-500"></span>
        </div>
      </div>
    );
  }

  if (error) {
    // Si hubo un error al obtener la versión pero no se decidió bloquear la app,
    // se muestra una advertencia en la consola para los desarrolladores y un pequeño banner no bloqueante.
    console.warn("La verificación de la versión encontró un error, continuando sin bloquear:", error);
  }

  // If fetch failed, show a small non-blocking retry overlay so admins can retry without blocking users.
  if (fetchFailed && !isMismatch) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="p-3 rounded shadow bg-yellow-600 text-white">
          <div className="text-sm">No se pudo verificar la versión del servidor.</div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-sm bg-white text-black border-none px-3 py-1 rounded"
            >
              Reintentar
            </button>
            <button
              onClick={() => setFetchFailed(false)}
              className="btn btn-sm bg-transparent text-white border-white px-3 py-1 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay discrepancia de versión, se renderizan los componentes hijos (el resto de la aplicación).
  return children;
}
