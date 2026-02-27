import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from "axios";
import { apiWP, TOKEN } from '../util/proyect-config';

export default function InvoiceDetailsModal({ isOpen, onClose, data }) {
  const [invoices, setInvoices] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState(null);
  const [customerType, setCustomerType] = useState('unknown'); // 'unknown', 'zoho', 'wispro'

  const fetchInvoiceDetails = useCallback(async () => {
    if (!data) {
      return;
    }

    setIsLoading(true);
    setError(null); // Limpiar errores anteriores al iniciar la búsqueda

    // --- Lógica para 'firstime=true' (datos de Wispro) ---
    if (data.firstime === 'true') {
      const storedWisproInvoices = sessionStorage.getItem('allFirstTimeInvoices');
      if (storedWisproInvoices) {
        try {
          setCustomerType('wispro');
          const wisproInvoices = JSON.parse(storedWisproInvoices);
          setInvoices(wisproInvoices);
          setIsLoading(false); // Detenemos la carga aquí
          return; // <-- ¡CORRECCIÓN CLAVE! Detiene la ejecución para no pasar a la lógica de Zoho.
        } catch (e) {
          console.error("Error parsing Wispro invoices from sessionStorage:", e);
          // Improvement 1: Inform user about corrupted cached data
          setError("Los datos almacenados localmente para Wispro están corruptos. Intentando obtener información fresca.");
          // If sessionStorage is the ONLY source for firstime=true, then we should set isLoading(false) and return.
          // Assuming for now that there's no API fallback for firstime=true if sessionStorage fails.
          setIsLoading(false);
          return;
        }
      } else {
        // Improvement: If no stored Wispro invoices, show a message.
        setError("No se encontraron facturas Wispro almacenadas localmente.");
        setIsLoading(false);
        return;
      }
    }

    // --- Lógica para clientes existentes (Zoho) ---
    // 1. Intentar cargar desde sessionStorage
    const storedInvoices = sessionStorage.getItem('invoices');
    if (storedInvoices) {
      try {
        const cachedInvoices = JSON.parse(storedInvoices);
        const cachedTotal = cachedInvoices.reduce((acc, inv) => acc + inv.balance, 0);
        const currentMonto = data.monto ? parseFloat(data.monto.replace(',', '.')) : null;

        // --- INICIO DE LA CORRECCIÓN ---
        // Comparamos el total cacheado con el monto actual en la URL.
        // Si no coinciden, los datos de sessionStorage están obsoletos y no los usamos.
        if (currentMonto !== null && cachedTotal.toFixed(2) === currentMonto.toFixed(2)) {
          const storedUserData = sessionStorage.getItem('userData');
          if (storedUserData) {
            setCustomerType('zoho');
            setInvoices(cachedInvoices);
            setUserData(JSON.parse(storedUserData));
            setIsLoading(false);
            return; // Los datos son consistentes, los usamos.
          }
        }
        // Si los montos no coinciden o falta userData, dejamos que el flujo continúe para buscar datos frescos.
        // --- FIN DE LA CORRECCIÓN ---

      } catch (e) {
        console.error("Error al procesar datos de sessionStorage:", e);
        // Improvement 1: Inform user about corrupted cached data
        setError("Los datos almacenados localmente están corruptos o desactualizados. Intentando obtener información fresca.");
      }
    }

    // 2. Si no, buscar en la API
    // --- INICIO DE LA CORRECCIÓN ---
    // Hacemos la búsqueda del identificador más robusta, igual que en PaymentForm.
    let searchType = null;
    let searchValue = null;

    if (data.sub || data.suscriptor) {
      searchType = 'clid';
      searchValue = data.sub || data.suscriptor;
    } else if (data.email) {
      searchType = 'email';
      searchValue = data.email;
    } else if (data.documento) {
      searchType = 'document';
      searchValue = data.documento;
    }

    if (!searchValue) {
      console.warn("No se puede buscar detalles: falta un identificador (sub, suscriptor, email, documento, client_id).");
      setIsLoading(false);
      // Improvement 4: Specific user-facing error for missing identifier
      setError("No se pudo encontrar información de cliente. Faltan datos de identificación.");
      return;
    }
    // --- FIN DE LA CORRECCIÓN ---

    try {
      const tokenKey = Object.keys(TOKEN)[0];
      const tokenValue = TOKEN[tokenKey];
      const response = await axios.post(
        `${apiWP}/zoho/contact`,
        { type: searchType, value: searchValue }, // Usamos los valores encontrados
        { headers: { [tokenKey]: tokenValue } }
      );

      if (response.data.exists) {
        setCustomerType('zoho');
        setUserData(response.data.userData);
        // Filtrar facturas para excluir las anuladas ('void') ---
        const validInvoices = response.data.invoices.filter(inv => inv.balance > 0 && inv.status !== 'void');
        setInvoices(validInvoices);
        // Actualizamos sessionStorage con los datos frescos que acabamos de obtener.
        sessionStorage.setItem('invoices', JSON.stringify(response.data.invoices));
        sessionStorage.setItem('userData', JSON.stringify(response.data.userData));
      } else {
        // Improvement: Handle case where API returns exists: false
        setError("No se encontraron facturas pendientes para el cliente con los datos proporcionados.");
      }
    } catch (err) {
      console.error("Error al buscar detalles de facturas desde la API:", err);
      // Improvement 2: More specific API error messages
      let userErrorMessage = "No se pudieron cargar los detalles. Por favor, intente de nuevo más tarde.";
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (err.response.status === 404) {
            userErrorMessage = "No se encontraron facturas para el cliente con los datos proporcionados.";
          } else if (err.response.status === 401 || err.response.status === 403) {
            userErrorMessage = "Error de autenticación o permisos. Por favor, contacte a soporte.";
          } else {
            userErrorMessage = `Error del servidor (${err.response.status}). Por favor, intente de nuevo más tarde.`;
          }
        } else if (err.request) {
          // The request was made but no response was received
          userErrorMessage = "No se pudo conectar con el servidor. Verifique su conexión a internet.";
        } else {
          // Something happened in setting up the request that triggered an Error
          userErrorMessage = "Error al configurar la solicitud. Por favor, contacte a soporte.";
        }
      }
      setError(userErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (isOpen) {
      fetchInvoiceDetails();
      // Inicia la animación de entrada
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else if (!isOpen && (invoices.length > 0 || userData || error)) { 
      // Resetea la animación al cerrar
      setIsAnimating(false);
      // Limpiar datos al cerrar para que se vuelvan a cargar la próxima vez
      setInvoices([]);
      setUserData(null);
      setError(null);
      setCustomerType('unknown');
    }
  }, [isOpen, fetchInvoiceDetails]);

  // Efecto para cerrar el modal con la tecla "Escape"
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Limpia el event listener cuando el componente se desmonta o el modal se cierra
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const statusConfig = {
    overdue: { text: 'Vencida', className: 'badge-error' },
    partially_paid: { text: 'Pago Parcial', className: 'badge-warning' },
    sent: { text: 'Enviada', className: 'badge-info' },
    open: { text: 'Abierta', className: 'badge-info' },
    unpaid: { text: 'No Pagada', className: 'badge-secondary' },
    default: { text: 'Pendiente', className: 'badge-ghost' }
  };
    const formatDisplayDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') {
      return 'N/A';
    }
    // La fecha viene como YYYY-MM-DD, la convertimos a DD/MM/YYYY
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString; // Devolver original si el formato no es el esperado
  };

  const InvoiceAccordionItem = ({ invoice }) => {
    const isExpanded = openInvoiceId === invoice.invoice_id;
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState('0px');

    useEffect(() => {
      if (isExpanded && contentRef.current) {
        // Establece max-height a scrollHeight para permitir una transición suave a la altura completa
        setContentHeight(`${contentRef.current.scrollHeight}px`);
      } else {
        setContentHeight('0px');
      }
    }, [isExpanded, invoice]); // Recalcula si los datos de la factura cambian

    const handleToggle = () => {
      setOpenInvoiceId(isExpanded ? null : invoice.invoice_id);
    };

    const status = statusConfig[invoice.status] || statusConfig.default;

    return (
      <div className="border-b border-sl-blue-700 last:border-b-0 py-2">
        {/* Fila principal visible */}
        <div className="grid grid-cols-3 items-center gap-2 text-sm">
          <div>
            <p className="font-bold">{invoice.invoice_number}</p>
            <span className={`font-bold badge badge-xs ${status.className}`}>{status.text}</span>
          </div>
          <div>
            <p className="font-normal text-gray-400 text-start">{formatDisplayDate(invoice.date)}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-x-2">
            <p className="font-bold">${(invoice.balance || 0).toFixed(2)}</p>
            <button onClick={handleToggle} className="btn-link cursor-pointer hover:underline no-underline !p-1 !h-auto !min-h-0 text-sl-pink-500 !w-auto !text-xs">
              {isExpanded ? 'Ocultar' : 'Ver más'}
            </button>
            
          </div>
        </div>

        {/* Contenido del acordeón (detalles) */}
        <div
          ref={contentRef}
          style={{ maxHeight: contentHeight }} // Aplica max-height dinámico
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-2' : ''}`}>
          <div className="bg-sl-blue-900 p-3 rounded-md text-xs space-y-2">
            <h4 className="font-bold text-sm mb-1">{invoice.invoice_number} </h4>
            <span className={`font-bold badge badge-xs ${status.className}`}>{status.text}</span>
            {/* --- INICIO: Detalles de los productos --- */}
            <div className="grid grid-cols-2"><p>{invoice.line_items[0]?.name || 'Concepto'}</p><p className="text-right font-semibold">${(invoice.total).toFixed(2)}</p></div>
            {/* --- FIN: Detalles de los productos --- */}

            <div className="divider divider-default text-white my-1 !h-px"></div>
            {invoice.payment_made > 0 && <div className="grid grid-cols-2"><p>Pagado:</p><p className="text-right text-green-400 font-semibold">${(invoice.payment_made).toFixed(2)}</p></div>}
            <div className="grid grid-cols-2 font-bold"><p>Total:</p><p className="text-right text-red-400">${(invoice.balance || 0).toFixed(2)}</p></div>
          </div>
        </div>
      </div>
    );
  };

  const handleOverlayClick = (e) => {
    // Cierra el modal al hacer clic en el fondo.
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  // --- VISTA COMPACTA PARA CLIENTES NUEVOS (WISPRO) ---
  if (customerType === 'wispro' && invoices.length > 0) {
    const representativeInvoice = invoices[0];
    const totalBalance = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0);

    return (
      <div 
        className={`fixed inset-0 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isAnimating ? 'opacity-100' : 'opacity-0'}`}        
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleOverlayClick}></div>
        <div 
          className={`bg-sl-blue-950 border border-sl-blue-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative text-white transition-all duration-300 ease-in-out ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          role="dialog" 
          aria-modal="true"
          onClick={(e) => e.stopPropagation()} // Evita que los clics dentro del modal lo cierren
        >
          {/* <button onClick={onClose} className="absolute top-2 right-2 btn btn-sm btn-circle btn-ghost">✕</button> */}
          <h3 className="text-xl font-bold mb-4">Detalles del Contrato</h3>

          <div className="w-full text-left space-y-1 mb-4 text-sm">
            <p><span className="text-sl-pink-600">{representativeInvoice.client_name}</span></p>
            <p><span className="font-bold">ID Fiscal:</span> {representativeInvoice.client_national_identification_number || 'N/A'}</p>
            <div className="divider divider-default text-white my-2"></div>
          </div>

          <h4 className="text-md font-semibold w-full text-left mb-2">Detalles de la Suscripción</h4>
          {invoices.map(invoice => (
            <div key={invoice.id} className="w-full space-y-1 my-2 border-b border-sl-blue-800 pb-2 last:border-b-0">
              <div className="flex justify-between items-center text-sm">
                <p className="font-bold">Factura #{invoice.invoice_number}</p>
                <p className="font-bold text-right">${parseFloat(invoice.balance || 0).toFixed(2)}</p>
              </div>
              {invoice.items?.map(item => (
                <p key={item.id} className="text-xs text-gray-400">{item.description}</p>
              ))}
            </div>
          ))}
          <div className="divider divider-default text-white"></div>
          <div className="w-full flex justify-between items-center font-bold text-lg"><p>Total a Pagar</p><p className="text-right">${totalBalance.toFixed(2)}</p></div>
          <p className="!text-xs !text-gray-400 !text-center !w-full !mt-1">
            Recuerde que este importe no incluye IGTF ni la comisión para PayPal.
          </p>
          <div className="mt-6 flex justify-end"><button onClick={onClose} className="btn btn-outline text-white">Cerrar</button></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isAnimating ? 'opacity-100' : 'opacity-0'}`}      
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleOverlayClick}></div>
      <div 
        className={`bg-sl-blue-950 border border-sl-blue-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative text-white transition-all duration-300 ease-in-out ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        role="dialog" 
        aria-modal="true"
        onClick={(e) => e.stopPropagation()} // Evita que los clics dentro del modal lo cierren
      >
        {/* <button onClick={onClose} className="absolute top-2 right-2 btn btn-sm btn-circle btn-ghost">✕</button> */}
        <h3 className="text-xl font-bold mb-4">Estado de Cuenta</h3>

        {userData && !isLoading && (
          <div className="w-full text-left space-y-1 mb-4 text-sm">
            <p><span className="font-bold"></span> <span className="text-sl-pink-600">{userData.contact_name}</span></p>
            {userData.sub_id && <p><span className="font-bold">ID del Cliente:</span> {userData.sub_id}</p>}
            {userData.billing_id_type && userData.billing_id && (
              <p><span className="font-bold">ID Fiscal:</span> {userData.billing_id_type}{userData.billing_id}</p>
            )}
            {userData.email && <p><span className="font-bold">Email:</span> {userData.email}</p>}
            <div className="divider divider-default text-white my-2"></div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <span className="loading loading-spinner loading-lg text-sl-pink-500"></span>
          </div>
        ) : error ? (
          <div role="alert" className="alert alert-error text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        ) : customerType === 'zoho' && invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map(invoice => (
                <InvoiceAccordionItem key={invoice.invoice_id} invoice={invoice} />
              ))}

              {/* --- INICIO DE LA CORRECCIÓN: Lógica de cálculo y desglose de deuda --- */}
              {userData && (
                <>
                  <div className="divider divider-default text-white mt-4"></div>
                  <div className="w-full flex justify-between items-center font-semibold text-md">
                    <p>Deuda Acumulada:</p>
                    <p className="text-right">${(userData.credit || 0).toFixed(2)}</p>
                  </div>
                  {userData.debit > 0 && (
                    <div className="w-full flex justify-between items-center font-semibold text-md text-green-400">
                      <p>Saldo a Favor (Abono):</p>
                      <p className="text-right">-${(userData.debit || 0).toFixed(2)}</p>
                    </div>
                  )}
                </>
              )}
              {/* --- FIN DE LA CORRECCIÓN --- */}

              <div className="divider divider-default text-white mt-4"></div>
              <div className="w-full flex justify-between items-center font-bold text-lg mt-2">
                <p>Total a Pagar</p>
                <p className="text-right">${parseFloat(data.monto?.replace(',', '.') || '0').toFixed(2)}</p>
              </div>
              <p className="!text-xs !text-gray-400 !text-center !w-full !mt-1">
                Recuerde que este importe no incluye IGTF ni la comisión para PayPal.
              </p>
            </div>
        ) : <p>No se encontraron detalles de facturas pendientes.</p>}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn btn-outline text-white">Cerrar</button>
        </div>
      </div>
    </div>
  );
}