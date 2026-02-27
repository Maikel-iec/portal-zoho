export default function useRedirectToPayment() {
  const redirect = ({ pendingInvoices, totalBalance, tag, paymentUrl, isFirstTime = false }) => {
    if (!pendingInvoices || pendingInvoices.length === 0) {
      console.error("No hay facturas pendientes para construir la URL de pago.");
      return;
    }

    try {
      const representativeInvoice = pendingInvoices[0];

      // 🔥 SI viene paymentUrl personalizada (DataForm), úsala
      if (paymentUrl) {
        // console.log('🎯 Usando paymentUrl personalizada:', paymentUrl);
        sessionStorage.setItem('invoices', JSON.stringify(pendingInvoices));
        sessionStorage.setItem('currentInvoiceData', JSON.stringify(representativeInvoice));
        window.history.replaceState(null, "", `${window.location.pathname}${paymentUrl}`);
        window.dispatchEvent(new CustomEvent("actulizar-url"));
        return;
      }

      // Lógica Wispro (primera vez + clientes existentes)
      const formattedDate = format(new Date(), "dd+MMM+yyyy");
      const montoParaQuery = parseFloat(totalBalance).toFixed(2).replace('.', ',');

      const storageKey = isFirstTime ? 'allFirstTimeInvoices' : 'invoices';
      sessionStorage.setItem(storageKey, JSON.stringify(pendingInvoices));
      sessionStorage.setItem('currentInvoiceData', JSON.stringify(representativeInvoice));

      const params = new URLSearchParams({
        cliente: representativeInvoice.user?.name || representativeInvoice.client_name,
        monto: montoParaQuery,
        date: formattedDate,
        ac: representativeInvoice.invoice_id || representativeInvoice.invoice_number || '',
        invoice_id: representativeInvoice.id || representativeInvoice.invoice_id || '',
        documento: `${representativeInvoice.user?.billing_id_type || 'V'}${representativeInvoice.user?.billing_id || representativeInvoice.client_national_identification_number || ''}`,
        suscriptor: representativeInvoice.user?.sub_id || representativeInvoice.user_id || representativeInvoice.contract_id || '',
      });

      if (isFirstTime) params.set('firstime', 'true');
      if (tag) params.set('tag', tag);

      // console.log('🔗 URL Wispro generada:', `?${params.toString()}`);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      window.dispatchEvent(new CustomEvent("actulizar-url"));
    } catch (err) {
      console.error('Error al redirigir al pago:', err);
      throw err;
    }
  };

  return redirect;
}
