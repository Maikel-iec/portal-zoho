import React from 'react';

const TrasactionModal = ({ isOpen, isLoading, isSucces, isError, onClose }) => {
    return (
        <div className='w-screen p-8 h-screen fixed top-0 left-0 flex justify-center items-start bg-gray-800/20'>
            <div className='p-5 bg-gray-500 w-full max-w-[500px] rounded-xl'>
                {
                    isLoading && <>
                        <h4>Cargando...</h4>
                    </>
                }

            </div>
        </div>
    );
}

export default TrasactionModal;
