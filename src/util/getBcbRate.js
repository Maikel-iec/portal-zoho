import axios from "axios";
import { apiPaymentHeader, apiurl } from "./proyect-config.js";

/**
 * Obtiene la tasa de cambio del BCV para el día actual.
 * @returns {Promise<number>} La tasa de cambio.
 * @throws {Error} Si no se puede obtener la tasa de cambio.
 */
export const getBcvRate = async () => {
  const date = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
  const res = await axios.post(
    `${apiurl}/mb/bcv`,
    { Moneda: "USD", Fechavalor: date },
    { headers: apiPaymentHeader }
  );
  if (res.data && res.data.tipocambio) {
    return res.data.tipocambio;
  }
  throw new Error("No se pudo obtener la tasa de cambio del BCV.");
};
