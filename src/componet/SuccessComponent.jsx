import React from 'react';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import Exito from '../icons/Banner_Club.png';
import LogoClasic from '../icons/SllogoClasic';
// --- 1. Importar las animaciones locales ---
// Asumimos que has guardado los archivos en una carpeta 'lottie' dentro de 'src'.
import successAnimation from '../icons/lottie/Success.lottie';
import warningAnimation from '../icons/lottie/Warning.lottie';

/**
 * Componente unificado para mostrar mensajes de éxito con una animación.
 * @param {object} props
 * @param {string} props.message - El mensaje principal de éxito a mostrar.
 * @param {React.ReactNode} props.transactionInfo - JSX con los detalles de la transacción.
 */
export default function SuccessComponent({ message, transactionInfo, isPartialPayment }) {
  const dotLottieCanvasRef = React.useRef(null);

  React.useEffect(() => {
    if (dotLottieCanvasRef.current) {
      // --- 2. Seleccionar la animación importada ---
      const animationSrc = isPartialPayment ? warningAnimation : successAnimation;
      const dotLottie = new DotLottie({
        canvas: dotLottieCanvasRef.current,
        src: animationSrc, // Usamos la variable con la ruta local
        autoplay: true,
        loop: true,
        speed: isPartialPayment ? 2 : 1,
      });

      return () => dotLottie.destroy();
    }
  }, [isPartialPayment]);

  return (
    <div className="w-full flex flex-col items-center max-w-[400px] text-center">
      <div className='sl-logo-process'>
        <LogoClasic />
      </div>
      <canvas ref={dotLottieCanvasRef} style={{ width: '200px', height: '200px', margin: '0 auto' }}></canvas>
      <p className="text-center font-w-bold text-xl">{message}</p>
      {isPartialPayment && (
        <p className="text-center font-semibold my-1 text-amber-800">Por interes Mutuo Cancele el Total Adeudado</p>
      )}
      <div>{transactionInfo}</div>
        <img src={Exito} alt="Exito" className="!h-[280px]" />
    </div>
  );
}