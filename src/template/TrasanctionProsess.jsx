import React, { useRef, useEffect } from 'react';
import CloseIcon from '../icons/CloseIcon';
import SlinkLogoRed from '../icons/SlinkLogoRed';
import SlLogoBlack from '../icons/SlLogoBlack';
import InvalidWanrnigRed from '../icons/InvalidWanrnigRed';
import SlLogoBlue from '../icons/SlLogoBlue';
import LogoClasic from '../icons/SllogoClasic';
import Conffetti from '../icons/Conffetti';


const TrasactionProgress = ({ step = 0, meesageProcess = "Procesando pago", messageSucces = "Operacion exitoxa", failMessage = "Operacion fallida", chageStep, reloadProcess, processTitle }) => {

    
    // useEffect(() => {
    //     if ((step === 2 || step === 3) && scrollRef.current) {
    //         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    //     }
    // }, [step]);

    return (
        <>
            {
                step > 0 && <div id="sl-transaction-progress" className='
                absolute 
                p-[32px] 
                top-0 
                left-0 
                right-0 
                bottom-0
                w-full 
                h-full 
                '>
                    {
                        step === 1 && <div className="progress-box">
                            <div>
                                <div className='sl-logo-process'>
                                    <SlLogoBlack />

                                </div>
                                <h4>{processTitle || "Procesando Pago"}</h4>
                            </div>
                            <div className='w-full  flex justify-center'>
                                <div className="loader"></div>
                            </div>
                            <div>{meesageProcess}</div>
                        </div>
                    }

                    {
                        step === 2 && <div className="progress-box overflow-auto" >
                            <div className='flex flex-col items-center' >
                                <div className='sl-logo-process'>
                                    <SlinkLogoRed />
                                </div>

                                <h4>Error al Procesar el Pago</h4>

                            </div>

                            <div className='procces-error-icon'>
                                <InvalidWanrnigRed />
                            </div>

                            <div className='w-full'>
                                <div className='w-full'>
                                    {
                                        failMessage}
                                </div>
                                {reloadProcess && <button>
                                    Intentar De Nuevo
                                </button>}
                                <button className='box-btn !bg-sl-pink-500 hover:!text-white hover:!bg-sl-pink-800 ' 
                                onClick={() => chageStep(0)}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    }

                    {
                        step === 3 && <div className="progress-box overflow-auto h-auto !justify-start" 
                        // ref={scrollRef}
                        >
                            <div className='flex flex-col items-center' >
                            </div>
                            <div className='flex flex-col items-center w-full'>
                                {/* LogoClasic is now rendered inside messageSucces (SuccessComponent) */}
                                <div>
                                    {messageSucces}
                                </div>

                                <a href="https://7linknetwork.com/">Volver al Home</a>
                            </div>

                        </div>
                    }

                    <button className='absolute right-0 top-0 close-btn' onClick={() => chageStep(0)}>
                        <CloseIcon />
                    </button>
                </div>
            }
        </>
    );
}

export default TrasactionProgress;
