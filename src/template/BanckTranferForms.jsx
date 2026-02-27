import React, { useState } from "react";
import BancoR4Logo from "../icons/r4logo.svg";
import Copy from "../icons/Copy";
import Input from "../componet/Input";
import FIleInput from "../componet/FIleInput";
import { mediaApiUrl, DUMMY_MODE } from "../util/proyect-config";
import FlaticonTansfres from "../icons/FlaticonTansfres";
import FlaticonTransferBlack from "../icons/FlaticonTransferBlack";
import FlaticonWarnigRed from "../icons/FlaticonWarnigRed";
import TrasactionProgress from "./TrasanctionProsess";
import BNCLogo from "../icons/Banco_Nacional_de_Credito.svg";
import DateInput from "../componet/DateInput";
import SuccessComponent from "../componet/SuccessComponent";
import { getMultipartPaymentPayload } from "../utils/payment-payload-helper";
import PaymentReminderModal from "../componet/PaymentReminderModal";
import BancoDeVenezuelaLogo from "../icons/Banco_de_Venezuela_logo.svg";

export default function BanckTranferForms({ hData, tasaActual, total, disableSubmit, methodConfig = {}, setSelectedDate }) {
  // --- ESTADOS ---
  const [isReminderOpen, setIsReminderOpen] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [tranferRef, setTranferRef] = useState("");
  const [file, setFile] = useState(null);
  const [montoPagado, setMontoPagado] = useState("");
  const [errorsState, setErrosState] = useState({});
  const [step, setStep] = useState(0);
  const [failMessage, setFailMessage] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // --- FUNCIONES AUXILIARES ---

  // Muestra una notificación temporal en la pantalla.
  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 2000);
  };

  // Copia un texto al portapapeles y muestra una notificación.
  const copyToClipboard = async (data, name) => {
    try {
      await navigator.clipboard.writeText(String(data));
      showNotification(`${name} copiado al portapapeles`);
    } catch (error) {
      showNotification("Error al copiar");
    }
  };

  // Cambia el paso actual del proceso de transacción (0: form, 1: loading, 2: error, 3: success).
  const changeStep = (step) => {
    setStep(step);
  };

  // Procesa el número de referencia para tomar los últimos 6 dígitos y eliminar ceros a la izquierda.
  const procesarReferencia = (ref) => {
  if (ref.length > 6) {
    // Tomar los últimos 6 caracteres
    let ref6 = ref.slice(-6);

    // Eliminar ceros al inicio
    ref6 = ref6.replace(/^0+(?=\d)/, '');

    return ref6;
  }
  // Si no es mayor a 6, devolver original sin cambios
  return ref;
  };

  // --- LÓGICA PRINCIPAL ---

  // Valida y envía el reporte de la transferencia.
  const sendTranfer = async () => {
    const erros = {};

    if (!file) erros.file = "Archivo Requerido";
    if (!tranferRef) erros.ref = "Numero de Referencia Requerido";
    if (!startDate) erros.date = "Fecha Requerida";
    if (!montoPagado) erros.montoPagado = "El Monto Pagado Obligatorio";

    if (Object.keys(erros).length > 0) {
      setErrosState(erros);
      return;
    }
    const isPartial = parseFloat(String(montoPagado).replace(',', '.')) < parseFloat(total);
    setIsPartialPayment(isPartial);

    changeStep(1);

    // --- DUMMY MODE ---
    // if (DUMMY_MODE) {
    //   console.group("🔌 [DUMMY MODE] BanckTranferForms: Reporte de Transferencia");
    //   console.log("� Datos del Formulario:", { tranferRef, montoPagado });
    //   console.log("� Datos a Enviar (Payload simulado):", {
    //       depositDate: startDate,
    //       ref: procesarReferencia(tranferRef),
    //       montoPagado,
    //       file: file ? file.name : "No file"
    //   });

    //   setTimeout(() => {
    //     console.log("✅ Respuesta Simulada:", { status: "success", message: "Transferencia reportada" });
    //     console.groupEnd();
    //     window.scrollTo({ top: 0, behavior: 'smooth' });
    //     changeStep(3);
    //   }, 2000);
    //   return;
    // }
    // ------------------

    const fromData = new FormData();
    fromData.append("file", file);

    const bankMap = {
      bnc: 'Banco Nacional de Crédito',
      r4: 'Banco R4',
      bdv: 'Banco de Venezuela 219040'
    };
    const banco = bankMap[methodConfig.bank] || 'Sin cuenta asociada';

    const subscriberId = hData.sub || hData.suscriptor || '';

    const commonPayload = getMultipartPaymentPayload(hData, {
      total,
      amountPaid: total,
      tasaActual,
      paymentMethodName: "Transferencia bancaria",
      banco,
      moneda: "Bolivares",
      ownerName: hData.cliente,
      subscriberId,
      date: startDate,
      reference: procesarReferencia(tranferRef),
      montoItf: 0, // Transferencias en Bs no suelen llevar IGTF en este contexto
    });

    Object.keys(commonPayload).forEach(key => {
      let value = commonPayload[key];
      if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
        value = JSON.stringify(value);
      }
      fromData.append(key, value);
    });
    
    fromData.append("zelleBanck", ""); // Campo vacío requerido por backend legacy

    if (total && tasaActual && tasaActual > 0) {
      const montoEnDolares = parseFloat(total) / parseFloat(tasaActual);
      fromData.append("monto_zoho", montoEnDolares.toFixed(2));
    }

    const url = mediaApiUrl + "/boucher/traferencia";

    try {
      const response = await fetch(url, {
        method: "POST",
        body: fromData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error en la solicitud" }));
        throw new Error(errorData.message || "Error en la solicitud");
      }

      const data = await response.json();

      if (data.status === "error") {
        setFailMessage(data.message);
        changeStep(2);
        return;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });

      changeStep(3);
    } catch (error) {
      setFailMessage(error?.message || "Ocurrió un error al procesar el pago");
      changeStep(2);
      return;
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
          className="w-full"
          onSubmit={(e) => {
            e.preventDefault();
            sendTranfer();
          }}
        >
          <div className="w-full flex justify-start gap-[8px] items-center mb-2 form-title">
            <div className="main-svg ">
              <FlaticonTransferBlack className="w-full h-full" />
            </div>
            <h3>Transferencia</h3>
          </div>
            <div className="py-3 w-full warnig-message !mt-1 flex flex-col items-center text-center">
            <h4 className="flex justify-start gap-[0.5em] !mb-1">
              <span className="svg-h4">
                <FlaticonWarnigRed />
              </span>
              <span>Importante</span>
              <span className="svg-h4">
                <FlaticonWarnigRed />
              </span>
            </h4>
            <p className="text-sm rounded-2xl font-semibold">
              La Verificación de la Transferencia Puede Tardar Entre 24 y 48 Horas.
            </p>
          </div>

          <h4 className="!text-sl-gray-700 text-sm font-semibold py-2">
            Paso 1: Coloque los Datos de Nuestra Cuenta Bancaria.
          </h4>
          <div className="p-3 bg-gradient-to-r from-sl-pink-200 to-sl-blue-200  border-sl-gray-850 mb-3 rounded-lg">            
          {(methodConfig.bank === "bdv" || !methodConfig.bank) && (
            <>
          <div className="w-full  flex justify-between items-center mb-2 border-b border-b-sl-gray-50 pb-2">
              <h4 className="text-sm font-bold">Datos de Pago</h4>
              <img
                src={BancoDeVenezuelaLogo}
                alt="logo del banco"
                className="h-4 w-27"
              />
            </div>
            
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Cuenta Corriente:</p>{" "}
              <p
                className="hover:cursor-pointer relative"
                onClick={() => copyToClipboard("01020455140000219040", "Cuenta")}
              >
                0102-0455-140000219040
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Nombre:</p>{" "}
              <p
                className="relative hover:cursor-pointer"
                onClick={() => copyToClipboard("Corporación Quantum Link C.A.", "Nombre")}
              >
                Corporación Quantum Link C.A.
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Rif:</p>{" "}
              <p
                className="relative hover:cursor-pointer"
                onClick={() => copyToClipboard("500004630", "RIF")}
              >
                J-50000463-0
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="flex flex-col items-center mt-2">
              <p className="font-semibold text-sm">Monto a Pagar</p>
              <h3 className="mt-1 cursor-pointer relative text-lg"
                  onClick={() => copyToClipboard(total, "Monto")}>
                {total} Bs
                <span className="absolute right-[-10px] top-[-8px]">
                  <Copy />
                </span>
              </h3>
            </div>    
            </>    
          )}

          {(methodConfig.bank === "bnc" || !methodConfig.bank) && (
            <>
          <div className="w-full  flex justify-between items-center mb-2 border-b border-b-sl-gray-50 pb-2 mt-2">
              <h4 className="text-sm font-bold">Datos de Pago</h4>
              <img
                src={BNCLogo}
                alt="logo del banco"
                className="h-4 w-18"
              />
            </div>
            
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Cuenta Corriente:</p>{" "}
              <p
                className="hover:cursor-pointer relative"
                onClick={() => copyToClipboard("01910054502154034151", "Cuenta")}
              >
                0191-0054-502154034151
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Nombre:</p>{" "}
              <p
                className="relative hover:cursor-pointer"
                onClick={() => copyToClipboard("Corporación Quantum Link C.A", "Nombre")}
              >
                Corporación Quantum Link C.A.
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Rif:</p>{" "}
              <p
                className="relative hover:cursor-pointer"
                onClick={() => copyToClipboard("500004630", "RIF")}
              >
                J-50000463-0
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="flex flex-col items-center mt-2">
              <p className="font-semibold text-sm">Monto a Pagar</p>
              <h3 className="mt-1 cursor-pointer relative text-lg"
                  onClick={() => copyToClipboard(total, "Monto")}>
                {total} Bs
                <span className="absolute right-[-10px] top-[-8px]">
                  <Copy />
                </span>
              </h3>
            </div>
            </>
          )}

          {(methodConfig.bank === "r4" || !methodConfig.bank) && (
            <>
          <div className="w-full  flex justify-between items-center mb-2 border-b border-b-sl-gray-50 pb-2 mt-2">
              <h4 className="text-sm font-bold">Datos de Pago</h4>
              <img
                src={BancoR4Logo}
                alt="logo del banco"
                className="h-2 w-20"
              />
            </div>

            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Cuenta Corriente:</p>{" "}
              <p
                className="hover:cursor-pointer relative"
                onClick={() => copyToClipboard("01690001011001578323", "Cuenta")}
              >
                0169-0001-01-10-01578323
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Nombre:</p>{" "}
              <p
                className="relative hover:cursor-pointer"
                onClick={() => copyToClipboard("Corporación Quantum Link C.A.", "Nombre")}
              >
                Corporación Quantum Link C.A.
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="w-full flex justify-between items-center text-sm">
              <p className="sl-text-sm font-semibold">Rif:</p>{" "}
              <p
                className="relative hover:cursor-pointer"
                onClick={() => copyToClipboard("500004630", "RIF")}
              >
                J-50000463-0
                <span className="absolute right-[-10px] top-[-8px] [&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div>
            <div className="flex flex-col items-center mt-2">
              <p className="font-semibold text-sm">Monto a Pagar</p>
              <h3 className="mt-1 cursor-pointer relative text-lg"
                  onClick={() => copyToClipboard(total, "Monto")}>
                {total} Bs.
                <span className="absolute right-[-10px] top-[-8px]">
                  <Copy />
                </span>
              </h3>
            </div>
            </>
          )}
          </div> 

          <h5 className="font-medium text-sm text-gray-500 mt-4 mb-2">
            Paso 2: Indique los Datos de la Cuenta desde la cual Realizó el Pago.
          </h5>

          <div className="flex gap-2 justify-between items-end">
            <div className="w-1/2">
              <DateInput
                labelText="Fecha de Depósito*"
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  if (setSelectedDate) setSelectedDate(date);
                }}
                error={errorsState.date}
              />
            </div>
            <div className="w-1/2">
              <Input
                isNumber={true}
                className="text-sm font-semibold"
                labelText={"Referencia*"}
                name={"ref"}
                description={""}
                value={tranferRef}
                placeholder="Ultimos 6 Digitos"
                minlength="6"
                maxlength="13"
                onChange={(e) => setTranferRef(e.target.value)}
                error={errorsState.ref}
              />
            </div>
          </div>
          <div className="">
          <Input
            className="text-sm font-semibold"
            labelText={"Monto Pagado*"}
            name={"montoPagado"}
            description={"Coloque el monto exacto que pagó"}
            isNumber={true}
            placeholder="0.00"
            value={montoPagado}
            onChange={(e) =>
              setMontoPagado(e.target.value)
            }
            error={errorsState.montoPagado}
          />
          </div>
          <div className="w-full">
            <p className="text-sm font-semibold !mb-1">Comprobante de Pago*</p>
            <FIleInput onChange={setFile} erros={errorsState.file || ""} />
          </div>

          <div className="flex justify-end">
        <button className="base !border-none my-2" disabled={disableSubmit}>
          Reportar Pago
        </button>          
        </div>
        </form>
      )}

      <TrasactionProgress
        step={step}
        chageStep={changeStep}
        processTitle={"Reportando Pago"}
        failMessage={
          <div className="w-full flex flex-col items-center text-white">
            <div className="w-full relative bg-sl-gray-900 border border-sl-gray-700 text-white px-4 py-3 rounded-lg mt-4 text-center">
              <strong className="font-bold block text-amber-500">
                Mensaje del Sistema
              </strong>
              <span className="block sm:inline mt-1 text-yellow-600 font-semibold">
                {failMessage || "No se pudo procesar el reporte."}
              </span>
              <p className="text-sm mt-2 text-gray-300">
                Por favor, verifique los datos e intente de nuevo. Si el problema persiste, contacte a soporte.
              </p>
            </div>
          </div>
        }
        meesageProcess={
          <p className="max-w-[300px]  text-center">
            Los datos de su TransferenciaBancaria se esta Enviando
          </p>
        }
        messageSucces={
          <SuccessComponent
            message={
              isPartialPayment ? 
                "Los datos fueron recibidos correctamente pero no ha pagado el monto completo" :
              (montoPagado && total && parseFloat(String(montoPagado).replace(',', '.')) > parseFloat(total)) ?
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
                          try {
                            const allFirstTimeInvoices = JSON.parse(sessionStorage.getItem('allFirstTimeInvoices') || '[]');
                            return allFirstTimeInvoices.map(inv => inv.invoice_number).join(', ') || hData.fullInvoiceData?.invoice_number;
                          } catch (e) {
                            return hData.fullInvoiceData?.invoice_number || "";
                          }
                        })()
                      : (hData.ac ? "ac" : "customer_balance") === "customer_balance"
                        ? (() => {
                            try {
                              return JSON.parse(sessionStorage.getItem('invoices') || '[]')
                                .filter(inv => inv.balance > 0)
                                .map(inv => inv.invoice_number).join(', ') || 'Varios';
                            } catch (e) { return 'Varios'; }
                          })()
                        : hData.ac}
                  </p>
                </div>
                <div className="sl-invocie-item !p-0"><p>Forma de pago:</p><p>Transferencia Bancaria</p></div>
                <div className="sl-invocie-item !border-b-sl-gray-800 !p-0"><p>Fecha de Depósito:</p><p>{startDate ? startDate.toLocaleDateString() : 'N/A'}</p></div>
                <div className="sl-invocie-item !p-0"><p>Monto Reportado:</p><p>{total}Bs.</p></div>
                <div className="w-full flex flex-col items-center text-center font-bold"><p className="text-base rounded-2xl font-semibold !text-sl-blue-600">¡Recuerda! <br />La verificación de la transferencia puede tardar entre 24 y 48 horas.</p></div>
              </>
            }
          />
        }
      />
    </>
  );
}
