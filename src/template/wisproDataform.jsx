import React, { useState } from "react";
import axios from "axios";
import Input from "../componet/Input";
import { format } from "date-fns";
import { TOKEN, wispro } from "../util/proyect-config";
import LookupFormContainer from "../componet/LookupFormContainer";
import AffiliationResult from "../componet/AffiliationResult";

export default function CedulaLookupForm() {
  // --- ESTADOS ---
  const [identityType, setIdentityType] = useState("V");
  const [cedula, setCedula] = useState("");
  const [invoices, setInvoices] = useState([]); // Almacenará todas las facturas
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoBackToSelection = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('firstime');
    window.location.href = url.toString();
  };
  const redirectToPayment = (pendingInvoices, totalBalance) => {
    if (!pendingInvoices || pendingInvoices.length === 0) {
      console.error("No hay facturas pendientes para construir la URL de pago.");
      setError("No se pudieron cargar los datos de la factura. Intente de nuevo.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const formattedDate = format(new Date(), "dd+MMM+yyyy");
      const montoParaQuery = parseFloat(totalBalance).toFixed(2).replace('.',',');

      // Usamos los datos de la primera factura para la información general del cliente
      const representativeInvoice = pendingInvoices[0];

      // Store the full invoice data in sessionStorage for PaymentForm to retrieve
      // Guardamos TODAS las facturas pendientes para el modo first-time
      sessionStorage.setItem('allFirstTimeInvoices', JSON.stringify(pendingInvoices));
      // Guardamos la primera factura como representativa para la UI de pago.
      sessionStorage.setItem('currentInvoiceData', JSON.stringify(representativeInvoice));

      // Construir los query params para PaymentForm
      const params = new URLSearchParams({
        cliente: representativeInvoice.client_name,
        monto: montoParaQuery,
        date: formattedDate,
        // Pasamos los IDs de todas las facturas que se están pagando
        invoice_id: pendingInvoices.map(inv => inv.id).join(','),
        documento: representativeInvoice.client_national_identification_number,
        sub: representativeInvoice.contract_id || '', // Añadimos el ID del contrato como 'sub'
        firstime: 'true',       // Mantenemos el parámetro para la lógica de enrutamiento
      });

      // Redirigir a la vista de pago con los datos de la factura
      window.location.href = `${window.location.pathname}?${params.toString()}`;
    } catch (err) {
      console.error("Error al redirigir al pago:", err);
      setError("No se pudo iniciar el proceso de pago. Por favor, inténtelo de nuevo más tarde.");
      setIsLoading(false);
    }
  };

  // --- MANEJADOR DEL ENVÍO ---
  const handleLookup = async (e) => {
    e.preventDefault();

    // Validación simple
    if (!cedula.trim()) {
      setError("Por favor, ingrese un número de cédula.");
      return;
    }

    // Limpiar estados previos
    setError("");
    setInvoices([]);
    setIsLoading(true);

    const searchWithPrefix = async () => {
      const tokenKey = Object.keys(TOKEN)[0];
      const tokenValue = TOKEN[tokenKey];
      const headers = { [tokenKey]: tokenValue };
      const documentNumberWithPrefix = `${identityType}${cedula}`;
      
      const response = await axios.get(`${wispro}/${documentNumberWithPrefix}`, { headers });      
      if (response.data && response.data.isSuccess) {
        return response.data.data.data; // Devuelve el array de facturas (puede estar vacío)
      }
      throw new Error(response.data.message || "No se encontraron datos con el prefijo.");
    };

    const searchWithoutPrefix = async () => {
      const tokenKey = Object.keys(TOKEN)[0];
      const tokenValue = TOKEN[tokenKey];
      const headers = { [tokenKey]: tokenValue };
      
      const response = await axios.get(`${wispro}/${cedula}`, { headers });
      if (response.data && response.data.isSuccess) {
        return response.data.data.data; // Devuelve el array de facturas (puede estar vacío)
      }
      throw new Error(response.data.message || "No se encontraron datos para la cédula ingresada.");
    };

    try {
      // Intento 1: con prefijo
      const foundInvoices = await searchWithPrefix();
      if (foundInvoices.length > 0) {
        setInvoices(foundInvoices);
      } else { throw new Error("No se encontraron datos con el prefijo."); }
      setIsLoading(false);
    } catch (err) {
      try {
        // Intento 2: sin prefijo
        const foundInvoices = await searchWithoutPrefix();
        if (foundInvoices.length > 0) {
          setInvoices(foundInvoices);
        } else { throw new Error("No se encontraron datos para la cédula ingresada."); }
        setIsLoading(false);
      } catch (finalErr) {
        // Si ambos intentos fallan, mostramos el error del último intento.
        const errorMessage = finalErr.message || "Ocurrió un error al realizar la consulta.";
        console.error("Ambos intentos de búsqueda fallaron. Error final:", finalErr.message);
        setError(errorMessage);
        setIsLoading(false); // Solo detenemos la carga si hay un error final
      }
    }
  };

  // --- RENDERIZADO DE LA VISTA DE AFILIACIÓN ---
  if (invoices.length > 0) {
    const pendingInvoices = invoices.filter(inv => parseFloat(inv.balance || 0) > 0);
    const totalBalance = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0);
    const representativeInvoice = invoices[0];

    return (
      <AffiliationResult
        clientData={{
          name: representativeInvoice.client_name,
          id: representativeInvoice.client_national_identification_number,
          fiscalId: representativeInvoice.client_taxpayer_identification_number || representativeInvoice.client_national_identification_number,
          email: representativeInvoice.client_email,
        }}
        pendingInvoices={pendingInvoices}
        totalBalance={totalBalance}
        onProcessPayment={() => redirectToPayment(pendingInvoices, totalBalance)}
        onGoBack={() => setInvoices([])}
        isLoading={isLoading}
        theme="light"
      />
    );
  }

  return (
    <LookupFormContainer
      theme="light"
      onSubmit={handleLookup}
      onGoBack={handleGoBackToSelection}
      isLoading={isLoading}
      error={error}
      title="Verificar Contrato" 
      submitButtonText="Verificar Datos"
    >
      <div className="!w-full !mt-4">
        <label className="!label">
          <span className="!label-text !text-black">Cédula o Rif Afiliado*</span>
        </label>
        <div className="!flex !items-start !gap-2">
          <select
            value={identityType}
            onChange={(e) => setIdentityType(e.target.value)}
            className="!select !select-bordered !w-1/3 !bg-sl-gray-50 !text-black !border-sl-gray-300 disabled:!bg-sl-gray-200"
            disabled={isLoading}
          >
            <option value="V">V</option>
            <option value="E">E</option>
            <option value="J">J</option>
            <option value="G">G</option>
          </select>
          <Input
            name="cedula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Cédula / Rif*"
            type="text"
            disabled={isLoading}
            className="!input !input-bordered !w-full !bg-sl-gray-50 !placeholder-sl-gray-400 !text-black !border-sl-gray-300 disabled:!bg-sl-gray-200"
          />
        </div>
      </div>
    </LookupFormContainer>
  );
}