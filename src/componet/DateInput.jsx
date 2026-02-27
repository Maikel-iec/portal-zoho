import React from 'react';
import { format } from 'date-fns';

const DateInput = ({
  labelText,
  value,
  onChange,
  error,
  ...props
}) => {

  const handleDateChange = (e) => {
    const dateString = e.target.value;
    // Validamos que el string no esté vacío y tenga el formato esperado.
    if (dateString && dateString.includes('-')) {
      // Convertimos 'YYYY-MM-DD' a un objeto Date en la zona horaria local
      // para evitar problemas de desfase de un día.
      const [year, month, day] = dateString.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      onChange(localDate);
    } else { // Si el campo está vacío o el formato no es válido
      onChange(null);
    }
  };

  // Formateamos el objeto Date a 'YYYY-MM-DD' para el valor del input.
  const formattedDate = value instanceof Date && !isNaN(value)
    ? format(value, 'yyyy-MM-dd')
    : '';

  return (
    <div className="w-full">
      <label className="flex flex-col">
        {labelText && (
          <span className="font-semibold !mb-[8px] whitespace-nowrap">
            <span className="sm:hidden">Fecha*</span>
            <span className="hidden sm:inline">{labelText}</span>
          </span>
        )}
        <input
          type="date"
          value={formattedDate}
          onChange={handleDateChange}
          max={format(new Date(), 'yyyy-MM-dd')}
          className={`w-full p-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md`}
          style={{
            colorScheme: 'light',
          }}
          {...props}
        />
      </label>
      <div className="h-4 mt-1">
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
    </div>
  );
};

export default DateInput;