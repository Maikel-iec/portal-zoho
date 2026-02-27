import React, { useState } from "react";
import R4Logo from "../icons/R4Logo";
import BancoDeVenezuelaLogo from "../icons/Banco_de_Venezuela_logo.svg";
import { bancos_venezuela } from "../utils/bancos-venezuela";
import Input from "../componet/Input";
import FIleInput from "../componet/FIleInput";
import Copy2 from "../icons/Copy2";
import TrasactionModal from "../componet/TrasactionModal";
import axios from "axios";
import { apiPaymentHeader, DUMMY_MODE } from "../util/proyect-config";
import { API_ENDPOINTS } from "../util/api-endpoints";
import R4IconWhite from "../icons/R4IconWhite";
import MobileTransferFlaticon from "../icons/MobileTransferFlaticon";
import MobileTraferFlaticoBlack from "../icons/MobileTraferFlaticoBlack";
import TrasactionProgress from "./TrasanctionProsess";
import Copy from "../icons/Copy";
import DateInput from "../componet/DateInput";
import SuccessComponent from "../componet/SuccessComponent";
import { format } from "date-fns";
import { getJsonPaymentPayload } from "../utils/payment-payload-helper";
import PaymentReminderModal from "../componet/PaymentReminderModal";
import WhatsappIcon from "../icons/WhatsappIcon";

const MobilePaymentP2P = ({
  hData,
  tasaActual,
  total,
  disableSubmit,
  methodConfig = {},
  setSelectedDate,
}) => {
  const isBdv = methodConfig.bank === "bdv";
  const bankName = isBdv ? "Banco de Venezuela 219040" : "Banco R4";
  const bankCode = isBdv ? "(0102)" : "(0169)";
  const phoneNumber = isBdv ? "04142872553" : "04142872553";

  // console.log(`[MobilePaymentP2P] Configured for: ${isBdv ? 'BDV' : 'R4'}`);

  const [isReminderOpen, setIsReminderOpen] = useState(true);
  const [errosState, setErrosState] = useState({});
  const [formData, setFormData] = useState({
    Banco: "",
    owner: hData.cliente || "",
    ref: "",
    TelefonoDestino: "",
    Referencia: "",
    tipoDocumento: "V",
    Cedula: "",
    Monto: "",
  });
  const [file, setFile] = useState(null);
  const [startDate, setStartDate] = useState(new Date());

  const [step, setStep] = useState(0);
  const [requestErrorMessege, setRequestErrorMessege] = useState(
    "Error al procesar el pago",
  );
  const [mismatchedDataState, setMismatchedDataState] = useState([]);
  const [actualBankReceivedAmount, setActualBankReceivedAmount] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);

  // Log para verificar las props iniciales
  // console.log("MobilePaymentP2P props:", { hData, tasaActual, total, methodConfig });

  const [notification, setNotification] = useState({
    show: false,
    message: "",
  });

  const changeStep = (step) => {
    setStep(step);
  };

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: "" });
    }, 2000); // La notificación se oculta después de 2 segundos
  };

  const copyClipboar = async (data, name) => {
    try {
      await navigator.clipboard.writeText(String(data));
      showNotification(`${name} copiado al portapapeles`);
    } catch (error) {
      showNotification("Error al copiar");
    }
  };

  const formatConcepto = (concepto) => {
    const maxLength = 30;
    if (concepto.length > maxLength) {
      return concepto.substring(0, maxLength - 3) + "...";
    }
    return concepto;
  };

  // esta funcion es la encargada de procesar el pago y verificar si el pago es recibido o no

  const checkout = async (e, amountOverride) => {
    if (e && e.preventDefault) e.preventDefault();
    // console.log("confirmado XD");
    // console.log(formData);
    // console.log("enviado")
    // console.log(file);

    // validamos los campos requeridos
    let errors = {};
    const numeroTelefonoRegEx = /^(0412|0414|0416|0424|0426|0422)\d{7}$/;

    if (!formData.Banco) {
      errors.Banco = "Seleccione un banco";
    }

    if (!formData.TelefonoDestino) {
      errors.TelefonoDestino = "Ingrese un Número de teléfono";
    } else if (!numeroTelefonoRegEx.test(formData.TelefonoDestino)) {
      errors.TelefonoDestino = "El número de Teléfono es inválido";
    }

    if (!formData.Referencia) {
      errors.Referencia = "Ingrese una referencia";
    } else if (formData.Referencia.length < 6) {
      errors.Referencia = "La referencia debe tener al menos 6 dígitos";
    }

    if (!formData.Monto) {
      errors.Monto = "Ingrese el monto que pagó";
    } else {
      const parsedMonto = parseFloat(String(formData.Monto).replace(",", "."));
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        errors.Monto = "Ingrese un monto válido";
      }
    }

    if (isBdv && !formData.Cedula) {
      errors.Cedula = "Ingrese la cédula del pagador";
    }

    if (Object.keys(errors).length > 0) {
      setErrosState(errors);
      return;
    }

    setErrosState({});

    const amountToUse =
      amountOverride !== undefined ? amountOverride : parseFloat(total);

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

    const subscriberId = sub || suscriptor || "";

    const commonPayload = getJsonPaymentPayload(hData, {
      total,
      amountPaid: amountToUse,
      tasaActual,
      paymentMethodName: `Pago Movil p2p ${isBdv ? "BDV" : "R4"}`,
      banco: bankName,
      moneda: "Bolivares",
      ownerName: hData.cliente,
      subscriberId,
      date: startDate,
      reference: formData.Referencia,
    });

    const conceptoParaDataToSend = commonPayload.concepto;

    // console.log("datos a enviar XC");
    // console.log(dataToSend);
    const url = isBdv
      ? API_ENDPOINTS.MOBILE_PAYMENT.P2P_BDV
      : API_ENDPOINTS.MOBILE_PAYMENT.P2P_CONFIRMATION;

    let finalReference = formData.Referencia;
    if (finalReference.length > 6) {
      finalReference = finalReference.slice(-6);
    }

    // Formato de fecha condicional: 'yyyy-MM-dd' para BDV, objeto Date (que se serializa a ISO) para otros.
    const fechaParaEnviar = isBdv ? format(startDate, "yyyy-MM-dd") : startDate;

    const dataToSend = {
      ...formData,
      Referencia: finalReference,
      ref: finalReference,
      fecha: fechaParaEnviar,
      concepto: conceptoParaDataToSend || "pago",
      ...(file && { file }),
      montoPagado: amountToUse,
      total: amountToUse,
      payload: commonPayload, // Asignamos el payload común directamente
      cedulaPagador: isBdv
        ? `${formData.tipoDocumento}${formData.Cedula}`
        : hData.documento || "",
      telefonoPagador: formData.TelefonoDestino,
      referencia: finalReference,
      fechaPago: fechaParaEnviar,
      importe: amountToUse,
      bancoOrigen: formData.Banco,
      reqCed: formData.Banco === "0102" ? "true" : "false",
      telefonoDestino: phoneNumber,
    };

    // // Log para depurar los datos que se envían
    // console.log("MobilePaymentP2P - Datos a enviar:", dataToSend);
    // if (hData.firstime === 'true') {
    //     console.log("MobilePaymentP2P - Payload para first-time:", dataToSend.payload);
    // }

    changeStep(1);

    // --- DUMMY MODE ---
    // if (DUMMY_MODE) {
    //   console.group("🔌 [DUMMY MODE] MobilePaymentP2P: Reporte de Pago");
    //   console.log("📥 Datos del Formulario:", formData);
    //   console.log("📤 Datos a Enviar (Payload simulado):", {
    //     ...formData,
    //     Referencia: finalReference,
    //     fecha: fechaParaEnviar,
    //     montoPagado: total,
    //   });

    //   setTimeout(() => {
    //     console.log("✅ Respuesta Simulada:", {
    //       isSuccess: true,
    //       montoPagado: total,
    //       message: "Pago verificado",
    //     });
    //     console.groupEnd();
    //     setActualBankReceivedAmount(total);
    //     changeStep(3);
    //     window.scrollTo({ top: 0, behavior: "smooth" });
    //   }, 2000);
    //   return;
    // }
    // ------------------

    try {
      const res = await axios.post(url, dataToSend, {
        headers: apiPaymentHeader,
      });

      // console.log(res.data)

      let isSucces = false;
      let montoRecibido = 0;

      if (isBdv) {
        const { isSuccess: topLevelSuccess, data, message } = res.data;

        // Para BDV, el éxito depende de que el código interno sea 1000
        if (topLevelSuccess && data?.code === 1000) {
          isSucces = true;
          montoRecibido = data.data?.amount;
          if (data.data?.referencia) {
            setFormData((prev) => ({
              ...prev,
              Referencia: data.data.referencia,
            }));
          }
        } else {
          const errorMsg =
            data?.message || message || "Error al procesar el pago";
          const internalCode = data?.code;

          // Condición 1: El mensaje indica que la transacción se realizó aunque el código no sea 1000.
          const condition1 =
            typeof errorMsg === "string" &&
            errorMsg.includes("Transacción realizada");
          // Condición 2: El código es 1010 y el mensaje contiene "monto :", indicando un pago parcial o exitoso no capturado.
          const condition2 =
            internalCode === 1010 &&
            typeof errorMsg === "string" &&
            errorMsg.includes("monto :");

          if (condition1 || condition2) {
            if (amountOverride === undefined) {
              const retryAmount = parseFloat(
                String(formData.Monto).replace(",", "."),
              );
              // Si el monto ingresado por el usuario es distinto al total esperado, reintentamos automáticamente
              if (Math.abs(retryAmount - parseFloat(total)) > 0.01) {
                return checkout(e, retryAmount);
              }
            }
            setRequestErrorMessege(errorMsg);
            changeStep(2);
            return;
          }

          // Si no es un caso especial, se trata como un error normal.
          setRequestErrorMessege(errorMsg);
        }
      } else {
        // Lógica original para el otro endpoint (/confirmation-services/p2p)
        isSucces = res.data.isSucces;
        montoRecibido = res.data.montoPagado;
      }

      if (montoRecibido) setActualBankReceivedAmount(montoRecibido);
      if (!isSucces) {
        // Aunque no sea exitoso, podemos verificar si el monto es parcial
        const isPartial =
          parseFloat(String(montoRecibido || 0).replace(",", ".")) <
          parseFloat(total);
        setIsPartialPayment(isPartial);
        changeStep(2);
        return;
      }
      // Si la transacción es exitosa, aquí validamos el monto
      const isPartial =
        parseFloat(String(montoRecibido || 0).replace(",", ".")) <
        parseFloat(total);
      setIsPartialPayment(isPartial);
      changeStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      // console.log("erro XC");
      // console.log(error);
      if (axios.isAxiosError(error)) {
        // Si el backend envía un mensaje de error, úsalo. Si no, muestra uno genérico.
        const data = error.response?.data;
        const message =
          data?.message ||
          "Ocurrió un error inesperado al procesar el pago. Por favor, inténtelo de nuevo.";
        setRequestErrorMessege(message);

        // La lógica para datos no coincidentes ya está bien, la mantenemos.
        const originalData = error.response.data || {
          message: "Error al procesar el pago",
        };

        if (originalData.message === "Los datos no coinciden.") {
          const { data: mismatchedData } = originalData;

          if (mismatchedData) {
            // si existe datos que no coincide, al ser de tipo objeto solo enviamos las llaves en string

            const dataToSendMi = Object.keys(mismatchedData).map((key) => {
              return {
                key,
                value: mismatchedData[key],
              };
            });
            setMismatchedDataState(dataToSendMi);
          }
        }
      }

      changeStep(2);
    }
  };

  const handlerData = async (key, value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      showNotification(`${key} copiado al portapapeles`);
    } catch (error) {
      showNotification(`Error al copiar ${key}`);
    }
  };

  const filtrarTexto = (text) => {
    if (!text) return "";
    return text.replace(/[^a-zA-Z0-9]/g, "");
  };

  const getConceptoParaCopiar = () => {
    let conceptoBase = hData.ac; // Usar 'ac' por defecto

    // Si 'ac' está vacío o no está definido, usamos 'acs'
    if (!conceptoBase) {
      try {
        const pendingInvoices = JSON.parse(
          sessionStorage.getItem("invoices") || "[]",
        )
          .filter((inv) => inv.balance > 0)
          .map((inv) => inv.invoice_number);
        conceptoBase = pendingInvoices.join("_");
      } catch (e) {
        conceptoBase = "";
      }
    }

    const conceptoFiltrado = filtrarTexto(conceptoBase);
    if (conceptoFiltrado.length > 27) {
      return conceptoFiltrado.substring(0, 27) + "...";
    }
    return conceptoFiltrado;
  };
  const conceptoParaCopiar = getConceptoParaCopiar();
  const conceptoParaMostrar =
    conceptoParaCopiar.length > 20
      ? conceptoParaCopiar.substring(0, 20) + "..."
      : conceptoParaCopiar;

  return (
    <>
      <PaymentReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
      />
      {notification.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-sl-blue-600 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-opacity duration-300 animate-fade-in-down">
          <p>{notification.message}</p>
        </div>
      )}
      {step === 0 && (
        <form className="w-full mt-4" onSubmit={checkout}>
          <p>Método de pago:</p>
          <div className="form-title flex items-center gap-2">
            <div className="flex justify-center relative mt-[12px]">
              <div className="r4-e main-svg">
                <MobileTraferFlaticoBlack className="w-full h-full" />
              </div>
            </div>
            <h3>Pago Móvil</h3>
          </div>
          {/* <h3>Formulario de Pago Móvil</h3>
           */}
          <h5 className="font-medium text-base my-[32px] text-gray-500">
            Paso 1: Copie los datos del pago móvil.
          </h5>

          <div className="w-full p-5 bg-gradient-to-r from-sl-pink-200 to-sl-blue-200 flex flex-col items-center ">
            <div className="w-full flex  justify-between items-center border-b p-4 border-b-sl-gray-100">
              <h4 className="my-2">Datos de pago</h4>
              {isBdv ? (
                <img
                  src={BancoDeVenezuelaLogo}
                  alt="Banco de Venezuela"
                  className="!h-[30px] md:!h-[40px] w-auto max-w-[150px] object-contain"
                />
              ) : (
                <div className="main-svg">
                  <R4Logo className="w-full h-full" />
                </div>
              )}
            </div>
            {/* "(0169)" */}
            <div className="w-full r4-box  p-4 gap-2  flex flex-col items-center data-box">
              <p
                onClick={() => handlerData("Rif", "500004630")}
                className="flex w-full justify-between relative cursor-pointer"
              >
                <span className="font-semibold">RIF: </span>{" "}
                <span>J500004630</span>
                <span className="!w-3 !h-3 absolute right-[-10px] top-[-0px]">
                  <Copy2 />
                </span>
              </p>
              <p
                onClick={() => handlerData("Telefono", phoneNumber)}
                className="flex w-full justify-between relative cursor-pointer"
              >
                <span className="font-semibold">Telefono:</span>{" "}
                <span>{phoneNumber}</span>
                <span className="!w-3 !h-3 absolute right-[-10px] top-[-0px]">
                  <Copy2 />
                </span>
              </p>
              <p className="flex w-full justify-between relative">
                <span className="font-semibold">Banco:</span>{" "}
                <span>
                  {bankName} {bankCode}
                </span>
              </p>
              <div className="flex flex-col items-center">
                <p className="font-semibold">Monto a Pagar</p>
                <h3
                  className="mt-[8px] cursor-pointer relative"
                  onClick={() => copyClipboar(total, "Monto")}
                >
                  {total} Bs.
                  <span className="absolute right-[-10px] top-[-8px]">
                    <Copy />
                  </span>
                </h3>
              </div>

              {/* <p className="mt-[16px] text-center text-red-900">
                                <span className='font-bold'>NOTA:</span>
                                <br></br>
                                Copiar el campo de concepto para la validación inmediata.
                            </p>
                            <div
                                className="p-[20px] mt-[20px] w-full relative  flex justify-center border border-dashed gap-2 border-sl-gray-50  hover:cursor-pointer hover:bg-sl-gray-50/15"
                                onClick={() => copyClipboar(conceptoParaCopiar, "Concepto")}
                            >
                                <p>Concepto: </p>
                                <p>{conceptoParaMostrar}</p>
                                <p className="absolute top-[-14px] left-4 flex items-center gap-2 p-[4px] bg-sl-pink-300 whitespace-nowrap">
                                <span  className="whitespace-nowrap"> Click Para Copiar</span>
                                <span className="[&_svg]:fill-slate-50">
                                    <Copy />
                                </span>
                                </p>
                            </div> */}
            </div>
          </div>
          <h5 className="font-medium text-base my-4 mt-6 text-gray-500">
            Paso 2: Coloque los datos asociado al pago.
          </h5>

          <div className="input-box mt-4">
            <span className="font-semibold">Banco*</span>
            <select
              name="Banco"
              id="Banco"
              className="w-full p-2"
              value={formData.Banco}
              onChange={(e) =>
                setFormData({ ...formData, Banco: e.target.value })
              }
            >
              <option value="">Seleccione su Banco</option>
              {bancos_venezuela.map((banco) => {
                return (
                  <option value={banco.codigo}>
                    ({banco.codigo}) {banco.nombre}
                  </option>
                );
              })}
            </select>
            {errosState.Banco && (
              <p className="!text-red-600 text-sm mt-1">{errosState.Banco}</p>
            )}
          </div>

          <div className="flex flex-col">
            <div className="w-full">
              <Input
                isNumber={true}
                className="font-semibold"
                labelText={"Número de teléfono*"}
                name={"TelefonoDestino"}
                description={null}
                value={formData.TelefonoDestino}
                onChange={(e) =>
                  setFormData({ ...formData, TelefonoDestino: e.target.value })
                }
                error={errosState.TelefonoDestino}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="w-full">
              <Input
                isNumber={true}
                className="font-semibold"
                labelText={"Monto Pagado (Bs)*"}
                name={"Monto"}
                description={null}
                value={formData.Monto}
                onChange={(e) =>
                  setFormData({ ...formData, Monto: e.target.value })
                }
                error={errosState.Monto}
                placeholder="Ej: 123.45"
              />
            </div>
          </div>

          {isBdv && (
            <div className="input-box">
              <p className="font-semibold mb-2">Cédula del Titular*</p>
              <div className="flex gap-2 w-full items-center">
                <select
                  id="tipoDocumento"
                  className="p-2 !w-[80px] cedula"
                  name="tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={(e) =>
                    setFormData({ ...formData, tipoDocumento: e.target.value })
                  }
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                  <option value="J">J</option>
                  <option value="G">G</option>
                </select>
                <input
                  type="number"
                  className="w-full font-semibold"
                  name="Cedula"
                  value={formData.Cedula}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setFormData({ ...formData, Cedula: e.target.value })
                  }
                />
              </div>
              {errosState.Cedula && (
                <p className="!text-red-600 text-sm mt-1">
                  {errosState.Cedula}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-2 md:justify-between items-end">
            <div className=" w-full sm:w-1/2">
              {" "}
              <DateInput
                labelText="Fecha de Depósito*"
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  if (setSelectedDate) setSelectedDate(date);
                }}
              />
            </div>
            <div className="w-full sm:w-1/2 flex flex-col">
              <div className="w-full">
                <Input
                  isNumber={true}
                  className="font-semibold"
                  labelText={"Referencia*"}
                  name={"Referencia"}
                  description={null}
                  value={formData.Referencia}
                  placeholder="Últimos 6 Dígitos"
                  minlength="6"
                  maxlength="13"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      Referencia: e.target.value,
                      ref: e.target.value,
                    })
                  }
                  error={errosState.Referencia}
                />
              </div>
            </div>
          </div>

          {/* <div className='mt-6'>
                <span className='font-semibold text-sm label-text'>Image del Comprobante {"(Opcional)"}</span>
                <FIleInput onChange={setFile} erros={errosState.file || ""} />
            </div> */}

          <h5 className="font-medium text-base my-4 mt-6 text-gray-500">
            Paso 3: Haga click en Reportar Pago para finalizar.
          </h5>

          <button
            type="submit"
            className="my-2 base !border-none"
            disabled={disableSubmit}
          >
            Reportar Pago
          </button>
        </form>
      )}
      <TrasactionProgress
        step={step}
        chageStep={changeStep}
        failMessage={
          <div className="w-full flex flex-col items-center text-white">
            <div className="w-full relative bg-sl-gray-900 border border-sl-gray-700 text-white px-4 py-3 rounded-lg mt-4 text-center">
              <strong className="font-bold block text-amber-500">
                Mensaje del Sistema
              </strong>
              <span className="block sm:inline mt-1 text-yellow-600 font-semibold">
                {requestErrorMessege}
              </span>
              <div className="text-sm mt-2 text-gray-300 space-y-2">
                {requestErrorMessege ===
                  "No se encontró la referencia o el pago." && (
                  <p>
                    ¡Verifique cuidadosamente el número de referencia! Si
                    persiste el inconveniente, contacte a soporte.
                  </p>
                )}
                {requestErrorMessege === "Los datos no coinciden." && (
                  <div className="text-left max-w-xs mx-auto">
                    <p className="mb-2 text-center">
                      Los siguientes datos no coinciden:
                    </p>
                    {mismatchedDataState.map((data, index) => (
                      <div key={index} className="grid grid-cols-2 gap-1">
                        <p className="text-amber-400 capitalize text-right">
                          {data.key}:
                        </p>
                        <p className="pl-2">{data.value}</p>
                      </div>
                    ))}
                    <p className="mt-2 text-center">
                      Por favor, verifique los datos y envíe nuevamente.
                    </p>
                  </div>
                )}
                {requestErrorMessege === "La referencia ya fue usada." && (
                  <p>
                    Esta referencia ya ha sido utilizada. Por favor, verifique
                    el número o contacte a soporte si cree que es un error.
                  </p>
                )}
              </div>
            </div>
            <a
              href="https://wa.me/584126389082"
              className="flex gap-2 items-center py-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="w-5 h-5">
                <WhatsappIcon />
              </span>
              <span className="!text-slate-500 font-medium text-sm ">
                Contactar soporte
              </span>
            </a>
          </div>
        }
        meesageProcess={
          <p className="max-w-[300px]  text-center">
            Se está procesando el pago
          </p>
        }
        messageSucces={
          <SuccessComponent
            message={
              isPartialPayment
                ? "Los datos fueron recibidos correctamente pero no ha pagado el monto completo"
                : actualBankReceivedAmount &&
                  total &&
                  parseFloat(actualBankReceivedAmount) > parseFloat(total)
                ? "Gracias por su pago."
                : "El pago se realizó con éxito."
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
                    {hData.firstime === "true"
                      ? (() => {
                          try {
                            const allFirstTimeInvoices = JSON.parse(
                              sessionStorage.getItem("allFirstTimeInvoices") ||
                                "[]",
                            );
                            return (
                              allFirstTimeInvoices
                                .map((inv) => inv.invoice_number)
                                .join(", ") ||
                              hData.fullInvoiceData?.invoice_number
                            );
                          } catch (e) {
                            return hData.fullInvoiceData?.invoice_number || "";
                          }
                        })()
                      : (hData.ac ? "ac" : "customer_balance") ===
                        "customer_balance"
                      ? (() => {
                          try {
                            return (
                              JSON.parse(
                                sessionStorage.getItem("invoices") || "[]",
                              )
                                .filter((inv) => inv.balance > 0)
                                .map((inv) => inv.invoice_number)
                                .join(", ") || "Varios"
                            );
                          } catch (e) {
                            return "Varios";
                          }
                        })()
                      : hData.ac}
                  </p>
                </div>
                <div className="sl-invocie-item !p-0">
                  <p>Forma de pago:</p>
                  <p className="!text-right">Pago Móvil</p>
                </div>
                <div className="sl-invocie-item !p-0">
                  <p>Referencia:</p>
                  <p>{formData.Referencia}</p>
                </div>
                <div className="sl-invocie-item !border-b-sl-gray-800 !p-0">
                  <p>Fecha de Depósito:</p>
                  <p>{startDate ? startDate.toLocaleDateString() : "N/A"}</p>
                </div>
                <div className="sl-invocie-item !p-0">
                  <p>Monto Pagado:</p>
                  <h4>
                    {actualBankReceivedAmount
                      ? actualBankReceivedAmount
                      : "El que mando"}
                    Bs.
                  </h4>
                </div>
                <p>
                  <b>Nota:</b> ¿El monto mostrado es el mismo que envió por pago
                  móvil?. <br /> Si ve algo distinto, estamos aquí para
                  ayudarle: contacte via whatsapp a nuestro canal unico{" "}
                  <span className="font-bold">0412-638-90-82.</span>
                </p>
              </>
            }
          />
        }
      />
    </>
  );
};

export default MobilePaymentP2P;
