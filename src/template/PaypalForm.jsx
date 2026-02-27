import React, { useState, useEffect, useRef } from "react";
import PaypalPink from "../icons/PaypalPink";
import Copy from "../icons/Copy";
import Input from "../componet/Input";
import FIleInput from "../componet/FIleInput";
import { mediaApiUrl } from "../util/proyect-config";
import axios from "axios";
import FlaticonWarnigRed from "../icons/FlaticonWarnigRed";
import paypalCompact from "../icons/logo-paypal-svgrepo.svg";
import paipayVertical from "../icons/PayPal_Logo_vetical.svg";
import TrasactionProgress from "./TrasanctionProsess"; 
import DateInput from "../componet/DateInput";
import SuccessComponent from "../componet/SuccessComponent";
import { getCommonPaymentPayload } from "../utils/payment-payload-helper";
import PaymentReminderModal from "../componet/PaymentReminderModal";

export default function PaypalForm({ hData, tasaActual, total, montoItf, disableSubmit, methodConfig = {} }) {
  // Log para corroborar las props recibidas por el componente
  // console.log("Props recibidas en PaypalForm:", { hData, tasaActual, total });

  const [startDate, setStartDate] = useState(new Date());
  const [notification, setNotification] = useState({ show: false, message: '' });

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 2000); // La notificación se oculta después de 2 segundos
  };

  
  const [formDataState, setFormDataState] = useState({
    owner: "",
    ref: "",
    date: "",
    montoPagado: "",
    file: "",
  });

  const [errosState, setErrosState] = useState({});
  const [step, setStep] = useState(0);
  const [failMessage, setFailMessage] = useState(null);

  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const changeStep = (step) => {
    setStep(step);
  };

  const sendData = async () => {
    // Logs de diagnóstico
    // console.log("Iniciando sendData en PaypalForm...");
    // console.log("Valor de hData.firstime:", hData.firstime);
    // console.log("¿hData.firstime es 'true'?", hData.firstime === 'true');
    // console.log("Valor de hData.fullInvoiceData:", hData.fullInvoiceData);
    // console.log(formDataState);
    // console.log(hData);

    // validamos los campos obligatorios
    let errors = {};

    if (!formDataState.owner) {
      errors.owner = "El nombre del titular es obligatorio";
    }
    if (!formDataState.ref) {
      errors.ref = "El Numero de Referencia es Obligatorio";
    }
    if (!formDataState.file) {
      errors.file = "El archivo es obligatorio";
    }
    if (!formDataState.montoPagado) {
      errors.montoPagado = "El monto pagado es obligatorio";
    }

    if (Object.keys(errors).length > 0) {
      setErrosState(errors);
      return;
    }
    setErrosState({});

    const isPartial = parseFloat(String(formDataState.montoPagado).replace(',', '.')) < parseFloat(total);
    setIsPartialPayment(isPartial);

    changeStep(1);

    // 1. Determinar el modo de operación.
    const mode = hData.firstime === 'true' && hData.fullInvoiceData
      ? 'first-time'
      : (hData.ac ? 'ac' : 'customer_balance');

    // 2. Asignar el valor de paymentMethod condicionalmente.
    const paymentMethodValue = mode === 'ac' ? 'paypal' : 'PayPal';

    const fromDataToSend = new FormData();
    // --- INICIO DE LA CORRECCIÓN ---
    // Unificar el ID del suscriptor para asegurar que siempre se envíe el valor correcto.
    const subscriberId = hData.sub || hData.suscriptor || '';
    fromDataToSend.append("file", formDataState.file);
    fromDataToSend.append("owner", formDataState.owner);
    fromDataToSend.append("ref", formDataState.ref); // 'ref' ahora es el nombre completo del suscriptor.
    fromDataToSend.append("depositDate", startDate);

    // Usamos el helper para obtener los datos comunes
    const commonPayload = getCommonPaymentPayload(hData, {
      total,
      tasaActual,
      paymentMethodName: "PayPal",
      paymentMethodCode: paymentMethodValue, // "paypal" o "PayPal" según lógica anterior
      banco: "PayPal",
      moneda: "Divisas",
      ownerName: formDataState.owner,
      subscriberId,
      date: startDate,
      montoItf: montoItf, // Pasamos el montoItf al helper
    });

    // Agregamos los datos comunes al FormData
    Object.keys(commonPayload).forEach(key => {
      let value = commonPayload[key];
      if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
        value = JSON.stringify(value);
      }
      fromDataToSend.append(key, value);
    });

    const url = mediaApiUrl + "/boucher/paypal";

    try {
      const res = await axios.post(url, fromDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // console.log(res.data);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      changeStep(3);
    } catch (error) {
    setFailMessage(
    error?.response?.data?.message ||
    error?.message ||
    "Error desconocido"
    );
    changeStep(2);
    }
  };

  const copyClipboar = async (data, name) => {
    try {
      await navigator.clipboard.writeText(String(data));
      showNotification(`${name} copiado al portapapeles`);
    } catch (error) {
      showNotification("Error al copiar");
    }
  };

  return (
    <>
    <PaymentReminderModal isOpen={isReminderOpen} onClose={() => setIsReminderOpen(false)} />
      {notification.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-sl-blue-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-opacity duration-300 animate-fade-in-down">
          <p>{notification.message}</p>
        </div>
      )}
      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendData();
          }}
        >
          <p>Método de Pago:</p>
          <div className="flex justify-start items-center gap-[8px] form-title !mb-[24px]">
            <img
              src={paypalCompact}
              alt="paypal-compat-logo"
              className="!h-[40px]"
            />
            <h3 className="!font-semibold mb-[16px]">Transferencia PayPal</h3>
          </div>

          <div className="py-[24px] w-full warnig-message !mt-[8px] flex flex-col items-center text-center">
            <h4 className="flex justify-start gap-[0.5em] !mb-[12px]">
              <span className="svg-h4">
                <FlaticonWarnigRed />
              </span>
              <span>Importante</span>
              <span className="svg-h4">
                <FlaticonWarnigRed />
              </span>
            </h4>
            <p className="text-base rounded-2xl font-semibold">
              La Verificación de la Transferencia Puede Tardar Entre 24 y 48
              Horas.
            </p>
          </div>
          <h5 className="!my-[2em] !text-sl-gray-700">
            Paso 1: Coloque los Datos de Nuestra Cuenta de PayPall.
          </h5>
          <div className="p-4  my-4 bg-gradient-to-r from-sl-blue-300 to-sl-pink-300">
            <div className="flex w-full justify-between border-b border-b-sl-gray-50 p-[16px]">
              <h4>Datos de Pago</h4>
              <img
                src={paipayVertical}
                alt="logo del banco"
                className="!h-[60px]"
              />
            </div>
            <div className="mt-[16px]">
              <div className="flex w-full justify-between relative  p-2">
                <p>Correo:</p>
                <p
                  className="hover:cursor-pointer"
                  onClick={() => copyClipboar("luis.villarroel@certifikte.com", "Correo")}
                >
                  luis.villarroel@certifikte.com
                </p>
                <span className="absolute right-0 top-0 [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <p className="font-semibold">Monto a Pagar</p>
              <h3 className="mt-[8px] cursor-pointer relative"
                  onClick={() => copyClipboar(total, "Monto")}>
                {total} US$
                <span className="absolute right-[-10px] top-[-8px]">
                  <Copy />
                </span>
              </h3>
            </div>
          </div>
          <h5 className="!my-[2em] !text-sl-gray-700">
            Paso 2: Coloque los Datos Asociados al Pago.
          </h5>

          <div className="mt-4 mb-4">
            <Input
              className="text-sm font-semibold"
              labelText={"Titular de la Cuenta*"}
              name={"owner"}
              description={"Coloque el nombre EXACTO del titular de la cuenta"}
              isNumber={false}
              placeholder="Nombre Apellido"
              value={formDataState.owner}
              onChange={(e) =>
                setFormDataState({ ...formDataState, owner: e.target.value })
              }
              error={errosState.owner}
            />

            <div className="flex flex-col sm:flex-row gap-2 justify-between w-full items-end">
              <div className="w-full sm:w-1/2">
                <DateInput
                  labelText="Fecha de Depósito*"
                  value={startDate}
                  onChange={setStartDate}
                  error={errosState.date}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <Input
                className="text-sm font-semibold"
                  labelText={"Nombre del Suscriptor*"}
                  name={"ref"}
                  description={""}
                  isNumber={false}
                  placeholder="Nombre exacto del Suscriptor"
                  onChange={(e) =>
                    setFormDataState({ ...formDataState, ref: e.target.value })
                  }
                  value={formDataState.ref}
                  error={errosState.ref}
                />
              </div>
            </div>
            <div className="mb-2">
              <Input
                className="text-sm font-semibold"
                labelText={"Monto Pagado*"}
                name={"montoPagado"}
                description={"Coloque el monto exacto que pagó"}
                isNumber={true}
                placeholder="0.00"
                value={formDataState.montoPagado}
                onChange={(e) =>
                  setFormDataState({ ...formDataState, montoPagado: e.target.value })
                }
                error={errosState.montoPagado}
              />
            </div>

            <FIleInput
              name={"file"}
              erros={errosState.file}
              onChange={(file) => {
                setFormDataState({ ...formDataState, file });
              }}
            />
          </div>
          <button className="my-[32px] base !border-none" disabled={disableSubmit} type="submit">
            Reportar Pago
            </button>
        </form>
      )}
      <TrasactionProgress
        step={step}
        chageStep={changeStep}
        // ... (other props)
        processTitle={"Reportando Pago"}
        failMessage={
          <div className="w-full flex flex-col items-center">
            <p className="font-bold mb-2">Se produjo un error al intentar procesar el pago.</p>
            {failMessage && <p className="text-red-500">{failMessage}</p>}
          </div>
        }
        meesageProcess={
          <p className="max-w-[300px]  text-center">
            Los datos de su transferencia por PayPal se están enviando.
          </p>
        }
        messageSucces={
          <SuccessComponent
            message={
              isPartialPayment ?
                "Los datos fueron recibidos correctamente pero no ha pagado el monto completo" :
              (formDataState.montoPagado && total && parseFloat(String(formDataState.montoPagado).replace(',', '.')) > parseFloat(total)) ?
                "Gracias por su pago." :
                "Los datos fueron recibidos correctamente."
            }
            isPartialPayment={isPartialPayment}
            transactionInfo={
              <>
                <h4 className="text-center border-b-sl-gray-800 border-b !text-sl-blue-600">
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
                <div className="sl-invocie-item !p-0"><p>Forma de Pago:</p><p>PayPal</p></div>
                <div className="sl-invocie-item !border-b-sl-gray-800 !p-0"><p>Fecha de Depósito:</p><p>{startDate ? startDate.toLocaleDateString() : 'N/A'}</p></div>
                <div className="sl-invocie-item !p-0"><p>Monto Reportado:</p><h4>{total} US$</h4></div>
                <div className="w-full flex flex-col items-center text-center font-bold"><p className="text-base rounded-2xl font-semibold !text-sl-blue-600">¡Recuerda! <br />La verificación de la transferencia puede tardar entre 24 y 48 horas.</p></div>
              </>
            }
          />
        }
      />
    </>
  );
}
