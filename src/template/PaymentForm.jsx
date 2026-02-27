import React, { useEffect, useMemo, useState, useCallback } from "react";
import PaymentMethodTab from "../componet/PaymentMethodTab";
import "react-datepicker/dist/react-datepicker.css";
import BanckTranferForms from "./BanckTranferForms"; 
import MobilePaymentForm from "./MobilePaymentForm";
import R4PaymentForm from "./R4PaymentForm";
import ZellePayment from "./ZellePayment";
import PaypalForm from "./PaypalForm";
import ArrorLeft from "../icons/ArrorLeft";
import axios from 'axios';
import { apiPaymentHeader, apiurl, apiWP, TOKEN } from '../util/proyect-config';
import Client from "../icons/Client"; 
import Factura from "../icons/Factura";
import { format } from "date-fns";
import MobilePaymentP2P from "./MobilePaymentP2P";
import Logo7Link from "../icons/Logo7Link";
import doc from "../icons/Frame.svg"
import doc2 from "../icons/doc2.svg"
import DataForm from "./DataForm";
import CedulaLookupForm from "./wisproDataform";
import { wispro } from "../util/proyect-config";
import InvoiceDetailsModal from "../componet/InvoiceDetailsModal";
import { roundTo } from "../util/math-helpers";
import VersionMismatchDetector from "../componet/VersionMismatchDetector";
import LoadingScreen from "../componet/LoadingScreen";

export default function PaymentForm() {
  const [renderControl, setRenderControl] = useState(0);
  const [totalRef, setTotalRef] = useState(0);
  const [includeMessage, setIncludeMessage] = useState("");
  const [tasaActual, setTasaActual] = useState(null);
  const [initialSearchParams, setInitialSearchParams] = useState(null); // Nuevo estado para parámetros de búsqueda inicial
  const [money, setMoney] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(false); // Estado para la carga de datos de facturas
  const [montoItf, setMontoItf] = useState("");  
  const [paymentData, setPaymentData] = useState({});
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isMontoInvalido = Number(totalRef) <= 0;
  const getInvoice = async () => {
    // console.log("factura solicitada");
  };

  const years = Array.from(
    { length: 2040 - 2025 + 1 },
    (_, index) => 2025 + index
  );

  const triggerCustomEvent = () => {
    const customEvent = new CustomEvent("actulizar-url", {
      detail: { mensaje: "Este es un evento personalizado en React" },

    });
    window.dispatchEvent(customEvent); // Dispara el evento en el objeto window
  };

  // los paymentMethod son
  // zelle
  // paypay
  // tranferenciadirecta
  // c2p
  // r4
  // Tarjetadecredito

  function updateQueryParams(data) {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);

    // Si `data.paymentMethod` tiene un valor, agrégalo
    if (data.paymentMethod) {
      url.searchParams.set("paymentMethod", data.paymentMethod);
    } else {
      // Si no tiene valor, elimina el parámetro
      url.searchParams.delete("paymentMethod");
    }
    
    // Actualiza el URL sin recargar la página
    // window.history.replaceState(null, "", url.toString());
     window.location.href = url.toString();
  }

  // console.log(paymentData);
  const { 
    moneda, 
    cliente, 
    ac = "", // Asignar un valor por defecto si 'ac' no está en la URL
    monto, 
    suscriptor, 
    date, 
    sub, 
    paymentMethod, 
    tag,
    firstime, // Destructure firstime
    documento,
    fullInvoiceData, // Destructure fullInvoiceData
     } =
    paymentData;

    //console.log("Valor de la variable 'tag' extraída:", tag);

    
const TAG_CONFIGS = {
    "Proyecto Fenix": {
      allowedMethods: [
        "zelle", 
        "paypal",
        "pago-movil", 
        "r4", 
        "c2p"
      ],
      methodDetails: {
        zelle: { account: "bofa" },
        tranferenciadirecta: { bank: "r4" },
        "pago-movil": { bank: "r4" },
        c2p: { bank: "r4" }
      },
    },
    "Quantum Link": {
      allowedMethods: [
        "zelle", 
        "paypal",
        "tranferenciadirecta",
        "pago-movil",
        "c2p" 
      ],
      methodDetails: {
        zelle: { account: "chase" },
        tranferenciadirecta: { bank: "bdv" },
        "pago-movil": { bank: "bdv" },
        c2p: { bank: "bdv" }
      },
    },
    "Santa Cruz": {
      allowedMethods: [
        "zelle", 
        "paypal",
        "tranferenciadirecta", 
      ],
      methodDetails: {
        zelle: { account: "chase" },
        tranferenciadirecta: { bank: "bnc" },
      },
    },
  };

  // Configuración por defecto cuando no se especifica una tag.
  const DEFAULT_CONFIG = {
    allowedMethods: [],
    methodDetails: {
      // Define un comportamiento por defecto para evitar mostrar todas las cuentas.
      zelle: {},
      tranferenciadirecta: {},
    },
  };

  const currentPhaseConfig = useMemo(() => {
    // Si no hay 'tag' en la URL, usamos la configuración por defecto.
    if (!tag) {
      return DEFAULT_CONFIG;
    }

    const lowerCaseTagFromUrl = tag.toLowerCase();

    // Buscamos una clave en TAG_CONFIGS que coincida con el tag de la URL, ignorando mayúsculas/minúsculas.
    const matchingKey = Object.keys(TAG_CONFIGS).find(
      (key) => key.toLowerCase() === lowerCaseTagFromUrl
    );
    
    // console.log("TAG en URL:", tag);
    // Si encontramos una clave, usamos su configuración. Si no, la por defecto.
    return matchingKey ? TAG_CONFIGS[matchingKey] : DEFAULT_CONFIG;
  }, [tag]);

  const allowedMethods = currentPhaseConfig.allowedMethods;

  const methodConfig = useMemo(() => {
    return currentPhaseConfig.methodDetails[paymentMethod] || {};
  }, [paymentMethod, currentPhaseConfig]);


  const calcTotalUsd = async (monto, comision) => {
    return monto;
  };

  const calcTotal = async () => {
    if (!paymentMethod && !monto) return;

    // 1. Siempre intentamos obtener la tasa de cambio del BCV.
    let fetchedTasa = null;
    try {
      const date = format(selectedDate, "yyyy-MM-dd");
      const res = await axios.post(
        apiurl + "/mb/bcv",
        { Moneda: "USD", Fechavalor: date },
        { headers: apiPaymentHeader }
      );
      fetchedTasa = Number(res.data.tipocambio).toFixed(2);
    } catch (error) {
      console.error("Error al obtener la tasa de cambio en PaymentForm:", error);
      // Si hay un error, la tasa permanecerá como null y se mostrará un mensaje en la UI.
    }
    setTasaActual(fetchedTasa); // Guardamos la tasa en el estado para mostrarla en la UI.

    // 2. Preparamos las variables para los cálculos.
    const nMonto = monto ? monto.replace(",", ".") : "0";
    let calculatedTotal = -1;
    let calculatedMoney = "";
    let calculatedMontoItf = "";
    let calculatedIncludeMessage = "";

    if (
      paymentMethod === "tranferenciadirecta" ||
      paymentMethod === "c2p" ||
      paymentMethod === "r4" ||
      paymentMethod === "pago-movil"
    ) {
      // 3a. Si el método es en Bolívares, usamos la tasa obtenida para calcular el total.
      if (fetchedTasa) {
        const totalEnBs = roundTo(Number(nMonto) * Number(fetchedTasa));
        calculatedTotal = totalEnBs.toFixed(2);
        calculatedMoney = "BS.";
        calculatedIncludeMessage = "16% del IVA";
      } else {
        // Si no se pudo obtener la tasa, mostramos un mensaje de error.
        calculatedTotal = Number(nMonto).toFixed(2);
        calculatedMoney = "USD (Tasa no disponible)";
        calculatedIncludeMessage = "16% del IVA (Tasa no disponible)";
      }
    } else if (paymentMethod === "paypal") {
      // 3b. Cálculo para PayPal en USD.
      // Se calcula el IGTF (3%) sobre el monto base.
      const montoConIgtf = roundTo(Number(nMonto) * 1.03);
      calculatedMontoItf = montoConIgtf.toFixed(2);
      calculatedIncludeMessage = "16% del IVA + 3% del IGTF + comisión PayPal";
      // Se calcula el monto final a pagar incluyendo la comisión de PayPal para que el destinatario reciba 'btotal'.
      // Fórmula: (MontoNeto + TarifaFija) / (1 - PorcentajeComision)
      const totalConComision = (montoConIgtf + 0.3) / (1 - 0.054);
      calculatedTotal = roundTo(totalConComision).toFixed(2);
      calculatedMoney = "USD";
    } else if (paymentMethod === "zelle") {
      // 3c. Cálculo para Zelle en USD.
      // Se calcula el IGTF (3%) sobre el monto base.
      const totalConIgtf = roundTo(Number(nMonto) * 1.03);
      calculatedTotal = totalConIgtf.toFixed(2);
      calculatedMoney = "USD";
      calculatedMontoItf = totalConIgtf.toFixed(2);
      calculatedIncludeMessage = "16% del IVA + 3% del IGTF";
    } else if (paymentMethod === "creditCard") {
      // 3d. Cálculo para Tarjeta de Crédito (si se implementa).
      calculatedTotal = Number(nMonto).toFixed(2);
      calculatedMoney = "USD";
    }

    // 4. Actualizamos todos los estados al final.
    setTotalRef(calculatedTotal);
    setMoney(calculatedMoney);
    setMontoItf(calculatedMontoItf);
    setIncludeMessage(calculatedIncludeMessage);
  };

  useEffect(() => {
    // Se recalcula el total cada vez que cambia el método de pago, el monto o la fecha seleccionada.
    calcTotal(); 
  }, [paymentMethod, monto, selectedDate]);

  // Efecto para cargar datos de Wispro si es first-time y no hay datos en sessionStorage
  useEffect(() => {
    const loadWisproData = async () => {
      // Solo se ejecuta si es first-time y tenemos una cédula en la URL
      if (paymentData.firstime === 'true' && paymentData.documento) {
        const storedInvoices = sessionStorage.getItem('allFirstTimeInvoices');
        if (storedInvoices) {
          // Si ya tenemos datos, los usamos y salimos
          const currentInvoice = JSON.parse(sessionStorage.getItem('currentInvoiceData'));
          setPaymentData({ 
            ...paymentData, 
            documento: currentInvoice?.client_national_identification_number, // <-- CORRECCIÓN: Extraer la cédula
            fullInvoiceData: currentInvoice });
          // console.log("PaymentForm (first-time): Usando datos de sessionStorage.", { allInvoices: JSON.parse(storedInvoices), currentInvoice: JSON.parse(sessionStorage.getItem('currentInvoiceData')) });
          return;
        }

        // Si no, buscamos en Wispro
        setIsDataLoading(true);
        try {
          const tokenKey = Object.keys(TOKEN)[0];
          const tokenValue = TOKEN[tokenKey];
          const headers = { [tokenKey]: tokenValue };
          const response = await axios.get(`${wispro}/${paymentData.documento}`, { headers });

          if (response.data?.isSuccess && response.data?.data?.data?.length > 0) {
            const wisproInvoices = response.data.data.data;
            const representativeInvoice = wisproInvoices[0];

            // Guardamos los datos en sessionStorage para que otros componentes los usen
            sessionStorage.setItem('allFirstTimeInvoices', JSON.stringify(wisproInvoices));
            sessionStorage.setItem('currentInvoiceData', JSON.stringify(representativeInvoice));

            // Actualizamos el estado con los datos completos
            setPaymentData({ 
              ...paymentData, 
              documento: representativeInvoice?.client_national_identification_number, // <-- CORRECCIÓN: Extraer la cédula
              fullInvoiceData: representativeInvoice 
            });
          } else {
            setPaymentData(paymentData); // Continuar con los datos de la URL como fallback
          }
        } catch (error) {
          console.error("Error al buscar datos en Wispro:", error);
          setPaymentData(paymentData); // En caso de error, usar datos de la URL
        } finally {
          setIsDataLoading(false);
        }
      } else {
        // If it's not first-time, we might not need to do anything here,
        // as paymentData is already set from the URL.
      }
    };

    // El objeto 'data' ya no existe, usamos paymentData que se popula desde la URL
    if (Object.keys(paymentData).length > 0) {
      loadWisproData();
    }
  }, [paymentData]); // Se ejecuta cuando los datos de la URL cambian
  
  // La lógica para reconstruir la URL y redirigir ahora se maneja en DataForm.jsx

  // Efecto para cargar datos de facturas si se accede directamente a la URL de pago
  useEffect(() => {
    const loadInvoiceDataIfNeeded = async () => {
      // Solo se ejecuta si estamos en la vista de pago y no en un flujo de 'first-time'
      if (cliente && monto && date && firstime !== 'true') {
        const storedInvoices = sessionStorage.getItem('invoices');
        const storedUserData = sessionStorage.getItem('userData');

        // console.log("PaymentForm (URL directa): Verificando datos en sessionStorage.", { storedInvoices, storedUserData });
        // Si no hay datos en sessionStorage, los buscamos
        if (!storedInvoices || !storedUserData) {
          // --- INICIO DE LA CORRECCIÓN ---
          // Lógica de fallback para encontrar al cliente.
          let searchType = null;
          let searchValue = null;

          // Use paymentData which is already in scope from the component's state
          if (paymentData.sub || paymentData.suscriptor) {
            searchType = 'clid';
            searchValue = paymentData.sub || paymentData.suscriptor;
          } else if (paymentData.email) {
            searchType = 'email';
            searchValue = paymentData.email;
          } else if (paymentData.documento) {
            searchType = 'document';
            searchValue = paymentData.documento;
          }

          if (!searchValue) {
            console.warn("No se puede cargar datos de facturas: falta un identificador (client_id, sub, suscriptor, email o cedula) en la URL.");
            return;
          }
          // --- FIN DE LA CORRECCIÓN ---

          setIsDataLoading(true);
          try {
            const tokenKey = Object.keys(TOKEN)[0];
            const tokenValue = TOKEN[tokenKey];
            const response = await axios.post(
              `${apiWP}/zoho/contact`,
              { type: searchType, value: searchValue }, // Usamos el tipo y valor encontrados
              { headers: { [tokenKey]: tokenValue } }
            );

            if (response.data.exists) {
              // Guardamos los datos en sessionStorage para que los componentes de pago los usen
              sessionStorage.setItem('invoices', JSON.stringify(response.data.invoices));
              sessionStorage.setItem('userData', JSON.stringify(response.data.userData));
              // console.log("PaymentForm (URL directa): Datos de facturas cargados desde Zoho y guardados en sessionStorage.");
            }
          } catch (err) {
            console.error("Error al cargar datos de facturas directamente:", err);
          } finally {
            setIsDataLoading(false);
          }
        }
      }
    };
    // Este useEffect solo debe ejecutarse si paymentData ya está completo para el pago, no para la reconstrucción.
    loadInvoiceDataIfNeeded();
  }, [cliente, monto, date, firstime, paymentData]); // Dependencias clave para este efecto

  // EFECTO PRINCIPAL PARA LEER LA URL Y ACTUALIZAR EL ESTADO
  // Este efecto reemplaza al `useMemo` problemático.
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(queryParams.entries());
    setPaymentData(params);

    // --- Lógica para detectar parámetros de búsqueda inicial (email, cedula, clid) ---
    // Solo procesar si no se ha establecido ya para evitar bucles o re-procesamientos innecesarios
    if (!initialSearchParams) {
      if (params.email) {
        setInitialSearchParams({ type: 'email', value: params.email });
      } else if (params.documento) {
        setInitialSearchParams({ type: 'document', value: params.documento });
      } else if (params.clid) {
        setInitialSearchParams({ type: 'clid', value: params.clid });
      }
      // Si tenemos un identificador pero faltan detalles de pago completos, y no es un flujo de primera vez,
      // debemos activar DataForm para que maneje la búsqueda y la posible redirección.
      const hasIdentifier = params.clid || params.sub || params.suscriptor || params.client_id || params.id_de_usuario || params.email || params.documento;
      const isDataMissing = !params.cliente || !params.monto || !params.date || !params.id_de_usuario || !params.sub || !params.suscriptor;
      if (hasIdentifier && isDataMissing && params.firstime !== 'true' && !initialSearchParams) { // Solo establecer si no está ya establecido
        setInitialSearchParams({ type: 'auto', value: 'true', ...params }); // Usar 'auto' para indicar búsqueda automática
      }
    }
  }, [renderControl]); // Se re-ejecuta cuando `renderControl` cambia.


  useEffect(() => {
    const handleCustomEvent = (event) => {
      setRenderControl((prev) => prev + 1);
    };

    window.addEventListener("actulizar-url", handleCustomEvent);

    // Limpia el listener al desmontar el componente
    return () => {
      window.removeEventListener("actulizar-url", handleCustomEvent);
    };
  }, []);

  const handleOptionClick = (isFirstTime) => {
    const url = new URL(window.location.href);
    url.searchParams.set('firstime', isFirstTime);
    // Limpiamos otros parámetros para asegurar un estado limpio
    url.searchParams.delete('cliente');
    url.searchParams.delete('monto');
    url.searchParams.delete('date');
    window.location.href = url.toString();
  };

  // --- INICIO DE LA CORRECCIÓN: Evitar parpadeo en URL directa ---
  // Si la URL tiene parámetros de búsqueda pero no los datos completos de pago,
  // mostramos un loader para evitar que se vea la selección de `firstime` o `DataForm`.
  const hasSearchParams = initialSearchParams || (paymentData.clid || paymentData.documento || paymentData.email);
  const hasFullPaymentData = paymentData.cliente && paymentData.monto && paymentData.date;

  if (hasSearchParams && !hasFullPaymentData) {
    // Renderiza DataForm directamente, que a su vez mostrará su propio LoadingScreen o el de redirección.
    return <DataForm initialSearchParams={initialSearchParams || { type: 'auto', ...paymentData }} setInitialSearchParams={setInitialSearchParams} setRenderControl={setRenderControl} />;
  }

  // Renderizado principal
  if (cliente && monto && date) {
    // Si está cargando los datos de la factura, muestra un loader
    if (isDataLoading) {
      return (
        <LoadingScreen message="Cargando detalles de facturación..." theme="light" />
      );
    }

    return (
      <VersionMismatchDetector>
        <div id="sl-payment-form-wrapper" className="p-4 w-full">
          {paymentMethod ? (
            <div className="w-full rounded-[16px] flex justify-center overflow-hidden ">
              <div className="w-full h-full flex bg-gradient-to-b flex-col relative min-h-[800px]  max-w-[600px] rounded-[16px] overflow-hidden items-start md:items-stretch">
                <div className="w-full h-full bottom-[0px] md:relative !bg-[#B21259] p-[16px] rounded-[16px] flex flex-col">
                  <div className="sl-invoice-box">
                    <div className="flex justify-between items-center mb-[24px]">
                      <h4 className="text-center flex-grow">Detalles del Aviso de cobro</h4>
                    </div>
                    <div className="w-full flex justify-between gap-4">
                      <div className="sl-invocie-item">
                        <p className="flex gap-2">
                          <span className="sl-invoice-icon"><Client /></span>
                          <span>Cliente:</span>
                        </p>
                        <p>
                          <h4>{cliente}</h4>
                          {suscriptor && (
                            <span>{'ID Suscriptor'}: {suscriptor}</span>
                          )}
                        </p>
                      </div>
                      {ac && (
                        <div className="sl-invocie-item">
                          <p className="flex gap-2">
                            <span className="sl-invoice-icon">
                              <Factura />
                            </span>
                            <span>Aviso de cobro:</span>
                          </p>
                          <h4>{ac}</h4>
                        </div>
                      )}
                    </div>
                    <div className="sl-invocie-item">
                      <div className="flex justify-between items-center w-full">
                        <p>Monto a Pagar:</p>
                        <button onClick={() => setIsDetailsModalOpen(true)} className="btn text-sl-pink-500 btn-xs p-0 no-underline h-auto min-h-0 !w-auto border-sl-pink-50">Ver Detalles</button>
                      </div>
                      <div>
                        <h3 className="price">
                          {totalRef} {money}
                        </h3>
                        {includeMessage && <p className="font-semibold">Incluye: {includeMessage}</p>}
                        {tasaActual &&
                          paymentMethod !== "zelle" &&
                          paymentMethod !== "paypal" && 
                            <p>Tasa de BCV {tasaActual}</p>
                          }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full  bg-sl-gray-75">
                  <button
                    className="p-4 regresar-btn !flex items-center gap-2 !border-none"
                    onClick={() => updateQueryParams("")}
                  >
                    <div className="mini w-[16px] h-[16px]">
                      <ArrorLeft />
                    </div>
                    <span>Cambiar Método de Pago</span>
                  </button>


                  {paymentMethod === "tranferenciadirecta" && (
                    <BanckTranferForms
                      hData={paymentData}
                      tasaActual={tasaActual}
                      total={totalRef}
                      disableSubmit={isMontoInvalido}
                      methodConfig={methodConfig}
                      setSelectedDate={setSelectedDate}
                    />
                  )}
                  {paymentMethod === "c2p" && (
                    <MobilePaymentForm
                      hData={paymentData}
                      tasaActual={tasaActual}
                      total={totalRef}
                      disableSubmit={isMontoInvalido}
                      methodConfig={methodConfig}

                    />
                  )}
                  {paymentMethod === "pago-movil" && (
                    <MobilePaymentP2P
                      hData={paymentData}
                      tasaActual={tasaActual}
                      total={totalRef}
                      disableSubmit={isMontoInvalido}
                      setSelectedDate={setSelectedDate}
                      methodConfig={methodConfig}
                    />
                  )}
                  {paymentMethod === "r4" && (
                    <R4PaymentForm
                      hData={paymentData}
                      tasaActual={tasaActual}
                      total={totalRef}
                      disableSubmit={isMontoInvalido}
                      methodConfig={methodConfig}
                    />
                  )}
                  {paymentMethod === "zelle" && (
                    <ZellePayment
                      hData={paymentData}
                      tasaActual={tasaActual}
                      total={totalRef}
                      disableSubmit={isMontoInvalido}
                      itf={montoItf}
                      methodConfig={methodConfig}
                      setSelectedDate={setSelectedDate}
                    />
                  )}
                  {paymentMethod === "paypal" && (
                    <PaypalForm
                      hData={paymentData}
                      tasaActual={tasaActual}
                      total={totalRef}
                      montoItf={montoItf}
                      disableSubmit={isMontoInvalido}
                      methodConfig={methodConfig}
                      setSelectedDate={setSelectedDate}
                    />
                  )}

                </div>
                {/* <div className="w-full md:w-1/2"> formulario xd</div> */}


              </div>
            </div>
          ) : (
            <>
              <PaymentMethodTab
                currentTab={paymentMethod}
                updateTab={updateQueryParams}
                allowedMethods={allowedMethods}
                cliente={cliente}
                documento={documento}
              />
            </>
          )}
          <InvoiceDetailsModal 
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            data={paymentData}
          />
        </div>
      </VersionMismatchDetector>
    );
  }

  // Si se detectaron parámetros de búsqueda inicial, renderizar DataForm directamente con ellos
  if (initialSearchParams) {
    return (
      <VersionMismatchDetector>
        <div className="w-full min-h-screen flex items-center justify-center p-4">
          <DataForm initialSearchParams={initialSearchParams} setInitialSearchParams={setInitialSearchParams} setRenderControl={setRenderControl} />
        </div>
      </VersionMismatchDetector>
    );
  }

  if (firstime === 'true') {
    // --- VISTA PARA NUEVOS CLIENTES (búsqueda por cédula) ---
    return (
      <VersionMismatchDetector>
        <div className="w-full min-h-screen flex items-center justify-center p-4">
          <CedulaLookupForm />
        </div>
      </VersionMismatchDetector>
    );
  }

  if (firstime === 'false') {
    // --- VISTA PARA CLIENTES EXISTENTES (búsqueda por email/clid) ---
    return (
      <VersionMismatchDetector>
        <DataForm setInitialSearchParams={setInitialSearchParams} setRenderControl={setRenderControl} />
      </VersionMismatchDetector>
    );
  }

  // --- VISTA INICIAL DE SELECCIÓN ---
  return (
    <VersionMismatchDetector>
      <>
        <div
          id="sl-selection-wrapper"
          className="w-full max-w-md mx-auto h-full flex flex-col items-center justify-center p-8 min-h-[300px] rounded-box bg-sl-blue-950"
        >
          {/* Logo7Link y Centro de Pagos se manejan dentro de LookupFormContainer o ClientSummary */}
          <h1 className="text-2xl font-bold mt-4 !text-white">Centro de Pagos</h1>
          <p className="mt-2 mb-8 text-white">¿Qué servicio desea cancelar?</p>
          <div className="flex flex-col gap-4 w-full max-w-sm items-center">
            <div
              className="flex flex-1 flex-col items-center justify-center p-6 rounded-lg cursor-pointer bg-transparent hover:bg-sl-blue-700 transition-colors border-2 border-sl-blue-700"
              onClick={() => handleOptionClick(true)}
            >
              <p className="font-semibold text-white text-center">Contrato de Suscripción</p>
              <p className="font-semibold text-white text-center mb-4">(Nuevos Clientes)</p>
              <img src={doc} alt="doc" className="!h-[64px]" />
            </div>
            <div className="divider divider-default text-white">o</div>
            <div
              className="flex flex-1 flex-col items-center justify-center p-6 rounded-lg cursor-pointer bg-transparent hover:bg-sl-blue-700 transition-colors border-2 border-sl-blue-700"
              onClick={() => handleOptionClick(false)}
            >
              <p className="font-semibold text-white text-center mb-4">Pago del servicio mensual</p>
              <img src={doc2} alt="doc2" className="!h-[64px]" />
            </div>
          </div>
        </div>
        <a href="https://7linknetwork.com/" className="!text-sl-pink-700 !no-underline hover:!text-sl-pink-700 block w-full text-center mt-4">Volver a la página de Inicio</a>
      </>
    </VersionMismatchDetector>
  );
}
