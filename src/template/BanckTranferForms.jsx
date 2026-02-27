import React, { useState } from "react";
import BancoDeVenezuelaLogo from "../icons/Banco_de_Venezuela_logo.svg";
import BancoR4Logo from "../icons/r4logo.svg";
import Copy from "../icons/Copy";
import Input from "../componet/Input";
import FIleInput from "../componet/FIleInput";
import { mediaApiUrl } from "../util/proyect-config";
import FlaticonTansfres from "../icons/FlaticonTansfres";
import FlaticonTransferBlack from "../icons/FlaticonTransferBlack";
import FlaticonWarnigRed from "../icons/FlaticonWarnigRed"; 
import TrasactionProgress from "./TrasanctionProsess"; 
import BNCLogo from "../icons/Banco_Nacional_de_Credito.svg";
import DateInput from "../componet/DateInput";
import SuccessComponent from "../componet/SuccessComponent";
import { getCommonPaymentPayload } from "../utils/payment-payload-helper";
import PaymentReminderModal from "../componet/PaymentReminderModal";

export default function BanckTranferForms({ hData, tasaActual, total, disableSubmit, methodConfig = {}, setSelectedDate }) {
  // Log para verificar las props iniciales
  // console.log("BanckTranferForms props:", { hData, tasaActual, total, methodConfig });

  const [startDate, setStartDate] = useState(new Date());
  const [tranferRef, setTranferRef] = useState("");
  const [ownerAcc, setOwnerAcc] = useState("");
  const [file, setFile] = useState(null);
  const [montoPagado, setMontoPagado] = useState("");
  const [errorsState, setErrosState] = useState({});
  const [isOwnerAcc, setIsOwnerAcc] = useState(true);
  const [step, setStep] = useState(0);
  const [failMessage, setFailMessage] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '' });

  // console.log("Contenido del objeto hData:", hData);
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 2000); // La notificación se oculta después de 2 segundos
  };

  const copyToClipboard = async (data, name) => {
    try {
      await navigator.clipboard.writeText(String(data));
      showNotification(`${name} copiado al portapapeles`);
    } catch (error) {
      showNotification("Error al copiar");
    }
  };

  const changeStep = (step) => {
    setStep(step);
  };

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

  const sendTranfer = async () => {
    // console.log("Enviado");
    // console.log(startDate);
    // console.log(tranferRef);
    // console.log(file);

    const erros = {};

    if (!file) erros.file = "El archivo es requerido";
    if (!tranferRef) erros.ref = "El numero de referencia es requerido";
    if (!startDate) erros.date = "La fecha es requerida";
    if (!isOwnerAcc && !ownerAcc)
      erros.ownerAcc = "El titular de la cuenta es requerido";
    if (!montoPagado) erros.montoPagado = "El monto pagado es obligatorio";

    // console.log(erros);
    if (Object.keys(erros).length > 0) {
      setErrosState(erros);
      return;
    }
    const isPartial = parseFloat(String(montoPagado).replace(',', '.')) < parseFloat(total);
    setIsPartialPayment(isPartial);

    changeStep(1);

    // 1. Determinar el modo de operación.
    const mode = hData.firstime === 'true' && hData.fullInvoiceData
      ? 'first-time'
      : (hData.ac ? 'ac' : 'customer_balance');

    // 2. Asignar el valor de paymentMethod condicionalmente.
    const paymentMethodValue = mode === 'ac' ? 'tranferenciadirecta' : 'Transferencia bancaria';

    const fromData = new FormData();

    // Always append these basic fields
    fromData.append("depositDate", startDate);
    fromData.append("ref", procesarReferencia(tranferRef));
    if (file) fromData.append("file", file);
    fromData.append("titularDelaCuenta", isOwnerAcc ? hData.cliente || '' : ownerAcc || '');
    fromData.append("montoPagado", montoPagado);
    let banco;
    if (methodConfig.bank === 'bnc') {
      banco = 'Banco Nacional de Crédito';
    } else if (methodConfig.bank === 'r4') {
      banco = 'Banco R4';
    } else if (methodConfig.bank === 'bdv') {
      banco = 'Banco de Venezuela 219040';
    } else {
      banco = 'Sin cuenta asociada';
    }

    const subscriberId = hData.sub || hData.suscriptor || '';

    // Usamos el helper para obtener los datos comunes
    const commonPayload = getCommonPaymentPayload(hData, {
      total,
      tasaActual,
      paymentMethodName: "Transferencia bancaria",
      paymentMethodCode: "tranferenciadirecta", // Valor fijo para el tipo
      banco,
      moneda: "Bolivares",
      ownerName: isOwnerAcc ? hData.cliente : ownerAcc,
      subscriberId,
      date: startDate
    });

    // Actualizamos paymentMethod en el payload común para usar el valor dinámico y evitar duplicados
    commonPayload.paymentMethod = paymentMethodValue;

    // Agregamos los datos comunes al FormData
    Object.keys(commonPayload).forEach(key => {
      let value = commonPayload[key];
      if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
        value = JSON.stringify(value);
      }
      fromData.append(key, value);
    });
    
    // Sobrescribimos o añadimos campos específicos si es necesario
    fromData.append("zelleBanck", ""); // Campo vacío requerido por backend legacy

    // Calculamos y añadimos el monto en dólares (monto zoho)
    if (total && tasaActual && tasaActual > 0) {
      const montoEnDolares = parseFloat(total) / parseFloat(tasaActual);
      fromData.append("monto_zoho", montoEnDolares.toFixed(2));
    }

    // // Log para depurar los datos que se envían
    // console.log("BanckTranferForms - Datos a enviar (modo first-time):", hData.firstime === 'true');
    // console.log("BanckTranferForms - Contenido de FormData a enviar:");
    // for (let pair of fromData.entries()) {
    //   // Si el valor es un objeto File, mostramos su nombre para mayor claridad
    //   const value = pair[1] instanceof File ? pair[1].name : pair[1];
    //   console.log(pair[0] + ': ' + value);
    // }

    const url = mediaApiUrl + "/boucher/traferencia";

    try {
      const response = await fetch(url, {
        method: "POST",
        body: fromData,
      });

      if (!response.ok) {
        throw new Error("Error en la solicitud");
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
      // console.error("Error al enviar la tranferencia:", error);
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
          <p>Método de Pago:</p>
          <div className="w-full flex justify-start gap-[8px] items-center mb-2 form-title">
            <div className="main-svg ">
              <FlaticonTransferBlack className="w-full h-full" />
            </div>
            <h3>Transferencia</h3>
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
              La Verificación de la Transferencia Puede Tardar Entre 24 y 48 Horas.
            </p>
          </div>

          <h4 className="my-[2em] !text-sl-gray-700">
            Paso 1: Coloque los Datos de Nuestra Cuenta Bancaria.
          </h4>
          <div className="p-[16px] bg-gradient-to-r from-sl-pink-200 to-sl-blue-200  border-sl-gray-850 mb-4">            
          {(methodConfig.bank === "bdv" || !methodConfig.bank) && (
            <>
          <div className="w-full  flex justify-between items-center mb-[16px] border-b border-b-sl-gray-50 p-[16px]">
              <h4>Datos de Pago</h4>
              <img
                src={BancoDeVenezuelaLogo}
                alt="logo del banco"
                className="h-4 w-27"
              />
            </div>
            
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Cuenta Corriente:</p>{" "}
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
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Nombre:</p>{" "}
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
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Rif:</p>{" "}
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
            <div className="flex flex-col items-center">
              <p className="font-semibold">Monto a Pagar</p>
              <h3 className="mt-[8px] cursor-pointer relative"
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
          <div className="w-full  flex justify-between items-center mb-[16px] border-b border-b-sl-gray-50 p-[16px] mt-4">
              <h4>Datos de Pago</h4>
              <img
                src={BNCLogo}
                alt="logo del banco"
                className="h-4 w-18"
              />
            </div>
            
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Cuenta Corriente:</p>{" "}
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
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Nombre:</p>{" "}
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
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Rif:</p>{" "}
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
            <div className="flex flex-col items-center">
              <p className="font-semibold">Monto a Pagar</p>
              <h3 className="mt-[8px] cursor-pointer relative"
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
          <div className="w-full  flex justify-between items-center mb-[16px] border-b border-b-sl-gray-50 p-[16px] mt-4">
              <h4>Datos de Pago</h4>
              <img
                src={BancoR4Logo}
                alt="logo del banco"
                className="h-2 w-20"
              />
            </div>

            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Cuenta Corriente:</p>{" "}
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
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Nombre:</p>{" "}
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
            <div className="w-full flex justify-between items-center">
              <p className="sl-text-sm">Rif:</p>{" "}
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
            <div className="flex flex-col items-center">
              <p className="font-semibold">Monto a Pagar</p>
              <h3 className="mt-[8px] cursor-pointer relative"
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

          <h5 className="font-medium text-base  text-gray-500">
            Paso 2: Indique los Datos de la Cuenta desde la cual Realizó el Pago.
          </h5>

          <div className="flex gap-2 justify-between !mt-[16px] items-end">
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
          <div className="w-full my-[16px]">
            <p className="text-sm font-semibold !mb-[8px]">Comprobante de Pago*</p>
            <FIleInput onChange={setFile} erros={errorsState.file || ""} />
          </div>
          <div className="flex justify-end my-[32px]">
        <button className="base !border-none" disabled={disableSubmit}>
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
          <div className="w-full flex flex-col items-center">
            <p className="font-bold mb-2">Ocurrió un Error al Procesar el Pago</p>
            {failMessage && (
              <p className="text-red-500 text-sm text-center">{failMessage}</p>
            )}
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
