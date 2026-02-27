import React, { useMemo } from "react";
import PaypalLogoWhite from "../icons/PaypalLogoWhite";
import ZelleWhite from "../icons/ZelleWhite";
import FlaticonTansfres from "../icons/FlaticonTansfres";
import MobileTransferFlaticon from "../icons/MobileTransferFlaticon";
import Logo7Link from "../icons/Logo7Link";
import SLinkLogoWhite from "../icons/7LinkLogoWhite";
import DebitoInmediato from "../icons/DebitoInmediato";
import SlLogoWhite from "../icons/SlLogoWhite";
import WhatsappIcon from "../icons/WhatsappIcon";
// import MobileTranferIcon from ".../icons/mobileTranfer.svg";

export default function PaymentMethodTab({ currentTab, updateTab, allowedMethods, cliente, documento }) {
  // los paymentMethod son
  // zelle
  // paypal
  // tranferenciadirecta
  // c2p
  // r4
  // Tarjetadecredito

  const imgArr = [
    // "https://fxeneqifoheleuedaeef.supabase.co/storage/v1/object/public/test/sl-payment-bg/Leonardo_Phoenix_10_A_cute_little_fluffy_white_and_grey_kitten_2.jpg",
    "https://fxeneqifoheleuedaeef.supabase.co/storage/v1/object/public/test/sl-payment-bg/mujer-en-sofa.jpg",
    // "https://fxeneqifoheleuedaeef.supabase.co/storage/v1/object/public/test/sl-payment-bg/collage-de-personas-usando-carretes.jpg",
    "https://fxeneqifoheleuedaeef.supabase.co/storage/v1/object/public/test//chica-7lin-xd.jpg",
    "https://fxeneqifoheleuedaeef.supabase.co/storage/v1/object/public/test/sl-payment-bg/Flux_Dev_highresolution_stock_photo_of_A_harmonious_image_capt_2.jpg",
    "https://fxeneqifoheleuedaeef.supabase.co/storage/v1/object/public/test/sl-payment-bg/pixlr-image-generator-6866e51c2f78752e5fd3924e.png"
  ];

  const ramdomImg = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * imgArr.length);
    return imgArr[randomIndex];
  }, []);

  const whatsappUrl = useMemo(() => {
    const baseMessage = 'Hola, tengo un problema con mi enlace de pago, parece que es inválido o ha expirado.';
    const clientInfo = cliente ? `\n\nSoy el cliente: ${cliente}${documento ? ` (C.I./RIF: ${documento})` : ''}.` : '';
    const finalMessage = `${baseMessage}${clientInfo}\n\n¿Podrían ayudarme? Gracias.`;
    
    const encodedMessage = encodeURIComponent(finalMessage);
    return `https://wa.me/584126389082?text=${encodedMessage}`;
  }, [cliente, documento]);

  return (
    <div className="w-full flex sl-tab-select">
      <div className="flex flex-col gap-4 items-center w-full lg:w-1/2 lg:min-w-[600px] p-[32px]">
        <div className="flex flex-col items-center w-full">
         <div className="mx-auto mb-4 self-center">
            <Logo7Link />
          </div>
          <h3 className="!text-sl-blue-50 mt-[16px]">Centro de Pago</h3>
          {cliente && (
            <h5 className="!mt-2 !text-white text-center">
              Bienvenid@ {cliente} <br /> <span className="!text-sm !text-gray-300">{documento}</span>
            </h5>
          )}
          <div className="divider w-full"></div>
        </div>

        {/* <div className="divider w-full"></div> */}
        {allowedMethods.length > 0 ? (
          <>
            <h3 className="text-sm mb-3 text-center">Seleccione un Método de Pago para Continuar.</h3>
            <nav className="tab-bar">
              {(
                allowedMethods.includes("paypal") ||
                allowedMethods.includes("zelle"))
                && (
                  <>
                    <h5>Moneda Extranjera</h5>
                    <ul className="mt-6 grid grid-cols-2 gap-6 max-w-full justify-center relative z-9">


                      {allowedMethods.includes("paypal") && (
                        <li onClick={() => updateTab({ paymentMethod: "paypal" })}>
                          <p className="!mb-[2px]">Transferencia</p>
                          <div className="paypal max-w-full w-25 flex justify-center">
                            <PaypalLogoWhite />
                          </div>
                        </li>
                      )}
                      {allowedMethods.includes("zelle") && (
                        <li onClick={() => updateTab({ paymentMethod: "zelle" })}>
                          <p className="!mb-[2px]">Transferencia</p>
                          <div className="paypal max-w-full w-20 flex justify-center">
                            <ZelleWhite />
                          </div>
                        </li>
                      )}
                    </ul>
                    <div className="divider w-full"></div>
                  </>
                )}
              {(
                allowedMethods.includes("tranferenciadirecta") ||
                allowedMethods.includes("pago-movil") ||
                allowedMethods.includes("c2p") ||
                allowedMethods.includes("r4"))
                && (
                  <>
                    <h5>Moneda Nacional Bolívares</h5>
                    <ul className="mt-6 grid grid-cols-2 gap-6 max-w-full justify-center relative z-9">

                      {allowedMethods.includes("tranferenciadirecta") && (
                        <li onClick={() => updateTab({ paymentMethod: "tranferenciadirecta" })}>
                          <p className="text-center !mb-[2px]">Transferencia Bancaria</p>
                          <div className="flex justify-center max-w-full w-25">
                            <FlaticonTansfres />
                          </div>
                        </li>
                      )}
                      {allowedMethods.includes("pago-movil") && (
                        <li onClick={() => updateTab({ paymentMethod: "pago-movil" })}>
                          <p className="text-center !mb-[2px]">Pago Móvil Tradicional</p>
                          <div className="flex justify-center relative">
                            <div className="r4-e max-w-full w-25 flex justify-center">
                              <MobileTransferFlaticon />
                            </div>
                          </div>
                        </li>
                      )}
                      {allowedMethods.includes("c2p") && (
                        <li onClick={() => updateTab({ paymentMethod: "c2p" })}>
                          <p className="text-center !text-[10px] !mb-[2px]">Pago Móvil P2C</p>
                          <div className="flex justify-center items-center flex-col ">
                            <div className="relative max-w-full w-25 flex justify-center">
                              <p className="p-[4px] bg-sl-blue-700 absolute top-[-4px] right-[16px] text-[10px] rounded-lg ">P2C</p>
                              <MobileTransferFlaticon />
                            </div>
                            <p className="text-center mt-[-3px] !text-[10px] !mb-[2px]">Pago por Clave Generada</p>
                          </div>
                        </li>
                      )}
                      {allowedMethods.includes("r4") && (
                        <li onClick={() => updateTab({ paymentMethod: "r4" })}>
                          <p className="text-center !mb-[2px]">Débito Inmediato</p>
                          <div className="flex justify-center">
                            <div className="r4-e max-w-full w-25 flex justify-center">
                              <DebitoInmediato />
                            </div>
                          </div>
                        </li>
                      )}
                    </ul>
                  </>
                )}
              {/* <h4>Tarjeta 🤩 </h4> */}
              {/* <h4>Tarjeta</h4> */}
              {/* <ul className="mt-2">
          <li
            className={``}
            onClick={() => updateTab({ paymentMethod: "creditCard" })}
          >
            <p>Tarjeta de credito</p>
            <div className="paypal">
              <CredidCard />
            </div>
          </li>
        </ul> */}
              {/* <div className="w-full h-[1px] bg-slate-700 my-4"></div>
      <h4>Cashealo</h4> */}           
            </nav>
          </>
        ) : (
          <div className="text-center text-white p-4">
            <h3 className="text-lg mb-3 text-sl-red-500 font-bold">Error de Configuración</h3>
            <p className="mb-6">
              El enlace de pago no es válido o ha expirado. Por favor, contacte a soporte para obtener un nuevo enlace.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-white font-semibold rounded-lg"
            >
              <span className="[&_svg]:w-full [&_svg]:h-full [&_svg]:fill-white"><WhatsappIcon /></span>
              <span>Contactar a Soporte</span>
            </a>
          </div>
        )}
      </div>
      <div className="w-1/2 hidden lg:block relative">
        <div className="absolute top-0 left-0 right-0 bottom-0 p-[32px] bg-sl-pink-950/10 flex justify-center " >
          <div className="logo-7-link-oficial">
            <SlLogoWhite />
          </div>

        </div>
        <img
          className="w-full !h-full object-cover"
          src={ramdomImg} alt="" />
      </div>


    </div>
  );
}
