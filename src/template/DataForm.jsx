import React, { useState, useEffect, useCallback } from "react";
import Input from "../componet/Input";
import axios from "axios";
import { apiWP, TOKEN } from "../util/proyect-config"; // --- CORRECCIÓN: Importar roundTo 
import { roundTo } from "../util/math-helpers";
import { format } from "date-fns";
import msj from "../icons/msj.svg";
import crn from "../icons/crn.svg";
import crn2 from "../icons/crn2.svg";
import LoadingScreen from "../componet/LoadingScreen";
import AffiliationResult from "../componet/AffiliationResult";
import LookupFormContainer from "../componet/LookupFormContainer";

export default function DataForm({ initialSearchParams, setInitialSearchParams, setRenderControl }) {
  const [selectedOption, setSelectedOption] = useState("email");
  const [inputValue, setInputValue] = useState("");
  const [identityType, setIdentityType] = useState("V");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(!!initialSearchParams); // Inicializa isLoading a true si hay initialSearchParams
  const [verificationStatus, setVerificationStatus] = useState("idle"); // idle, error
  const [serverMessage, setServerMessage] = useState("");
  const [userData, setUserData] = useState(null);
  const [invoices, setInvoices] = useState([]); // Almacena todas las facturas
  const [isDocumentButtonHovered, setIsDocumentButtonHovered] = useState(false); // Nuevo estado para el hover del botón de documento
  const [tag, setTag] = useState(""); // Estado para guardar el tag de la URL
  const [initialSearchPerformed, setInitialSearchPerformed] = useState(false); // Nuevo estado para controlar la búsqueda inicial
  const [notificationMessage, setNotificationMessage] = useState(null); // Nuevo estado para mensajes de notificación
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // Nuevo estado para controlar la redirección
  const [isAddingCredit, setIsAddingCredit] = useState(false); // Estado para mostrar el formulario de abono
  const [creditAmount, setCreditAmount] = useState(''); // Estado para el monto a abonar
  const [creditError, setCreditError] = useState(''); // Estado para el error del monto a abonar

  // --- INICIO DE LA CORRECCIÓN ---
  // Mover la función aquí para que esté disponible en todo el componente.
  const formatDisplayDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') {
      return ''; // Devolvemos un string vacío para no ocupar espacio si no hay fecha.
    }
    // La fecha viene como YYYY-MM-DD, la convertimos a DD-MM-YYYY
    const parts = dateString.split('-');
    if (parts.length === 3) { // Asegurarse de que la fecha tiene el formato esperado
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString; // Devolver original si el formato no es el esperado
  };
  // --- FIN DE LA CORRECCIÓN ---
  useEffect(() => {
    // Al montar el componente, leemos el 'tag' de la URL y lo guardamos.
    const queryParams = new URLSearchParams(window.location.search);
    const tagFromUrl = queryParams.get('tag');
    if (tagFromUrl) {
      setTag(tagFromUrl);
    }
  }, []); // El array vacío asegura que se ejecute solo una vez.

  // Nuevo useEffect: si la URL contiene `clid` (y opcionalmente `tag`),
  // establecer `initialSearchParams` para disparar la búsqueda automática.
  useEffect(() => {
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const clidFromUrl = queryParams.get('clid');
      const tagFromUrl = queryParams.get('tag');

      if (clidFromUrl) {
        const params = { type: 'auto', clid: clidFromUrl, value: clidFromUrl };
        if (tagFromUrl) params.tag = tagFromUrl;
        // setInitialSearchParams viene como prop del componente.
        if (typeof setInitialSearchParams === 'function') {
          setInitialSearchParams(params);
        }
      }
    } catch (err) {
      // No bloquear la UI si algo falla al parsear la URL
      console.error('Error parsing URL params for auto search:', err);
    }
  }, [setInitialSearchParams]);

  // --- CORRECCIÓN: Mover la definición de handleSubmit antes de los useEffect que la usan ---
  const handleSubmit = useCallback(async (e, valueOverride, typeOverride, identityTypeOverride, initialStatus) => {
    e?.preventDefault(); // Hacer 'e' opcional para llamadas programáticas

    // Usamos los valores de los overrides si existen (para la búsqueda automática), si no, los del estado.
    const valueToSubmit = valueOverride !== undefined ? valueOverride : inputValue;
    const optionToSubmit = typeOverride || selectedOption;
    const currentIdentityType = identityTypeOverride || identityType;

    if (!valueToSubmit) {
      setError("El campo no puede estar vacío."); // Mantener este error para búsquedas manuales
      return;
    }
    setError("");
    setIsLoading(true);
    setVerificationStatus("idle");
    setServerMessage("");

    let valueToSend = valueToSubmit;
    if (optionToSubmit === "clid") {
      valueToSend = valueToSubmit.toUpperCase();
    } else if (optionToSubmit === "document") {
      // Para la búsqueda por documento, concatenamos el tipo y el número.
      valueToSend = `${currentIdentityType}${valueToSubmit}`;
    }
    try {
      // Extraemos la clave y el valor del objeto TOKEN
      const tokenKey = Object.keys(TOKEN)[0];
      const tokenValue = TOKEN[tokenKey];

      const response = await axios.post(
        `${apiWP}/zoho/contact`,
        {
          type: optionToSubmit, // 'email', 'document', 'clid'
          value: valueToSend,
        },
        {
          headers: { [tokenKey]: tokenValue },
        }
      );

      if (response.data.exists) {
        setUserData(response.data.userData);
        setInvoices(response.data.invoices); // Guardamos todas las facturas
        // --- INICIO DE LA CORRECCIÓN ---
        // Guardamos los datos en sessionStorage inmediatamente para asegurar su disponibilidad en producción.
        sessionStorage.setItem('invoices', JSON.stringify(response.data.invoices));
        sessionStorage.setItem('userData', JSON.stringify(response.data.userData));
        setVerificationStatus("success"); // Cambiamos el estado para mostrar la vista de detalles
      } else {
        // If user not found by API
        setVerificationStatus("error"); // Usuario no encontrado
        setError("Cliente no encontrado. Por favor, verifique sus datos e intente de nuevo.");
        setSelectedOption('email'); // Cambiar a la vista de email por defecto
      }
    } catch (err) {
      // If API call fails
      setVerificationStatus("error");
      setServerMessage(err.response?.data?.message || "Ocurrió un error al verificar. Por favor, inténtalo de nuevo.");
      setSelectedOption('email');
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, selectedOption, identityType, tag, initialSearchParams]); // Dependencias para useCallback

  // --- NUEVO useEffect para la búsqueda automática inicial ---
  useEffect(() => {
    // Se ejecuta solo una vez si hay parámetros de búsqueda y no se ha hecho la búsqueda.
    if (initialSearchParams && !initialSearchPerformed && initialSearchParams.type === 'auto') { // CORRECCIÓN: Activar solo para búsquedas automáticas
      const { type, value, status } = initialSearchParams; // Leer el nuevo parámetro 'status'

      // Pre-configuramos los estados sin disparar otros effects
      let finalValue = value;
      let finalIdentityType = identityType; // 'V' por defecto

      let searchTypeToUse = type;
      // --- INICIO: CORRECCIÓN para tomar el valor correcto del clid ---
      if (type === 'auto') { // Si es una búsqueda automática, determinar el tipo de búsqueda real
        searchTypeToUse = initialSearchParams.clid ? 'clid' :
        initialSearchParams.documento ? 'document' :
        initialSearchParams.email ? 'email' : null;
        finalValue = initialSearchParams.clid || initialSearchParams.documento || initialSearchParams.email;
        // --- FIN: CORRECCIÓN ---
      }
      // Si el tipo es 'document', intentamos extraer el prefijo (V, E, J, G)
      if (searchTypeToUse === 'document' && finalValue) { 
        const match = finalValue.match(/^([VEJG])?(\d+)$/i);
        if (match) {
          finalIdentityType = match[1] ? match[1].toUpperCase() : 'V';
          finalValue = match[2];
        }
      }

      // --- CORRECCIÓN: Manejo del estado 'not_found' ---
      // Si el estado es 'not_found', mostramos un error en el formulario sin buscar.
      if (status === 'not_found') {
        setSelectedOption('email');
        setError("Cliente no encontrado. Por favor, verifique sus datos e intente de nuevo.");
        return; // Detenemos la ejecución para no hacer la búsqueda.
      }

      // Actualizamos los estados
      setSelectedOption(searchTypeToUse);
      setInputValue(finalValue);
      setIdentityType(finalIdentityType);

      // Marcamos que la búsqueda se va a realizar para evitar bucles
      setInitialSearchPerformed(true);
      
      // Disparamos la búsqueda. El timeout asegura que se ejecute después de la actualización de estado.
      const simulatedEvent = { preventDefault: () => { } };
      // --- CORRECCIÓN: Pasar explícitamente los datos de búsqueda a handleSubmit ---
      // Se envían `finalValue` y `type` como `valueOverride` y `typeOverride` para asegurar que la búsqueda se haga con los datos de la URL.
      setTimeout(() => handleSubmit(simulatedEvent, finalValue, searchTypeToUse, finalIdentityType, status), 0); // CORRECCIÓN: Usar searchTypeToUse
    }
  }, [initialSearchParams, initialSearchPerformed, handleSubmit, setError, setSelectedOption]); // <-- CORRECCIÓN: Añadir handleSubmit a las dependencias

  // --- useEffect para limpiar el formulario al cambiar de opción MANUALMENTE ---
  useEffect(() => {
    setInputValue("");
    setError("");
  }, [selectedOption]); // Este se mantiene para la interacción manual del usuario.

  // --- CORRECCIÓN: Mover la definición de redirectToPayment antes de los useEffect que la usan ---
  const redirectToPayment = useCallback((data, invs, customAmount) => { // Acepta un monto personalizado opcional
    const currentUserData = data || userData;
    const currentInvoices = invs || invoices;

    if (!currentUserData) {
      console.error("No hay datos de usuario para construir la URL de pago.");
      setError("No se pudieron cargar los datos del usuario. Intente de nuevo.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // --- INICIO: CORRECCIÓN para calcular el monto a pagar desde las facturas ---
      const { debit = 0 } = currentUserData;
      let amountToPay;

      if (customAmount !== undefined) {
        amountToPay = customAmount;
      } else {
        const pendingInvoices = currentInvoices.filter((inv) => inv.balance > 0);
        const debtFromInvoices = pendingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
        const isAbonoFlow = pendingInvoices.length === 1 && pendingInvoices[0].invoice_number === 'ABONO';
        // Para abonos, el monto a pagar es el total del abono, sin restar el saldo a favor.
        amountToPay = isAbonoFlow ? debtFromInvoices : roundTo(debtFromInvoices - debit);
      }
      // --- FIN: CORRECCIÓN ---

      if (amountToPay <= 0) {
        setIsLoading(false);
        setIsRedirecting(false);
        return;
      }

      setIsRedirecting(true); // Hay un monto a pagar, se prepara la redirección.
      const formattedDate = format(new Date(), "dd+MMM+yyyy");
      const montoParaQuery = amountToPay.toFixed(2).replace(".", ",");

      const params = new URLSearchParams({
        id_de_usuario: currentUserData.contact_id,
        cliente: currentUserData.contact_name,
        monto: montoParaQuery,
        suscriptor: currentUserData.sub_id,
        date: formattedDate,
        documento: currentUserData.billing_id ? `${currentUserData.billing_id_type}${currentUserData.billing_id}` : '',
      });

      // --- INICIO: Lógica para añadir tag desde la factura si no existe en la URL ---
      let finalTag = tag; // Usar el tag de la URL por defecto.

      // Si no hay tag en la URL, intentar obtenerlo de la primera factura pendiente.
      const pendingInvoices = currentInvoices.filter((inv) => inv.balance > 0);
      if (!finalTag && pendingInvoices.length > 0) {
        const firstInvoice = pendingInvoices[0];
        // Asumimos que la etiqueta está en el primer line_item y es el primer tag del array.
        const tagFromInvoice = firstInvoice.line_items?.[0]?.tags?.[0]?.tag_name;
        if (tagFromInvoice) {
          finalTag = tagFromInvoice;
        }
      }

      if (finalTag) params.set("tag", finalTag);
      // --- FIN: Lógica para añadir tag ---

      sessionStorage.setItem('userData', JSON.stringify(userData));
      window.location.href = `${window.location.pathname}?${params.toString()}`;
    } catch (err) {
      console.error("Error al redirigir al pago:", err);
      setError("No se pudo iniciar el proceso de pago. Por favor, inténtelo de nuevo más tarde.");
      setIsLoading(false);
      setIsRedirecting(false); // Si falla la redirección, resetear el estado
    }
  }, [userData, invoices, tag]); // Mantenemos las dependencias originales

  // --- CORRECCIÓN: useEffect para la redirección automática después de una búsqueda exitosa ---
  useEffect(() => {
    // Se activa si la búsqueda fue exitosa, se realizó una búsqueda inicial automática, y hay datos de usuario.
    if (
      verificationStatus === "success" &&
      initialSearchPerformed &&
      initialSearchParams?.type === 'auto' &&
      userData
    ) {
      // La función redirectToPayment ya contiene la lógica para verificar si hay deuda antes de redirigir.
      redirectToPayment(userData, invoices);
    }
  }, [verificationStatus, userData, initialSearchPerformed, initialSearchParams, redirectToPayment, invoices]);
  // --- FIN DE LA CORRECCIÓN ---

  const handleGoBack = (toInitialScreen = false) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("email");
    url.searchParams.delete("documento");
    url.searchParams.delete("clid");
    url.searchParams.delete("sub");
    url.searchParams.delete("status"); // Clear status parameter

    if (toInitialScreen) {
      url.searchParams.delete("firstime"); // Elimina para volver a la pantalla de selección inicial
    } else {
      url.searchParams.set("firstime", "false"); // Establece para ir a la búsqueda manual
    }

    // Limpiar sessionStorage para evitar datos residuales
    sessionStorage.removeItem('invoices');
    sessionStorage.removeItem('currentInvoiceData');
    window.location.href = url.toString();
  };

  const handleConfirmCredit = useCallback(() => {
    setCreditError('');
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      setCreditError("Por favor, ingrese un monto válido y mayor a cero.");
      return;
    }
    
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const creditInvoice = {
      id: `credit-${Date.now()}`,
      invoice_id: `credit-${Date.now()}`,
      invoice_number: 'ABONO', 
      balance: amount,
      total: amount,
      date: formattedDate,
      status: 'open',
      payment_made: 0,
      items: [{ id: 'credit-item-1', name: 'Abono a cuenta', description: 'Abono de saldo a favor', gross_amount: amount, rate: amount }],
      line_items: [{ line_item_id: 'credit-item-1', name: 'Abono a cuenta', description: 'Abono de saldo a favor', rate: amount, line_item_taxes: [] }]
    };

    // Guardamos la factura de abono en sessionStorage para que esté disponible en la página de pago.
    sessionStorage.setItem('invoices', JSON.stringify([creditInvoice]));

    // Llamamos a redirectToPayment con la nueva factura de abono para la redirección automática.
    redirectToPayment(userData, [creditInvoice]);
    // --- FIN: CORRECCIÓN ---
  }, [creditAmount, userData, redirectToPayment, setCreditError]);


  const handlePayAllClick = async () => {
    const pendingInvoices = invoices.filter((inv) => inv.balance > 0);
    if (pendingInvoices.length === 0) {
      return; // No hacer nada si no hay deuda
    }
    // Simplemente llamamos a la nueva función reutilizable.
    redirectToPayment(userData, invoices);
  };

  // --- CORRECCIÓN: Nueva condición para mostrar LoadingScreen durante la redirección ---
  if (isRedirecting) {
    return <LoadingScreen message="Redirigiendo al centro de pagos..." theme="light" />;
  }

  // --- VISTA DE CARGA (para la búsqueda API) ---
  if (isLoading) { // Simplificamos la condición de carga
    return <LoadingScreen message="Consultando factura..." theme="light" />;
  }

  // --- VISTA DE DETALLES DEL CLIENTE Y FACTURAS ---
  // --- CORRECCIÓN: Añadir condición para evitar el parpadeo de AffiliationResult ---
  // Solo se muestra si la verificación fue exitosa Y si no es una búsqueda automática
  // que está pendiente de una posible redirección. O si es una búsqueda automática
  // pero ya no está cargando ni redirigiendo (lo que significa que el cliente está al día).
  const shouldShowResult = verificationStatus === "success" && userData && (!isLoading && !isRedirecting);

  if (shouldShowResult) {
    // Configuración para traducir y colorear los estados de las facturas
    const statusConfig = {
      overdue: { text: 'Vencida', className: 'badge-error' },
      partially_paid: { text: 'Pago Parcial', className: 'badge-warning' },
      sent: { text: 'Enviada', className: 'badge-info' },
      open: { text: 'Abierta', className: 'badge-info' },
      unpaid: { text: 'No Pagada', className: 'badge-secondary' },
      default: { text: 'Pendiente', className: 'badge-ghost' }
    };

    // Lista de estados que consideramos como deuda pendiente.
    const payableStatuses = ['overdue', 'partially_paid', 'sent', 'open', 'unpaid'];

    const pendingInvoices = invoices.filter(
      (inv) => inv.balance > 0 && payableStatuses.includes(inv.status)
    );
    
    // --- INICIO: CORRECCIÓN para calcular totales basados en facturas en estado ---
    const creditFromInvoices = pendingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const { debit = 0 } = userData || {};

    // Si la única "factura" es un abono, estamos en el flujo de abono.
    const isAbonoFlow = pendingInvoices.length === 1 && pendingInvoices[0].invoice_number === 'ABONO';

    // El monto total a pagar. Para abonos, no restamos el saldo a favor existente.
    const finalAmount = isAbonoFlow ? creditFromInvoices : creditFromInvoices - debit;
    // --- FIN: CORRECCIÓN ---

    return (
      <AffiliationResult
        clientData={{
          name: userData.contact_name,
          id: userData.sub_id,
          fiscalId: userData.billing_id ? `${userData.billing_id_type}${userData.billing_id}` : 'N/A',
          email: userData.email,
        }}
        pendingInvoices={pendingInvoices}
        totalBalance={finalAmount} // El total a pagar
        credit={creditFromInvoices} // La deuda acumulada de las facturas mostradas
        debit={isAbonoFlow ? 0 : debit} // No mostramos saldo a favor en el flujo de abono
        onProcessPayment={handlePayAllClick}
        onGoBack={() => handleGoBack(true)} // Volver a la pantalla de selección inicial
        isLoading={isLoading}
        // --- INICIO: Props para la funcionalidad de Abono ---
        isAddingCredit={isAddingCredit}
        setIsAddingCredit={setIsAddingCredit}
        creditAmount={creditAmount}
        setCreditAmount={setCreditAmount}
        creditError={creditError}
        setCreditError={setCreditError}
        handleConfirmCredit={handleConfirmCredit}
        // --- FIN: Props para la funcionalidad de Abono ---
      >
        <div className="w-full mt-2 flex flex-col items-end">
          <button onClick={() => setAccordionOpen(!accordionOpen)} className=" !text-sl-pink-600 p-0 text-sm h-auto min-h-0 !bg-transparent hover:!bg-transparent !border-none">
            {accordionOpen ? 'Ocultar detalles' : 'Ver detalles de la deuda'}
          </button>
          {accordionOpen && (
            <div className="bg-sl-blue-900 border border-sl-blue-700 p-3 rounded-lg mt-2 text-xs space-y-4 w-full">
              {pendingInvoices.map(invoice => (
                <div key={invoice.invoice_id} className="border-b border-sl-blue-700 last:border-b-0 pb-3">
                  <h4 className="font-bold text-sm mb-1">Aviso de Cobro {invoice.invoice_number}</h4>
                  <p className="date-display">{formatDisplayDate(invoice.date)}</p>
                  <div className="grid grid-cols-3 gap-2 items-center font-bold text-sl-pink-500 mb-1">
                    <p>Plan</p>
                    <p>Precio</p>
                    <p>IVA</p>
                  </div>
                  {invoice.line_items.map(item => (
                    <div key={item.line_item_id} className="grid grid-cols-3 gap-2 items-center">
                      <p>{item.name}</p>
                      <p>${(item.rate || 0).toFixed(2)}</p>
                      <p>${(
                        (item.line_item_taxes?.reduce((sum, tax) => sum + tax.tax_amount, 0) || 0) +
                        ((invoice.adjustment || 0) / (invoice.line_items.length || 1))
                      ).toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="divider divider-default text-white my-1 !h-px"></div>
                  <div className="grid grid-cols-2"><p>Total:</p> <p className="text-right">${(invoice.total || 0).toFixed(2)}</p></div>
                  <div className="grid grid-cols-2"><p>Pagado:</p> <p className="text-right">${(invoice.payment_made || 0).toFixed(2)}</p></div>
                  <div className="grid grid-cols-2 font-bold"><p>Debe:</p> <p className="text-right text-sl-red-600">${(invoice.balance || 0).toFixed(2)}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AffiliationResult>
    );
  }

  const renderForm = () => {
    let label = "";
    let placeholder = "";
    let type = "text";

    switch (selectedOption) {
      case "email":
        label = "Email Afiliado*";
        placeholder = "Email Afiliado*";
        type = "email";
        break;
      case "document":
        // El label se maneja directamente en el JSX para el select/input
        placeholder = "Cédula / Rif*";
        break;
      case "clid":
        label = "CL-ID";
        placeholder = "CL-00000";
        break;
      default:
        return null;
    }

    return (
      <>
        <div className="!w-full !mt-4">
          {selectedOption !== "document" && <label className="!label"><span className="!label-text !text-white">{label}</span></label>}
          
          <div className="!flex !flex-col sm:!flex-row !gap-2">
            {selectedOption === "document" && (
                <select
                  value={identityType}
                  onChange={(e) => setIdentityType(e.target.value)}
                  className="!select !select-bordered !w-full sm:!w-auto !bg-sl-blue-900 !text-white !border-sl-blue-700"
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                  <option value="J">J</option>
                  <option value="G">G</option>
                </select>
            )}
            <div className="!w-full">
              <Input
                name={selectedOption}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                type={type}
                error={error}
                className="!input !input-bordered !w-full !bg-sl-blue-900 !placeholder-sl-blue-500 !text-white !border-sl-blue-700"
              />
            </div>
          </div>

          {selectedOption === 'email' && (
              <p className="!text-sm !text-neutral-400 !mt-1 !ml-1">Coloque el email Afiliado a su servicio de internet</p>
          )}
        </div>
      </>
    );
  };

  return (
    <LookupFormContainer
      onSubmit={handleSubmit}
      onGoBack={() => handleGoBack(true)}
      isLoading={isLoading}
      error={error || serverMessage}
      title="Centro de Pagos"
      submitButtonText="Verificar mi Cuenta"
      showFormButtons={true} // Los botones del formulario siempre estarán visibles.
    >
      {/* Los botones de selección y el formulario de entrada ahora se renderizan juntos. */}
      <p className="!mb-6 !text-center !text-white !mt-4">
        ¿Como quiere verificar su datos de cliente?
      </p>
      <div className="!flex !flex-col sm:!flex-row !gap-2">
        <button
          className={`!flex !flex-1 !flex-col !items-center !justify-center !p-2 !rounded-lg !cursor-pointer !transition-colors !border-2 !text-white !font-semibold !text-center !text-sm !h-24 ${selectedOption === 'email' ? '!bg-sl-blue-700 !border-sl-pink-500' : '!bg-transparent !border-sl-blue-700 hover:!bg-sl-blue-700'}`}
          onClick={() => setSelectedOption("email")}
        >
          Por mi Correo Electrónico
          <img src={msj} alt="email icon" className="!h-[32px] !mt-2" />
        </button>
        <button
          className={`!flex !flex-1 !flex-col !items-center !justify-center !p-2 !rounded-lg !cursor-pointer !transition-colors !border-2 !text-sm !font-semibold !text-center !h-24 ${selectedOption === 'document' ? '!bg-sl-blue-700 !border-sl-pink-500 !text-white' : '!bg-transparent !border-sl-blue-700 !text-white hover:!bg-sl-gray-50 hover:!text-sl-gray-950'}`}
          onClick={() => setSelectedOption("document")}
          onMouseEnter={() => setIsDocumentButtonHovered(true)}
          onMouseLeave={() => setIsDocumentButtonHovered(false)}
        >
          Por mi Cédula/Rif
          <img
            src={isDocumentButtonHovered || selectedOption === 'document' ? crn2 : crn}
            alt="document icon"
            className="!h-[32px] !mt-2"
            style={{
              filter: (selectedOption !== "document" && !isDocumentButtonHovered) ? 'brightness(0) invert(1)' : 'none'
            }}
          />
        </button>
      </div>
      {renderForm()}
    </LookupFormContainer>
  );
}
