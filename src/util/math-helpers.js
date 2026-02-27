/**
 * Redondea un número de forma segura a una cantidad específica de decimales,
 * evitando problemas de precisión con punto flotante.
 * @param {number} num El número a redondear.
 * @param {number} [decimals=2] La cantidad de decimales.
 * @returns {number} El número redondeado.
 */
export const roundTo = (num, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};