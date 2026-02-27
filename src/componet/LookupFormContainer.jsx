import React from 'react';
import Logo7Link from '../icons/Logo7Link';
import SllogoClasic from "../icons/SllogoClasic";

export default function LookupFormContainer({
  onSubmit,
  onGoBack,
  isLoading,
  error,
  title,
  submitButtonText,
  showFormButtons = true, 
  theme = 'dark',
  children,
}) {
  const themeClasses = {
    dark: {
      container: '!bg-sl-blue-950',
      title: '!text-white',
      text: '!text-white',
      button: '!btn !btn-ghost !w-full !text-center !bg-transparent !border-transparent !text-white hover:!bg-white/10',
      error: '!alert !alert-error !mt-4 !text-white',
    },
    light: {
      container: '!bg-white',
      title: '!text-black',
      text: '!text-black',
      button: '!btn !btn-ghost !w-full !text-center !text-black hover:!bg-sl-gray-100 !bg-transparent !border-none',
      error: '!alert !alert-error !mt-4',
    },
  };

  const currentTheme = themeClasses[theme];

  return (
    <div
      className={`!w-full !max-w-md !mx-auto !h-full !flex !flex-col !items-center !justify-center !p-8 !min-h-[300px] !rounded-box ${currentTheme.container}`}
    >
      <div className="!w-56 !mx-auto !mb-4 !self-center">
        {theme === 'light' ? <SllogoClasic /> : <Logo7Link />}
      </div>
      <div className="!w-full">
        <h1 className={`${currentTheme.title} !text-center`}>{title}</h1>
        
        {/* El formulario se renderiza solo si se proporciona onSubmit */}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="!w-full !flex !flex-col !items-center !space-y-4">
            {children}
            {showFormButtons && ( // Renderizar botones de formulario condicionalmente
              <div className="!w-full !flex !flex-col !space-y-2">
                <button type="submit" className="!btn !bg-sl-pink-500 !text-white !border-none" disabled={isLoading}>
                  {isLoading ? <span className="!loading !loading-spinner"></span> : submitButtonText}
                </button>
                <div className="!divider !w-full">O</div>
                <button type="button" onClick={onGoBack} className={currentTheme.button}>
                  Regresar
                </button>
              </div>
            )}
            {error && (
              <div role="alert" className={currentTheme.error}>
                <svg xmlns="http://www.w3.org/2000/svg" className="!stroke-current !shrink-0 !h-6 !w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}
          </form>
        ) : (
          // Si no hay onSubmit, solo renderizar los children y un botón de regresar si se proporciona onGoBack
          <>
            {children}
            {onGoBack && (
              <div className="!w-full">
                <div className="!divider !w-full">O</div>
                <button type="button" onClick={onGoBack} className={currentTheme.button}>Regresar</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}