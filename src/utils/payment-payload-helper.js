export const getCommonPaymentPayload = (hData, extraData = {}) => {
  const {
    total,
    tasaActual,
    paymentMethodName, // Ej: "Zelle Chase", "PayPal"
    paymentMethodCode, // Ej: "zelleChase", "paypal"
    banco,
    moneda,
    ownerName,
    subscriberId,
    date = new Date(),
    montoItf,
  } = extraData;

  // Datos base
  const basePayload = {
    total,
    monto: hData.monto ? String(hData.monto).replace(',', '.') : '0',
    tasaActualBCV: tasaActual,
    tasa: tasaActual,
    moneda,
    medio_de_pago: paymentMethodName,
    metodo_de_pago: paymentMethodName,
    banco,
    paymentMethod: paymentMethodCode,
    payment_type: paymentMethodCode,
    cid: subscriberId,
    sub: subscriberId,
    suscriptor: subscriberId,
    date,
    nombre: ownerName,
    cliente: hData.cliente || ownerName,
    client_id: hData.client_id || hData.id_de_usuario || '',
    id_de_usuario: hData.id_de_usuario || hData.client_id || '',
  };

  // Añadir montoItf solo si tiene un valor, para evitar enviar "undefined"
  if (montoItf !== undefined && montoItf !== null && montoItf !== '') {
    basePayload.montoItf = montoItf;
  }

  // Lógica para Nuevo Contrato (First Time)
  if (hData.firstime === 'true' && hData.fullInvoiceData) {
    const invoice = hData.fullInvoiceData;
    const allFirstTimeInvoices = JSON.parse(sessionStorage.getItem('allFirstTimeInvoices') || '[]');
    const publicInvoiceIds = allFirstTimeInvoices.map(inv => inv.invoice_number);

    return {
      ...basePayload,
      mode: "first-time",
      cliente: invoice.client_name,
      client_name: invoice.client_name,
      identificacion: invoice.client_national_identification_number,
      client_national_identification_number: invoice.client_national_identification_number,
      client_id: invoice.id,
      id_de_usuario: invoice.id,
      facturas: [invoice.id], 
      invoices: [invoice.id],
      facturas_id_visual: publicInvoiceIds,
      public_invoices_id: publicInvoiceIds,
      suscriptor: invoice.sub_id || subscriberId,
      concepto: `pago factura ${invoice.invoice_number}`
    };
  }

  // Lógica para Clientes Existentes
  const mode = hData.ac ? "ac" : "customer_balance";
  const common = {
    ...basePayload,
    mode,
    invoice_id: hData.invoice_id
  };

  if (mode === "customer_balance") {
    const cachedInvoices = JSON.parse(sessionStorage.getItem('invoices') || '[]');
    const pendingAcs = cachedInvoices.filter(inv => inv.balance > 0).map(inv => inv.invoice_number);
    return {
      ...common,
      acs: pendingAcs.join(','),
      ac: pendingAcs.length > 0 ? pendingAcs[pendingAcs.length - 1] : '',
      concepto: `pago ${pendingAcs.join(', ')}`
    };
  }

  return {
    ...common,
    ac: hData.ac || '',
    concepto: `pago ${hData.ac}`
  };
};
