import React, { useRef, useState, useEffect, useCallback} from "react";
import R4Logo from "../icons/R4Logo";
import { instantDebitAccounts } from "../utils/bancos-venezuela";
import Input from "../componet/Input";
import Mail from "../icons/Mail";
import ErrorIcon from "../icons/ErrorIcon"; 
import axios from "axios";
import { apiPaymentHeader, apiurl } from "../util/proyect-config";
import { set } from "date-fns";
import CheckIcon from "../icons/CheckIcon";
import { se } from "date-fns/locale";
import WhatsappIcon from "../icons/WhatsappIcon";
import PhoneIcon from "../icons/PhoneIcon";
import SuccessComponent from "../componet/SuccessComponent";
import TrasactionProgress from "./TrasanctionProsess";
import { getCommonPaymentPayload } from "../utils/payment-payload-helper";
import PaymentReminderModal from "../componet/PaymentReminderModal";

export default function R4PaymentForm({ hData, tasaActual, total, disableSubmit, initialSeconds = 40 }) {
  // Log para verificar las props iniciales
  // console.log("R4PaymentForm props:", { hData, tasaActual, total });

const [segundosRestantes, setSegundosRestantes] = useState(15);
const [startDate, setStartDate] = useState(new Date());
const [checkCount, setCheckCount] = useState(0);
const [formData, setFormData] = useState({
    Banco: "",
    Telefono: "",
    tipoDocumento: "",
    Cedula: "",
    
  });

  const [getOtpErrorsMessage, setGetOtpErrorsMessage] = useState();
  const [debitIdTransaction, setDebitIdTransaction] = useState();

  const [instaDebiAccData, setInstaDebiAccData] = useState({
    Otp: "",
    ownerAcc: "",
    isOwnerAcc: true,
  });

  const [errosOtpForm, setErrosOtpForm] = useState({});
  const [intaDebitAccErros, setIntaDebitAccErros] = useState({});

  const [transationR4Message, setTransationR4Message] = useState();
  const [transactionReference, setTransactionReference] = useState(""); // Nuevo estado para la referencia

  const [otpMdalMode, setOtpMdalMode] = useState(0);

  const manejarCambio = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const manejarCambioOtp = (e) => {
    setInstaDebiAccData({
      ...instaDebiAccData,
      [e.target.name]: e.target.value,
    });
  };

  //console.log(total);

  const modalRef = useRef();

  const openModal = () => {
    modalRef.current.classList.remove("hidden");
  };

  const closeModal = () => {
    modalRef.current.classList.add("hidden");
    setOtpMdalMode(0);
  };

  const formatConcepto = (concepto) => {
    const maxLength = 30;
    if (concepto.length > maxLength) {
        return concepto.substring(0, 25) + '...';
    }
    return concepto;
  };

  const getOtp = async () => {
    // console.log("[R4-DEBUG] getOtp: Iniciando la función.");
    const telefonoRegex = /^(0414|0424|0416|0426|0412|0422)\d{7}$/;
    const cedulaRegex = /^\d{6,8}$/;

    const errosOtpFormContext = {};

    // validamos los campos de formadata todos son requeridos
    if (!formData.Banco) errosOtpFormContext.Banco = "Este Campo es Requerido";
    if (!formData.Telefono) {
      errosOtpFormContext.Telefono = "El Teléfono es Requerido";
    } else if (!telefonoRegex.test(formData.Telefono)) {
      errosOtpFormContext.Telefono =
        "El Formato del número de Teléfono es Invalido";
    }
    if (!formData.tipoDocumento)
      errosOtpFormContext.tipoDocumento =
        "Necesitamos saber si eres Venezolano o Extranjero";
    if (!formData.Cedula) {
      errosOtpFormContext.Cedula = "La Cédula del titular es Requerida";
    } else if (!cedulaRegex.test(formData.Cedula)) {
      errosOtpFormContext.Cedula =
        "La Cédula debe contener entre 6 y 8 dígitos numéricos";
    }

    //console.log(errosOtpFormContext);

    if (Object.keys(errosOtpFormContext).length > 0) {
      // console.log("[R4-DEBUG] getOtp: Errores de validación encontrados:", errosOtpFormContext);
      return setErrosOtpForm(errosOtpFormContext);
    }

    // console.log("[R4-DEBUG] getOtp: Validaciones pasadas.");
    setErrosOtpForm({});

    //console.log(formData);
    // console.log("[R4] Abriendo modal y solicitando OTP...");
    openModal();

    // aqui realizamos la petiocion del servidor para obtener el otp donde
    // se mandaran los siguientes datos

    // { Banco, Monto, Telefono, Cedula }

    const url = `${apiurl}/mb/generar-otp`;
    // console.log("[R4] Solicitando OTP en:", url);
    try {
      const dataToSend = {
        Banco: formData.Banco,
        Monto: total,
        Telefono: formData.Telefono,
        Cedula: `${formData.tipoDocumento}${formData.Cedula}`,
      };

      // console.log("[R4] Datos enviados para obtener OTP:", dataToSend);

      const res = await axios.post(url, dataToSend, {
        headers: apiPaymentHeader,
      });

      // console.log("[R4] Respuesta completa del backend al solicitar OTP:", res.data);


      const { success, message } = res.data;

      // // console.log(`[R4-DEBUG] getOtp: Respuesta desestructurada: success=${success}, message=${message}`);
      if (!success) {
         console.error("[R4] El backend respondió success:false al solicitar OTP. Mensaje:", message);
        setOtpMdalMode(3);
        setGetOtpErrorsMessage( // Aquí se establece el mensaje de error
          message ? message : "Consulta al banco el motivo del error"
        );
        return;
      }

      // console.log("[R4] OTP solicitado con éxito. Cambiando a modo 1 para introducir OTP.");
      setOtpMdalMode(1);
  } catch (error) {
    console.error("[R4-DEBUG] getOtp: Error en el bloque catch.", error.response?.data || error.message);
    setOtpMdalMode(3);
  }
  };

  const instaDebitCheckout = async () => {
  // console.log("[R4-DEBUG] instaDebitCheckout: Iniciando la función.");
  // console.log("[R4] Iniciando instaDebitCheckout con datos:", instaDebiAccData);
    // validamos los campos del Débito inmediato ocea instaDebiAccData nota
    //  optp es requerido y debe ser numerico y debete 8 numeros exato
    // ownerAcc es requerido si isOwner acc es falso

    const erros = {};

    if (!instaDebiAccData.Otp) {
      erros.Otp = "El código del Token es requerido.";
    } else if (!/^\d{8}$/.test(instaDebiAccData.Otp)) {
      erros.Otp = "El código del Token es invalido. ";
    }

    if (!instaDebiAccData.isOwnerAcc && !instaDebiAccData.ownerAcc) {
      erros.ownerAcc = "El nombre del titular es requerido";
    }

    if (Object.keys(erros).length > 0) {
      setIntaDebitAccErros(erros);
      return true; // Indica que la validación local falló
    }

    setOtpMdalMode(5); // Muestra "Verificando Token" ANTES de la llamada a la API
    // console.log("[R4-DEBUG] instaDebitCheckout: Validaciones pasadas.");
    // console.log("[R4] Datos del formulario OTP validados:", instaDebiAccData);
    setIntaDebitAccErros({});
    
    const {
      moneda,
      cliente,
      ac,
      monto,
      suscriptor,
      date,
      sub,
      paymentMethod,
      client_id,
      invoice_id,
      firstime,
      fullInvoiceData,
    } = hData;

    const subscriberId = sub || suscriptor || '';

    const commonPayload = getCommonPaymentPayload(hData, {
      total,
      tasaActual,
      paymentMethodName: "Debito Inmediato R4",
      paymentMethodCode: "r4",
      banco: "Banco R4",
      moneda: "Bolivares",
      ownerName: instaDebiAccData.isOwnerAcc ? hData.cliente : instaDebiAccData.ownerAcc,
      subscriberId,
      date: startDate
    });

    const conceptoParaDataToSend = commonPayload.concepto;

    const dataToSend = {
      Banco: formData.Banco,
      Cedula: `${formData.tipoDocumento}${formData.Cedula}`,
      Monto: total,
      Telefono: formData.Telefono,
      OTP: instaDebiAccData.Otp
    };

    dataToSend.Concepto = formatConcepto(conceptoParaDataToSend);
    dataToSend.Nombre = commonPayload.nombre;
    dataToSend.payload = commonPayload;

    // // Log para depurar los datos que se envían
    // console.log("R4PaymentForm - Datos a enviar para procesar pago:", dataToSend);
    // if (hData.firstime === 'true') {
    //     console.log("R4PaymentForm - Payload para first-time:", dataToSend.payload);
    // }

    // console.log("[R4] Enviando datos para procesar el pago:", dataToSend);

    const url = `${apiurl}/mb/debito-inmediato`;

    try {
      const res = await axios.post(url, dataToSend, {
        headers: apiPaymentHeader,
      });
      // console.log("[R4] Respuesta del backend al procesar el pago:", res.data);
      // modelo de repuesta exitosa del servidor

      // {
      //   "code": "ACCP",
      //   "message": "Operación Aceptada",
      //   "reference": "87882878",
      //   "id": "ce85d97e-2092-49f0-9f7d-3d5921f0b13c"
      //   }

      // modelo de repuesta del servidor cuando esta en repuesta de recibir el banco

      //   {
      //     "code": "AC00",
      //     "id": "ed645d72-5c94-4c93-9c71-8a72aa232797",
      //     "message": "Operación en Espera de Respuesta del Receptor"
      // }
 
      const { code, message, success, id, reference } = res.data;
      // console.log(`[R4-DEBUG] instaDebitCheckout: Respuesta desestructurada: code=${code}, message=${message}, success=${success}, id=${id}`);
 
      if (code === "ACCP") {
        setTransactionReference(reference); // Guardamos la referencia
        // console.log("[R4] Pago exitoso (ACCP). Cambiando a modo 6.");
        setOtpMdalMode(6);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false; // Indica que la validación local fue exitosa y se procedió con la transacción
        return;
      }

      if (code === "AC00") {
        // console.log("[R4] Operación en espera (AC00). Cambiando a modo 8 para iniciar verificación.");
        setDebitIdTransaction(id);
        setOtpMdalMode(8);
        return false; // Indica que la validación local fue exitosa y se procedió con la transacción
      }
      // if (code === "202") {
      //   console.log("Mensaje recibido satisfactoriamente, cambiando a modo 7");
      //   setTransationR4Message(message);
      //   setOtpMdalMode(7);
      //   return false;
      // }

      
      console.warn("[R4] Respuesta inesperada del backend. Cambiando a modo 4 (error).", res.data);
      setTransationR4Message(message || "Error al procesar el pago. Por favor, intente de nuevo.");
      setOtpMdalMode(4);
    } catch (error) {
      console.error("[R4-DEBUG] instaDebitCheckout: Error en el bloque catch.", error.response?.data || error.message); // eslint-disable-line no-console
      setTransationR4Message(error.response?.data?.message || "Error desconocido al procesar el pago.");
      setOtpMdalMode(4);
    }
    return false; // En caso de error en la llamada API, la validación local fue exitosa, pero la transacción falló.
  };

  const getBAnckName = (code) => {
    if (code) {
      const cuurentBank = instantDebitAccounts.find((acc) => {
        return acc.code === code;
      });

      return cuurentBank.name;
    }
    return "";
  };

  // esta funncion se invoca cuando si la operacion esta en repuesta al banco

  const chekPayment = useCallback(async  () => {
    // console.log("[R4-DEBUG] chekPayment: Iniciando la función.");
    const dataToSend = {
      Id: debitIdTransaction,
    };

    const url = `${apiurl}/mb/consulta-operaciones`;
    // console.log(`[R4] Verificando estado de la transacción ID: ${debitIdTransaction}`);

    try {
      const res = await axios.post(url, dataToSend, {
        headers: apiPaymentHeader,
      });
      // console.log("[R4] Respuesta de la verificación:", res.data);

      // las repuesta que pueden dar son
      // cuando la operacion esta en repuesta del banco esta en espera

      //   {
      //     "code": "AC00",
      //     "message": "Operación en Espera de Respuesta del Receptor",
      //     "success": false
      // }

      // cuando el banco receptor (R4) recibio el monto acordado

      //

      //   {
      //     "code": "ACCP",
      //     "reference": "68773620",
      //     "success": true
      // }

      const { code, message, reference } = res.data;
      // console.log(`[R4-DEBUG] chekPayment: Respuesta desestructurada: code=${code}, message=${message}`);

      if (res.data.code === "ACCP") {
        // console.log("[R4] Verificación exitosa (ACCP). Cambiando a modo 6.");
        setTransactionReference(reference); // Guardamos la referencia
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setOtpMdalMode(6);
        // console.log("[R4-DEBUG] chekPayment: Devolviendo 'true' por éxito.");
        return true; // Devolvemos `true` para indicar éxito.
      }

      if (res.data.code === "AC00") {
        // console.log("[R4] La operación sigue en espera (AC00). Se reintentará.");
        setTransationR4Message(res.data.message);
        // console.log("[R4-DEBUG] chekPayment: Devolviendo 'false' por estado en espera.");
        return false; // Devolvemos `false` para indicar que aún está en espera.
      }

      console.error("[R4] La verificación devolvió un estado de error. Cambiando a modo 4.", res.data);
      setOtpMdalMode(4);
      setTransationR4Message(res.data.message);
      // console.log("[R4-DEBUG] chekPayment: Devolviendo 'false' por estado de error.");
    } catch (error) {
      console.error("[R4] Error en la llamada de verificación:", error.response?.data || error.message);
    }
    return false; // Devolvemos `false` por defecto en caso de error o estado no manejado.
  }, [debitIdTransaction, apiurl, apiPaymentHeader]);
// const waitingRef = useRef(false);

// useEffect(() => {
//   if (otpMdalMode === 0 && !waitingRef.current) {
//     waitingRef.current = true;
//     const timer = setInterval(() => {
//       if (otpMdalMode !== 0) {
//         clearInterval(timer);
//         waitingRef.current = false;
//         // Aquí puedes ejecutar la acción que quieras cuando otpMdalMode cambie
//         // Por ejemplo: setOtpMdalMode(0);
//         setOtpMdalMode(0);
//       }
//     }, 1000);
//     return () => clearInterval(timer);
//   }
// }, [otpMdalMode]);

useEffect(() => {
  let timeoutId; // Declaramos timeoutId aquí para que esté en el ámbito de la función de limpieza.

  // Si el modo no es 8 (esperando respuesta), no hacemos nada.
  if (otpMdalMode !== 8) {
    return;
  }

  // console.log("[R4] MODO 8: Iniciando ciclo de verificación (while) con contador de 15s.");
  setCheckCount(0); // Reiniciamos el contador de verificaciones

  // AbortController para cancelar el bucle si el estado cambia.
  const controller = new AbortController();
  const signal = controller.signal;

  // 1. Lógica para el contador de la UI.
  setSegundosRestantes(initialSeconds);
  const countdownInterval = setInterval(() => {
    setSegundosRestantes(prev => (prev > 0 ? prev - 1 : 0));
  }, 1000);

  // 2. Función asíncrona que contiene el bucle `while`.
  const pollPayment = async () => {
    const startTime = Date.now(); 
    const timeout = initialSeconds * 1000; // Tiempo de espera total.

    while (Date.now() - startTime < timeout) {
      // Si el componente se desmonta o el modo cambia, el AbortController lo señalará.
      if (signal.aborted) {
        // console.log("[R4] Bucle de verificación abortado.");
        return;
      }

      setCheckCount(prev => prev + 1); // Incrementamos el contador en cada iteración
      // console.log("[R4] Verificando estado del pago dentro del bucle while...");
      const isPaymentSuccessful = await chekPayment();

      if (isPaymentSuccessful) {
        // console.log("[R4] Pago confirmado. Saliendo del bucle de verificación.");
        return; // Salimos del bucle `while` inmediatamente.
      }

      // Pausa asíncrona con un tiempo aleatorio entre 3 y 5 segundos.
      const delay = 3000; // Pausa fija de 3 segundos.
      const elapsedTime = Date.now() - startTime;
      const remainingTime = timeout - elapsedTime;

      // Si el tiempo restante es menor que la pausa aleatoria, esperamos solo lo que queda.
      const waitTime = Math.min(delay, remainingTime);

      // console.log(`[R4] Pausa de ${waitTime / 1000} segundos antes de la siguiente verificación.`);
      
      if (waitTime > 0) await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // 3. Si el bucle termina (por timeout), verificamos si aún estamos en modo 8.
    console.error("[R4] Tiempo de espera agotado (15s) en el bucle while.");
    setOtpMdalMode(currentMode => {
      if (currentMode === 8) {
        setTransationR4Message("Tiempo de espera agotado. No se pudo confirmar la transacción con el banco.");
        return 4; // Cambia a modo de error.
      }
      return currentMode; // Si ya cambió (a éxito, por ej.), no hacemos nada.
    });
  };

  timeoutId = setTimeout(pollPayment, 0); // Asignamos el valor aquí.

  // 4. Función de limpieza: se ejecuta si el componente se desmonta o si otpMdalMode cambia.
  return () => {
    // console.log("[R4] Saliendo del modo 8. Limpiando contador y abortando bucle.");
    clearInterval(countdownInterval);
    setCheckCount(0); // Limpiamos el contador al salir
    controller.abort(); // Envía la señal para detener el bucle `while`.
    if (timeoutId) clearTimeout(timeoutId); // Limpiamos el timeout solo si existe.
  };
}, [otpMdalMode, chekPayment]);



  return (
    <>
    <PaymentReminderModal isOpen={isReminderOpen} onClose={() => setIsReminderOpen(false)} />
      <form className="w-full mt-4">
        <div className="w-full flex justify-start items-center mb-2 form-title">
          <div className="main-svg">
            <R4Logo className="w-full h-full"/>
          </div>
          <h3>Débito Inmediato</h3>
        </div>

        <div className="input-box mt-4">
          <h5 className="mb-[16px]">
            Paso 1: Escriba los Datos de Pago Móvil Asociados a su Cuenta.
          </h5>
          <span className="font-medium">Banco*</span>
          <select
            name="Banco"
            id="Banco"
            className="w-full p-3"
            onChange={manejarCambio}
          >
            <option value="">Seleccione un Banco</option>
            {instantDebitAccounts.map((banco) => {
              return <option value={banco.code}>{banco.name}</option>;
            })}
          </select>          
          {errosOtpForm.Banco && (
            <p className="!text-red-600 text-sm mt-1">{errosOtpForm.Banco}</p>
          )}
        </div>
        <div className="my-2 flex flex-col">
          <Input
            isNumber={true}
            labelText={"Número de Teléfono*"}
            name={"Telefono"}
            description={null}
            onChange={manejarCambio}
            error={errosOtpForm.Telefono}
            value={formData.Telefono}
          />
        </div>
        <div className="input-box mt-4">
          <span className="font-semibold !mb-[8px]">Cédula*</span>
          <div className="flex gap-2 w-full">
            <select
              id="tipoDocumento"
              onChange={manejarCambio}
              className="p-2 !w-[140px]"
              name="tipoDocumento"
              value={formData.tipoDocumento}
            >
              <option value="">Seleccione</option>
              <option value="V">V</option>
              <option value="E">E</option>
            </select>
            <input
              type="number"
              className="w-full"
              id="Cedula"
              name="Cedula"
              value={formData.Cedula}
              onChange={manejarCambio}
              onWheel={(e) => e.target.blur()}
            />
          </div>
          {errosOtpForm.tipoDocumento && (
            <p className="!text-red-600 text-sm mt-1">{errosOtpForm.tipoDocumento}</p>
          )}
          {errosOtpForm.Cedula && (
            <p className="!text-red-600 text-sm mt-1">{errosOtpForm.Cedula}</p>
          )}
        </div>
        <h5 className="mt-[24px]">
          Paso 2: Solicite el Código de Verificación.
        </h5>
        <p className="mb-[24px]">
          Presione el botón para solicitar el código de verificación
        </p>
        <button
          type="button"
          className="bg-razzle-dazzle-rose-500 p-4 w-full mt-4 cursor-pointer rounded-xl text-white font-semibold base !border-none "
          disabled={disableSubmit}
          onClick={getOtp}
        >
          Solicitar código de verificación
        </button>
      </form>
      <div
        ref={modalRef}
        className="absolute w-full h-full  top-0  left-0 bg-gradient-to-b from-slate-700/30 to-slate-900/30 z-100 hidden"
      >
        <div className="rounded-2xl bg-sl-gray-100 w-full p-4 h-full flex flex-col justify-center opt-process">
          {otpMdalMode === 1 && (
            <>
              <form action="" className="w-full flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}
              >
                <div className="my-4">
                  <div className="p-4 rounded-[16px]">
                    <p className="mb-[16px]">
                      La clave del Token digital ha sido enviada al siguiente
                      número de teléfono.
                    </p>
                    <h3 className="text-sm font-medium flex items-center gap-2 justify-center w-full">
                      <span className="sl-opt-process-icon-mini">
                        <PhoneIcon />
                      </span>
                      <span>{formData.Telefono}</span>
                    </h3>
                  </div>

                  <p className="font-semibold">Clave Del Token digital*</p>
                  <Input
                    isNumber={true}
                    name={"Otp"}
                    onChange={manejarCambioOtp} 
                    error={intaDebitAccErros.Otp} 
                    value={instaDebiAccData.Otp}
                    className="!bg-sl-gray-200 !text-center !tracking-[8px] text-[20px]"
                  />

                  <p className="!text-slate-600 text-sm font-medium">
                    Por favor introduzca la clave del Token que le llegó por SMS.
                  </p>

                  {transationR4Message && otpMdalMode === 1 && (
                    <p className="!text-red-600 text-center text-sm font-medium p-[16px]">
                      {transationR4Message}
                    </p>
                  )}
                  {/* <label className="flex gap-4 items-center justify-between w-full mt-4">
                    <p className="my-[24px]">
                      Confirmo que yo {hData.cliente} soy el titular de la
                      cuenta a pagar
                    </p>
                    <input
                      type="checkbox"
                      className="accent-razzle-dazzle-rose-500 w-4 h-4"
                      defaultChecked={instaDebiAccData.isOwnerAcc}
                      onChange={() => {
                        setInstaDebiAccData({
                          ...instaDebiAccData,
                          isOwnerAcc: !instaDebiAccData.isOwnerAcc,
                        });
                      }}
                    />
                  </label> */}

                  {/* {!instaDebiAccData.isOwnerAcc && (
                    <p className="font-medium text-sm !text-slate-500 mt-2 ">
                      Si usted no es el titular de la cuenta a debitar, quite la
                      selección y escriba el nombre del titular.
                    </p>
                  )}
                  {!instaDebiAccData.isOwnerAcc && (
                    <div>
                      <p>Nombre del Titular*</p>
                      <Input
                        error={intaDebitAccErros.ownerAcc}
                        name={"ownerAcc"}
                        onChange={manejarCambioOtp}
                        value={instaDebiAccData.ownerAcc}
                      />
                    </div>
                  )} */}
                </div>
              </form>

              <button
                onClick={async () => {
                  // console.log("[R4] Click en 'Enviar Token'. Cambiando a modo 5 (procesando).");
                  setTransationR4Message(""); // Limpiamos el mensaje de error anterior.
                  instaDebitCheckout(); // La función ahora maneja todos los cambios de estado.
                }}
                className="text-white w-full text-center bg-slate-700 p-2 rounded-2xl font-medium  hover:cursor-pointer base !mb-4 !border-none"
              >
                Enviar Token
              </button>
            </>
          )}

          {otpMdalMode === 0 && (
            <>
              <h3 className="text-xl font-semibold text-sl-gray-900 text-center">
                ¡Solicitando el Token!
              </h3>

              <div className="w-full flex justify-center my-[40px]">
                <div>
                  <div className="loader"></div>
                </div>
              </div>
              <div className="text-center">
                <div className="flex justify-center">
                  <div className="sl-opt-process-icon">
                    <Mail />
                  </div>
                </div>
                <p className="inline-block !text-sl-gray-800 text-[14px] font-medium p-[16px]">
                  El banco{" "}
                  <span className="uppercase font-semibold">
                    {getBAnckName(formData.Banco)}
                  </span>{" "}
                  te enviará un mensaje de texto con el Token de aprobación.
                </p>
              </div>

              <div className="w-full"></div>
            </>
          )}

          {otpMdalMode === 3 && (
            <>
              <h3 className="text-center my-[24px] text-sl-red-600">¡Error al solicitar Token!</h3>
              <div className="flex justify-center">
                <div className="sl-opt-process-icon">
                  <ErrorIcon />
                </div>
              </div>

              <div className="w-full relative bg-sl-gray-100 border border-sl-gray-400 text-sl-gray-700 px-4 py-3 rounded-lg mt-4 text-center">
                <strong className="font-bold block">El banco rechazó la solicitud.</strong>
                <span className="block sm:inline">{getOtpErrorsMessage}</span>
                <p className="text-sm mt-2">
                  Por favor, verifique que los datos 
                  <span className="font-semibold text-sl-red-700">
                    (banco, teléfono, cédula) 
                    </span>
                    sean correctos e intente de nuevo.
                </p>
              </div>
            </>
          )}
          {otpMdalMode === 4 && (
            <>
              <h3 className="text-center text-sl-red-600">¡Error en la Transacción!</h3>
              <div className="my-4 w-full flex justify-center">
                <div className="sl-opt-process-icon">
                  <ErrorIcon />
                </div>
              </div>
              <div className="w-full relative bg-sl-gray-100 border border-sl-gray-400 text-sl-gray-700 px-4 py-3 rounded-lg mt-4 text-center">
                <strong className="font-bold block">No se pudo completar el pago.</strong>
                {transationR4Message && (
                  <span className="block sm:inline mt-1 text-sl-red-700">{transationR4Message}</span>
                )}
                <p className="text-sm mt-2">
                  Por favor, verifique su cuenta bancaria para confirmar si el monto fue debitado. Si el débito se realizó, contacte a soporte.
                </p>
              </div>
              <div className="w-full flex justify-center">
                <a
                  href="https://wa.me/584126389082"
                  className="flex gap-2 items-center py-[24px]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sl-opt-process-icon-mini">
                    <WhatsappIcon />
                  </span>
                  <span className="!text-slate-500 font-medium text-sm ">
                    Contactar soporte
                  </span>
                </a>
              </div>
            </>
          )}
          {otpMdalMode === 5 && (
            <>
            
              <h3 className="text-center">¡Verificando el Token!</h3>
              <div className="w-full flex justify-center">
                <div className="loader my-[32px]"></div>
              </div>
              <div className="text-center">
                <div className="flex justify-center">
                  <div className="sl-opt-process-icon">
                    <Mail />
                  </div>
                </div>
                <p className="inline-block">
                  Estamos verificando la validacion del Token
                </p>
              </div>
            </>
          )}
          {otpMdalMode === 6 && (
            <TrasactionProgress
              step={3} // Set step to 3 for success state
              chageStep={closeModal} // Pass closeModal to handle closing the modal
              messageSucces={
                <SuccessComponent
                  message={`¡Pago Exitoso! El aviso de cobro ${hData.ac} ha sido pagado.`}
                  transactionInfo={
                    <>
                      <h4 className="border-b-sl-gray-800 border-b text-center text-sl-blue-700">
                        Información de la Transacción
                      </h4>
                      <div className="sl-invocie-item !p-0">
                        <p>Aviso de cobro:</p>
                        <p>
                          {hData.firstime === 'true'
                            ? (() => {
                                const allFirstTimeInvoices = JSON.parse(sessionStorage.getItem('allFirstTimeInvoices') || '[]');
                                return allFirstTimeInvoices.map(inv => inv.invoice_number).join(', ') || hData.fullInvoiceData?.invoice_number;
                              })()
                            : (hData.ac ? "ac" : "customer_balance") === "customer_balance"
                              ? JSON.parse(sessionStorage.getItem('invoices') || '[]')
                                  .filter(inv => inv.balance > 0)
                                  .map(inv => inv.invoice_number).join(', ') || 'Varios'
                              : hData.ac}
                        </p>
                      </div>
                      <div className="sl-invocie-item !p-0"><p>Forma de Pago:</p><p>Débito Inmediato</p></div>
                      <div className="sl-invocie-item !p-0"><p>Referencia:</p><p>#{transactionReference}</p></div>
                      <div className="sl-invocie-item !p-0 !border-b-sl-gray-800"><p>Fecha de Depósito:</p><p>{startDate ? startDate.toLocaleDateString() : 'N/A'}</p></div>
                      <div className="sl-invocie-item !p-0"><p>Monto Pagado:</p><h4>{total} Bs</h4></div>
                    </>
                  }
                />
              }
            />
          )}
          {otpMdalMode === 7 && (
            <>
              <h3 className="text-center">
                Verificación de la transacción
              </h3>
              <p className="p-[24px] text-center">
                La transacción se ejecutó correctamente; sin embargo, para verificar si todo salió en orden
              </p>
              <p className="text-center  p-[16px]">
                Haga click en verificar pago
              </p>
              <div className="w-full flex justify-center my-4">
                <button
                onClick={() => setOtpMdalMode(8)}                  
                >
                  Verificar Pago
                </button>
              </div>
            </>
          )}

          {otpMdalMode === 8 && (
            <>
              <h3 className="text-center">
                ¡Validando transacción!
              </h3>
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto my-4">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Círculo de fondo */}
                    <circle
                      className="text-sl-gray-200"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                    />
                    {/* Círculo de progreso */}
                    <circle
                      className="text-sl-pink-600"
                      strokeWidth="10"
                      strokeDasharray={283}
                      strokeDashoffset={283 - (segundosRestantes / initialSeconds) * 283}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-2xl font-bold text-sl-pink-600">{segundosRestantes}</span>
                </div>
                <div className="flex justify-center w-full mt-4">
                  <div className="sl-opt-process-icon">
                    <Mail />
                  </div>
                </div>
                <p className="inline-block p-[16px]">
                  Estamos validando la transacción, por favor espere...
                </p>
                {segundosRestantes === 0 && <p className="!text-sl-pink-600 font-semibold">Recibiendo respuesta del banco...</p>}
              </div>
            </>
          )}

          {otpMdalMode === 9 && (
            <>
              <h3 className="text-center mb-[16px]">
                Estado de la Operación
              </h3>

              <p className="text-center">Resultado de la Operación</p>
              {transationR4Message && (
                <p className="text-center p-[16px]">
                  {transationR4Message}
                </p>
              )}
              <button
              className="!mt-[16px] !mb-[16px]"
                onClick={() => setOtpMdalMode(8)}
              >
                Volver a Verificar
              </button>
            </>
          )}

          {(otpMdalMode > 0 && otpMdalMode !== 5 && otpMdalMode !== 6) && (
            <>
              <div className="w-full h-[1px] bg-sl-gray-500 my-4]"></div>
              <button
                className="base !mt-4 !border-none"
                onClick={closeModal}
              >
                Cerrar Modal
              </button>
            </>
          )}
          {otpMdalMode === 1 && (
            <>
              <p className="flex justify-center flex-col items-center text-center p-[16px]">
                ¿No has recibido tu Token?<br></br> ¡No te preocupes!
                <br></br>Puedes hacer click en{" "}
                <p
                className="font-bold cursor-pointer bg-sl-pink-500 p-3 m-1 hover:underlin hover:text-white w-fit rounded-2xl base"                 
                  onClick={() => {
                    setOtpMdalMode(0);
                    getOtp();
                  }}
                >
                  Volver a enviar
                </p>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
