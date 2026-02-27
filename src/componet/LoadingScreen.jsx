import React from 'react';
import Logo7Link from '../icons/Logo7Link';
import SllogoClasic from '../icons/SllogoClasic';

export default function LoadingScreen({ message, theme = 'dark' }) {
  const themeClasses = {
    dark: {
      container: '!bg-sl-blue-950',
      title: '!text-white',
      text: '!text-white',
      spinner: '!text-sl-pink-500',
    },
    light: {
      container: '!bg-white',
      title: '!text-black',
      text: '!text-black',
      spinner: '!text-sl-pink-500', // Mantenemos el mismo color de spinner o puedes cambiarlo
    },
  };

  const currentTheme = themeClasses[theme];

  return (
    <div className="!w-full !min-h-screen !flex !flex-col !items-center !justify-center !p-4">
      <div
        className={`!w-full !max-w-md !mx-auto !h-full !flex !flex-col !items-center !justify-center !p-8 !min-h-[300px] !rounded-box ${currentTheme.container}`}
      >
        <div className="!w-56 !mx-auto !mb-4 !self-center">
          {theme === 'light' ? <SllogoClasic /> : <Logo7Link />}
        </div>
        <h1 className={`${currentTheme.title} !text-2xl !font-bold !mb-4`}>Centro de Pagos</h1>
        <div className={`!loading !loading-spinner !loading-lg ${currentTheme.spinner}`}></div>
        <p className={`!mt-4 !text-lg ${currentTheme.text}`}>{message}</p>
      </div>
    </div>
  );
}