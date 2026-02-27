import React, { useEffect, useState, useRef } from 'react';
import QuantumJunior from '../icons/media/Quantum_Junior.mp4'
import CloseIcon from '../icons/CloseIcon';

export default function PaymentReminderModal({ isOpen, onClose }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
        // Intenta reproducir el video cuando el modal se abre.
        videoRef.current?.play().catch(() => {}); // Se ignora el error si el autoplay es bloqueado.
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Pausa el video cuando el modal se cierra para detener el sonido.
      videoRef.current?.pause();
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <div className={`!fixed !inset-0 !z-[9999] !flex !items-center !justify-center !p-4 !transition-opacity !duration-300 !ease-out ${isAnimating ? '!opacity-100' : '!opacity-0'}`}>
      <div className="!absolute !inset-0 !bg-black/60 !backdrop-blur-sm" onClick={onClose}></div>
      <div className={`!bg-sl-blue-950 !border !border-sl-blue-800 !rounded-2xl !shadow-2xl !w-full !max-w-md !p-6 !relative !z-10 !transform !transition-all !duration-300 !ease-out ${isAnimating ? '!scale-100 !translate-y-0' : '!scale-95 !translate-y-4'}`}>
        <button
          onClick={onClose}
          className="!absolute !top-4 !right-4 !text-white hover:!text-sl-pink-500 !transition-colors !w-5 !h-5 !cursor-pointer !opacity-70 !bg-transparent !border-none !p-0 !min-h-0 !min-w-0"
          aria-label="Cerrar"
        ><div className="!w-5 !h-5"><CloseIcon /></div></button>
        
        <div className="!flex !flex-col !items-center !text-center">
          <div className="!relative !w-60 !h-60 !mb-4 !flex !items-center !justify-center !rounded-full !overflow-hidden">
            {/* <div className="absolute inset-0 bg-sl-pink-900/40 rounded-full animate-ping opacity-75"></div> */}
            <video
              ref={videoRef}
              src={QuantumJunior}
              autoPlay
              loop
              playsInline            
              className="!w-full !h-full !object-cover"
            />
          </div>
          
          {/* <h3 className="text-xl font-bold text-white mb-2">
            ¡Recordatorio Importante!
          </h3>
           */}
          <div className="!space-y-4 !text-gray-300">
            {/* <p>
              Recuerde que después de realizar su pago, <span className="font-bold text-white uppercase">debe reportarlo</span> en este formulario.
            </p> */}
            <div className="!bg-sl-blue-900 !text-white !p-4 !rounded-xl !text-sm !font-medium">
              <p>Valoramos tu confianza en nosotros. Recuerda reportar a tiempo. ¡Y sigue disfrutando de 7Link, internet sin limites!</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="!mt-6 !w-full !bg-sl-pink-500 hover:!bg-sl-pink-600 !text-white !font-bold !py-3 !px-4 !rounded-xl !border-none"
          >
            Pagar y Reportar
          </button>
        </div>
      </div>
    </div>
  );
}