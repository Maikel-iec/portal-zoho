import React, { useState, useRef } from "react";
import ZellePink from "../icons/ZellePink";
import Copy from "../icons/Copy";
import bank from "../icons/Bank_of_America_logo.svg";
import chase from "../icons/Chase_logo.svg";
import Input from "../componet/Input";
import FIleInput from "../componet/FIleInput";
import axios from "axios";
import { mediaApiUrl } from "../util/proyect-config";
import FlaticonWarnigRed from "../icons/FlaticonWarnigRed";
import zelle from "../icons/Zelle_original.svg";
import chaseLogo from "../icons/Chase_logo_2007.svg";
import bofaLogo from "../icons/Bank-of-America-2018.svg";
import zellep from "../icons/icons8-zelle.svg";
import TrasactionProgress from "./TrasanctionProsess";
import DateInput from "../componet/DateInput";
import SuccessComponent from "../componet/SuccessComponent";
import { getCommonPaymentPayload } from "../utils/payment-payload-helper";

export default function ZellePayment({ hData, tasaActual, total, itf, disableSubmit, methodConfig = {} }) {
  // Log para verificar las props iniciales
  // console.log("ZellePayment props:", { hData, tasaActual, total, methodConfig });

  const [banckTab, setBanckTab] = useState(methodConfig.account);
  const [startDate, setStartDate] = useState(new Date());
  const [errorsState, setErrosState] = useState({});
  const [step, setStep] = useState(0);
  const [failMessage, setFailMessage] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  const changeStep = (step) => {
    setStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 2000); // La notificación se oculta después de 2 segundos
  };

  const [formData, setFormData] = useState({
    owner: "",
    ref: "",
    file: "",
    montoPagado: "",
  });

    const copyTotal = async (total) => {
    try {
      await navigator.clipboard.writeText(total);
      alert ('Copiado al portapapeles')
    } catch (error) {
      alert ('No se pudo copiar')
    }
  }

  const copyClipboar = async (data, name) => {
    try {
      await navigator.clipboard.writeText(String(data));
      showNotification(`${name} copiado al portapapeles`);
    } catch (error) {
      showNotification("Error al copiar");
    }
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

    const filtrarTexto = (text) => {
    if (!text) return "";
    return text.replace(/[^a-zA-Z0-9]/g, "");
  };

  const getConceptoParaCopiar = () => {
    let conceptoBase = hData.ac; // Usar 'ac' por defecto

    // Si 'ac' está vacío o no está definido, usamos 'acs'
    if (!conceptoBase) {
      const pendingInvoices = JSON.parse(sessionStorage.getItem('invoices') || '[]')
        .filter(inv => inv.balance > 0)
        .map(inv => inv.invoice_number);
      conceptoBase = pendingInvoices.join('_');
    }

    const conceptoFiltrado = filtrarTexto(conceptoBase);
    if (conceptoFiltrado.length > 27) {
      return conceptoFiltrado.substring(0, 27) + '...';
    }
    return conceptoFiltrado;
  };
  const conceptoParaCopiar = getConceptoParaCopiar();
  const conceptoParaMostrar = conceptoParaCopiar.length > 20 ? conceptoParaCopiar.substring(0, 20) + '...' : conceptoParaCopiar;


  const enviar = async () => {
    // console.log("enviado");
    // console.log(formData);
    // console.log(hData);
    // console.log(startDate);
    // console.log(tasaActual);
    // console.log(total);

    const fromDataToSend = new FormData();

    // validamos los datos del formulario

    const errors = {};

    if (!formData.file) {
      errors.file = "El Archivo es Requerido";
    }

    if (!formData.owner) {
      errors.owner = "El Nombre del Titular es Requerido";
    }

    if (!formData.ref) {
      errors.ref = "El Número de Referencia es Requerido";
    }

    if (!startDate) {
      errors.date = "La Fecha es Requerida";
    }

    if (!formData.montoPagado) {
      errors.montoPagado = "El monto pagado es obligatorio";
    }

    if (Object.keys(errors).length > 0) {
      // console.log(errors);
      setErrosState(errors);
      return;
    }

    const isPartial = parseFloat(String(formData.montoPagado).replace(',', '.')) < parseFloat(total);
    setIsPartialPayment(isPartial);

    // procesamos la referencia
    const refProcesada = procesarReferencia(formData.ref);
    changeStep(1);

    fromDataToSend.append("file", formData.file);
    fromDataToSend.append("owner", formData.owner);
    fromDataToSend.append("ref", refProcesada);
    fromDataToSend.append("depositDate", startDate);
    fromDataToSend.append("zelleBanck", banckTab);

    let paymentType, banco, medioDePago;
    if (banckTab === "bofa") {
      medioDePago = "Zelle Banck of American";
      banco = "Bank of America";
      paymentType = "zelleBk";
    } else if (banckTab === "chase") {
      medioDePago = "Zelle Chase";
      banco = "Banco Chase";
      paymentType = "zelleChase";
    } else {
      medioDePago = "Zelle"; // Valor por defecto
      banco = "Sin cuenta asociada"; // Valor por defecto
    }

    const subscriberId = hData.sub || hData.suscriptor || '';

    // Usamos el helper para obtener todos los datos comunes
    const commonPayload = getCommonPaymentPayload(hData, {
      total,
      tasaActual,
      paymentMethodName: medioDePago,
      paymentMethodCode: paymentType,
      banco,
      moneda: "Divisas",
      ownerName: formData.owner,
      subscriberId,
      date: startDate,
      montoItf: itf, // Pasamos el montoItf (prop 'itf') al helper
    });

    // Agregamos los datos comunes al FormData
    Object.keys(commonPayload).forEach(key => {
      let value = commonPayload[key];
      // Si es un array u objeto (como facturas), lo convertimos a string para FormData
      if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
        value = JSON.stringify(value);
      }
      fromDataToSend.append(key, value);
    });

    // Log para depurar los datos que se envían
    // console.log("ZellePayment - Datos a enviar (modo first-time):", hData.firstime === 'true');
    // console.log("ZellePayment - Contenido de FormData a enviar:");
    // for (let pair of fromDataToSend.entries()) {
    //   // Si el valor es un objeto File, mostramos su nombre para mayor claridad
    //   const value = pair[1] instanceof File ? pair[1].name : pair[1];
    //   console.log(pair[0] + ': ' + value);
    // }

    try {
      const url = mediaApiUrl + "/boucher/zelle";

      const res = await axios.post(url, fromDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // console.log(res.data);
      changeStep(3);
      
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Ocurrió un error desconocido al reportar el pago.";
      setFailMessage(errorMessage);
      changeStep(2);
    }
    
  };

  return (
    <>
      {step === 0 && (
        <>
        {notification.show && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-sl-blue-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-opacity duration-300 animate-fade-in-down">
            <p>{notification.message}</p>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <p>Método de Pago</p>
          <div className="form-title flex items-center">
            <img src={zellep} className="!h-[40px]" alt="zelle-p-xd" />
            <h3>Transferencia Zelle</h3>
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

          <h5 className="!my-[2em] !text-sl-gray-700">
            Paso 1: Coloque los Datos de Nuestra Cuenta de Zelle.
          </h5>

          <div className="w-full p-[16px] bg-gradient-to-r from-sl-pink-200 to-sl-blue-300">
            {(methodConfig.account ? methodConfig.account === 'chase' : true) && (             
              <>              
                <div className="flex w-full justify-between border-b items-center mb-[16px] border-b-sl-gray-50 p-[16px]">
                  <h4>Datos de Pago</h4>
                  <div className="relative p-[16px]">
                    <img
                      src={chaseLogo}
                      alt="logo de chase"
                      className="!h-[20px]"
                    />
                    <img
                      src={zelle}
                      alt="logo del zelle"
                      className="!h-[20px] absolute top-0 right-0"
                    />
                  </div>
                </div>
                <div className="flex w-full justify-between relative py-[8px]">
                  <p>Nombre:</p>
                  <p
                    className="hover:cursor-pointer"
                    onClick={() =>
                      copyClipboar("Corporación Quantum Link C.A.", "Nombre")
                    }
                  >
                    Corporación Quantum Link C.A.
                  </p>
                  <span className="absolute right-0 top-0 [&_svg]:fill-slate-50">
                    <Copy />
                  </span>
                </div>
                <div className="flex w-full justify-between relative py-[8px]">
                  <p>Correo:</p>
                  <p
                    className="hover:cursor-pointer"
                    onClick={() =>
                      copyClipboar("pagos7link@gmail.com", "Correo")
                    }
                  >
                    pagos7link@gmail.com
                  </p>
                  <span className="absolute right-0 top-0 [&_svg]:fill-slate-50">
                    <Copy />
                  </span>
                </div>
                </>
            )}

            {(methodConfig.account ? methodConfig.account === 'bofa' : true) && (
                    <>              
                <div className="flex w-full justify-between border-b items-center mb-[16px] border-b-sl-gray-50 p-[16px]">
                  <h4>Datos de Pago</h4>
                  <div className="relative p-[16px]">
                    <img
                      src={bofaLogo}
                      alt="logo de bofa"
                      className="!h-[40px]"
                    />
                    <img
                      src={zelle}
                      alt="logo del zelle"
                      className="!h-[20px] absolute top-0 right-0"
                    />
                  </div>
                </div>
                <div className="flex w-full justify-between relative  p-[8px]">
                  <p>Nombre:</p>
                  <p
                    className="hover:cursor-pointer"
                    onClick={() =>
                      copyClipboar("Corporación Quantum Link C.A.", "Nombre")
                    }
                  >
                    Corporación Quantum Link C.A.
                  </p>
                  <span className="absolute right-0 top-0 ">
                    <Copy />
                  </span>
                </div>
                <div className="flex w-full justify-between relative p-[8px]">
                  <p>Correo:</p>
                  <p
                    className="hover:cursor-pointer"
                    onClick={() =>
                      copyClipboar("quantumlink01@gmail.com", "Correo")
                    }
                  >
                    quantumlink01@gmail.com
                  </p>
                  <span className="absolute right-0 top-0 [&_svg]:fill-slate-50">
                    <Copy />
                  </span>
                </div>
                </>
            )}

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
            <p className="m-[16px] text-center text-red-600 font-semibold">
              ¡IMPORTANTE!<br></br>Al momento de realizar el pago, por favor copie los últimos 6 dígitos de la referencia 
            </p>
            {/* <div
              className="p-[20px] mt-[20px] w-full relative  flex justify-center border border-dashed gap-2 border-sl-gray-50  hover:cursor-pointer hover:bg-sl-gray-50/15"
              onClick={() => copyClipboar(conceptoParaCopiar, "Concepto")}
            >
              <p>Concepto: </p>
              <p>{conceptoParaMostrar}</p>
              <p className="absolute top-[-14px] left-4 flex items-center gap-2 p-[4px] bg-sl-pink-300 whitespace-nowrap">
                <span className="whitespace-nowrap"> Click Para Copiar</span>
                <span className="[&_svg]:fill-slate-50">
                  <Copy />
                </span>
              </p>
            </div> */}
          </div>
          
          <h5 className="font-medium text-base  text-gray-500 !my-[32px]">
            Paso 2: Indique los Datos de la Cuenta Desde la Cual Realizó el Pago.
          </h5>
          <div className="!my-[16px]">
            <Input
              labelText={"Nombre del titular de la cuenta*"}
              className="text-sm font-semibold !mb-[8px]"
              name={"owner"}
              description={"Coloque el nombre EXACTO del titular de la cuenta"}
              isNumber={false}
              value={formData.owner}
              onChange={(e) => {
                setFormData({ ...formData, owner: e.target.value });
              }}
              error={errorsState.owner}
            />

            <div className="flex flex-col sm:flex-row gap-2 w-full justify-center items-end">
              <div className="w-full sm:w-1/2">
                <DateInput
                  labelText="Fecha de Depósito*"
                  value={startDate}
                  onChange={setStartDate}
                  error={errorsState.date}
                />
              </div>
              <div className="w-full sm:w-1/2">
                <Input
                  labelText={"Referencia*"}
                  className="text-sm font-semibold"
                  name={"ref"}
                  description={""}
                  isNumber={false}
                  placeholder="Últimos 6 Caracteres"
                  minlength="6"
                  maxlength="12"
                  value={formData.ref}
                  onChange={(e) => {
                    setFormData({ ...formData, ref: e.target.value });
                  }}
                  error={errorsState.ref}
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
              value={formData.montoPagado}
              onChange={(e) =>
                setFormData({ ...formData, montoPagado: e.target.value })
              }
              error={errorsState.montoPagado}
            />
            </div>
            <FIleInput
              onChange={(file) => {
                setFormData({ ...formData, file });
              }}
              erros={errorsState.file}
            />
          </div>
          <button className="my-[32px] base !border-none" disabled={disableSubmit}>
            Reportar Pago
            </button>
        </form>
        </>
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
            La Información de su Transferencia vía Zelle está en Proceso de Envío.
          </p>
        }
        messageSucces={
          <SuccessComponent
            message={
              isPartialPayment ?
                "Los datos fueron recibidos correctamente pero no ha pagado el monto completo" :
              (formData.montoPagado && total && parseFloat(String(formData.montoPagado).replace(',', '.')) > parseFloat(total)) ?
                "Gracias por su pago." :
                "Los datos fueron recibidos correctamente."
            }
            isPartialPayment={isPartialPayment}
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
                <div className="sl-invocie-item !p-0"><p>Forma de Pago:</p><p>Zelle</p></div>
                <div className="sl-invocie-item !border-b-sl-gray-800 !p-0"><p>Fecha de Depósito:</p><p>{startDate ? startDate.toLocaleDateString() : 'N/A'}</p></div>
                <div className="sl-invocie-item !p-0"><p>Monto Reportado:</p><h4>{total} US$</h4></div>
                <div className="w-full mt-[8px] flex flex-col items-center text-center font-bold"><p className="text-base rounded-2xl font-semibold !text-sl-blue-600">¡Recuerda! <br />La verificación de la transferencia puede tardar entre 24 y 48 horas.</p></div>
              </>
            }
          />
        }
      />
    </>
  );
}
