import React, { useState } from "react";
import MobileTranfer from "../icons/MobileTranfer";
import Input from "../componet/Input";
import { bancos_venezuela } from "../utils/bancos-venezuela";
import mobile from "../icons/mobile.svg";
import { apiPaymentHeader, apiurl } from "../util/proyect-config";
import axios from "axios";
import MobileTransferFlaticon from "../icons/MobileTransferFlaticon";
import DateInput from "../componet/DateInput";
import MobileTraferFlaticoBlack from "../icons/MobileTraferFlaticoBlack";
import TrasactionProgress from "./TrasanctionProsess";
import SuccessComponent from "../componet/SuccessComponent";
import { getCommonPaymentPayload } from "../utils/payment-payload-helper";
import PaymentReminderModal from "../componet/PaymentReminderModal";

export default function MobilePaymentForm({ hData, tasaActual, total, disableSubmit, methodConfig = {} }) {

  // Log para verificar las props iniciales
  // console.log("MobilePaymentForm props:", { hData, tasaActual, total });

  const isBdv = methodConfig.bank === 'bdv';
  const bankName = isBdv ? "Banco de Venezuela 219040" : "Banco R4";
  const paymentMethodName = `Pago Movil c2p ${isBdv ? 'BDV' : 'R4'}`;

  // console.log(`[MobilePaymentForm - C2P] Configured for: ${isBdv ? 'BDV' : 'R4'}`);

  const initialState = {
    TelefonoDestino: "",
    Cedula: "",
    Banco: "",
    Otp: "",
    tipoDocumento: "",
    isOwnerAcc: true,
    ownerAcc: "",
  }

  const [formData, setFormData] = useState(initialState);
  const [errosState, setErrosState] = useState({})
  const [openSendingModal, setOpenSendingModal] = useState(false);
  const [step, setStep] = useState(0);
  const [requestErrorMessege, setRequestErrorMessege] = useState("Error al Procesar el Pago");
  const [startDate, setStartDate] = useState(new Date());
  const [paymentReferecce, setPaymentReferecce] = useState("Desconocida");


  const changeStep = (step) => {
    setStep(step);
  }

  const formatConcepto = (concepto) => {
    const maxLength = 30;
    if (concepto.length > maxLength) {
        return concepto.substring(0, 25) + '...';
    }
    return concepto;
  }

  const checkout = async (e) => {
    e.preventDefault();

    const erros = {};

    // creamos el validador de Teléfonode destino ejemplo 04143787747 (mi numero personal).
    // donde 0414 puede ser un 0414 | 0412 | 0424  | 0416 | 0426 | 0422

    const telefonoDestinoRegex = /^(0414|0424|0416|0426|0412|0422)\d{7}$/;
    const otpRegEx = /^[0-9]{8}$/;
    const idRegEx = /^\d{6,8}$/;


    if (!formData.Banco) erros.Banco = "El Nombre del Banco es Requerido.";
    if (!formData.TelefonoDestino) erros.TelefonoDestino = "El Teléfono es Requerido.";
    if (!telefonoDestinoRegex.test(formData.TelefonoDestino)) erros.TelefonoDestino = "El teléfono es inválido.";

    if (!formData.Cedula) erros.Cedula = "La Cédula es requerida.";    if (!formData.Otp) erros.Otp = "El OTP es Requerido.";
    if (!otpRegEx.test(formData.Otp)) erros.Otp = "El OTP es inválido.";
    if (!formData.tipoDocumento) erros.tipoDocumento = "Necesitamos saber si eres Venezolano (V) o Extranjero (E).";
    if (!formData.ownerAcc && !formData.isOwnerAcc) erros.ownerAcc = "Es necesario el Nombre del Titular del Documento"



    if (Object.keys(erros).length > 0) {
      setErrosState(erros);
      return;



    } else {

      // console.log(formData);
      // console.log(hData);
      // console.log(tasaActual);

      const { Banco, Cedula, TelefonoDestino, Otp, tipoDocumento } = formData;
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
        paymentMethodName,
        paymentMethodCode: 'c2p',
        banco: bankName,
        moneda: "Bolivares",
        ownerName: formData.isOwnerAcc ? hData.cliente : formData.ownerAcc,
        subscriberId,
        date: startDate
      });

      const conceptoParaDataToSend = commonPayload.concepto;

      const endpoint = isBdv ? "/bdv/c2p" : "/mb/c2p";
      const url = `${apiurl}${endpoint}`;
      const dataToSend = {
        TelefonoDestino: TelefonoDestino,
        Cedula: `${tipoDocumento}${Cedula}`,
        Banco: Banco,
        Concepto: formatConcepto(conceptoParaDataToSend), // Usar el concepto determinado dinámicamente
        Monto: total, // Usar el monto total calculado (en Bs)
        Otp: Otp,
        payload: commonPayload,
        fecha: startDate,
        customerDocumentId: `${tipoDocumento}${Cedula}`,
        customerNumberInstrument: TelefonoDestino,
        concept: formatConcepto(conceptoParaDataToSend),
        amount: total,
        customerBankCode: Banco,
        otp: Otp,
        coinType: "VES",
        operationType: "CELE"
      };

      // // Log para depurar los datos que se envían
      // console.log("MobilePaymentForm - Datos a enviar:", dataToSend);
      // if (hData.firstime === 'true') {
      //     console.log("MobilePaymentForm - Payload para first-time:", dataToSend.payload);
      // }

      window.scrollTo({ top: 0, behavior: 'smooth' });

      changeStep(1);

      try {
        const res = await axios.post(url, dataToSend, {
          headers: apiPaymentHeader
        });

        if (isBdv) {
          const { isSuccess, data, message } = res.data;

          // Validación estricta para BDV: debe ser exitoso y tener código 1000 (texto o número)
          if (isSuccess && (data?.code === "1000" || data?.code === 1000)) {
            // Extraemos la referencia de la estructura anidada de BDV
            const referencia = data?.data?.referencia;
            if (referencia) setPaymentReferecce(referencia);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            changeStep(3);
            return;
          } else {
            let errorMsg = data?.message;
            if (!errorMsg) {
              if (message && typeof message === 'object') {
                errorMsg = message.message;
                if (message.data && typeof message.data === 'object') {
                  const details = Object.values(message.data).join(', ');
                  if (details) errorMsg += `: ${details}`;
                }
              } else if (typeof message === 'string') {
                errorMsg = message;
              }
            }
            setRequestErrorMessege(errorMsg || "El banco rechazó la operación.");
            changeStep(2);
            return;
          }
        }

        const { code, message, reference } = res.data;

        // Aunque el status sea 200, el 'code' interno puede indicar un error.
        if (code !== "00") {
          // Construimos el mensaje incluyendo el código si está disponible.
          let specificErrorMessage = "El banco rechazó la operación. Verifique sus datos.";
          if (code && message) {
            specificErrorMessage = `Error ${code}: ${message}`;
          } else if (code) {
            specificErrorMessage = `Error ${code}: Operación rechazada.`;
          } else if (message) {
            // Si solo hay mensaje (sin código de error), lo mostramos.
            specificErrorMessage = message;
          }
          setRequestErrorMessege(specificErrorMessage);
          changeStep(2);
          return;
        }

        // Si el código es '00' pero no hay datos, es un error inesperado.
        if (!res.data) {
            setRequestErrorMessege("Respuesta inesperada del servidor. Faltan datos.");
            changeStep(2);
            return;
        }
        setPaymentReferecce(reference);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        changeStep(3);

      } catch (error) {
        let specificErrorMessage = "Ocurrió un error desconocido al procesar el pago. Por favor, intente de nuevo.";

        if (axios.isAxiosError(error) && error.response && error.response.data) {
          const { code, message } = error.response.data;
          if (code && message) {
            specificErrorMessage = `Error ${code}: ${message}`;
          } else if (code) {
            // Si solo hay código, pero no mensaje, podemos usar un mensaje genérico con el código.
            // Esto es un fallback, ya que el backend suele enviar un mensaje con el código.
            specificErrorMessage = `Error ${code}: El banco rechazó la operación.`;
          } else if (error.response.data.message) {
            specificErrorMessage = error.response.data.message;
          } else if (message) {
            specificErrorMessage = message;
          }
        } else if (error.message) {
          specificErrorMessage = error.message;
        }
        setRequestErrorMessege(specificErrorMessage); // Usamos el mensaje de error extraído.
        changeStep(2);
      }
      setErrosState({});
    }
  };

  return (
    <>
    <PaymentReminderModal isOpen={isReminderOpen} onClose={() => setIsReminderOpen(false)} />
      {
        step === 0 &&
        <form className="w-full mt-4" onSubmit={checkout}>
          <p className="mb-[16px]">Método de Pago:</p>
          <div className="w-full flex justify-start items-center gap-[8px] form-title mb-[32px]">
            <div className="relative main-svg">
              <p className="p-[4px] bg-sl-pink-700 absolute top-[-10px] right-[-15px] text-[10px] rounded-lg">P2C</p>
              <MobileTraferFlaticoBlack className="w-full h-full"/>
            </div>
            <h3 className="pl-5">Pago Móvil P2C {isBdv ? "BDV" : ""}</h3>
          </div>
          <h5>Paso 1: Coloque sus Datos Personales de Pago Móvil.</h5>
          <div className="flex flex-col">
            <Input
              isNumber={true}
              labelText={"Número de Teléfono*"}
              name={"TelefonoDestino"}
              description={null}
              value={formData.TelefonoDestino}
              onChange={(e) => setFormData({ ...formData, TelefonoDestino: e.target.value })}
              error={errosState.TelefonoDestino}
            />
          </div>
          <div className="input-box mt-4">
            <p className="font-semibold">Cedula*</p>
            <div className="flex gap-2 w-full">
              <select id="tipoDocumento" className="p-2 !w-[140px] cedula" name="tipoDocumento"
                value={formData.tipoDocumento}
                onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
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
                onWheel={(e) => e.target.blur()}
                value={formData.Cedula}
                onChange={(e) => setFormData({ ...formData, Cedula: e.target.value })}
              />
            </div>
            {errosState.tipoDocumento && <p className="!text-red-600 text-sm mt-1">{errosState.tipoDocumento} </p>}
            {errosState.Cedula && <p className="!text-red-600 text-sm mt-1">{errosState.Cedula}</p>}
          </div>

          <div className="input-box mt-4">
            <span className="font-semibold">Banco*</span>
            <select name="Banco" id="Banco" className="w-full p-2"
              value={formData.Banco}
              onChange={(e) => setFormData({ ...formData, Banco: e.target.value })}>
              <option value="">Seleccione su Banco</option>
              {bancos_venezuela.map((banco) => {
                return <option value={banco.codigo}>{banco.nombre}</option>;
              })}
            </select>
            {errosState.Banco && <p className="!text-red-600 text-sm mt-1">{errosState.Banco}</p>}
          </div>

          <div className="my-4">
            <DateInput
              labelText="Fecha de Depósito*"
              value={startDate}
              onChange={setStartDate}
              error={errosState.date}
            />
          </div>
          {/* <div className="w-full mt-4">
        <Input
          isNumber={true}
          labelText={"Monto*"}
          name={"Monto"}
          description={null}
          value={formData.Monto}
          onChange={(e) => setFormData({ ...formData, Monto: e.target.value })}
        />
      </div> */}

          {/* <label className="w-full mt-4 flex justify-between items-center hover:cursor-pointer">
            <p>Soy el Titular de la Cuenta a Pagar</p>
            <input type="checkbox" className="w-4 h-4 accent-razzle-dazzle-rose-600" checked={formData.isOwnerAcc}
              onChange={(e) => setFormData({ ...formData, isOwnerAcc: !formData.isOwnerAcc })} />
          </label> */}

          {!formData.isOwnerAcc && (<Input
            labelText={"Titular de la Cuenta"}
            description={"Coloque Este Dato si no es el Titular de la Cuenta a Debitar"}
            name={"ownerAcc"}
            value={formData.ownerAcc}
            onChange={(e) => setFormData({ ...formData, ownerAcc: e.target.value })}
            error={errosState.ownerAcc}
          />)
          }

          <h5 className="my-[24px]">Paso 2: Solicite su clave de aprobación de 8 dígitos o token de acceso.</h5>
          <p>Su banco de confianza le entregará su clave token de acceso.</p>
          <div className="w-full mt-4">
            <Input
              isNumber={true}
              name={"Otp"}
              labelText={
                <div className="flex gap-2 items-center">
                  <img className="w-4 h-4" src={mobile} alt="" />
                  <span className="font-semibold">OTP*</span>
                </div>
              }
              className="!bg-slate-400 text-center tracking-[12px] w-full"
              value={formData.Otp}
              onChange={(e) => {
                if (e.target.value.length <= 8) { setFormData({ ...formData, Otp: e.target.value }) } else {
                  setFormData({ ...formData })
                }
              }}
            />
            <p className="text-sm text-gray-500 mt-1">
              Introduzca su clave de 8 dígitos
            </p>
            {errosState.Otp && (
              <p className="text-red-500 text-sm mt-1">{errosState.Otp}</p>
            )}
          </div>



          <div className="my-[32px] !border-none">
            <button type="submit" className="mt-6 base !border-none" disabled={disableSubmit}>
              Pagar Servicio
              </button>

          </div>
        </form>
      }

      <TrasactionProgress
        step={step}
        chageStep={changeStep}
        failMessage={
          <div className="w-full flex flex-col items-center">
            <p className="font-bold mb-2 text-amber-700 ">Ocurrió un Error al Procesar el Pago</p>
            <div className="w-full relative bg-sl-gray-900 flex flex-col items-center p-4 my-4 rounded-lg">
              <p className="text-center text-amber-700 font-bold pb-2 mb-2 w-full">
                Mensaje del Sistema
              </p>
              <p className="!text-amber-700 text-center font-semibold pt-4">
                {requestErrorMessege}
              </p>
            </div>
            <p className="text-center text-amber-700">Por favor, verifique los datos e intente de nuevo. Si el problema persiste, contacte a soporte.</p>
          </div>
        }
        meesageProcess={
          <p className="max-w-[300px]  text-center">
            Se está procesando el pago
          </p>
        }
        messageSucces={
          <SuccessComponent
            message="Los datos fueron recibidos correctamente."
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
                <div className="sl-invocie-item !p-0"><p>Forma de Pago:</p><p>Pago Móvil P2C</p></div>
                <div className="sl-invocie-item !p-0"><p>Referencia:</p><p>{paymentReferecce}</p></div>
                <div className="sl-invocie-item !border-b-sl-gray-800 !p-0"><p>Fecha de depósito:</p><p>{startDate ? startDate.toLocaleDateString() : 'N/A'}</p></div>
                <div className="sl-invocie-item !p-0"><p>Monto pagado</p><p>{total}Bs.</p></div>
              </>
            }
          />
        }
      />

    </>
  );
}
