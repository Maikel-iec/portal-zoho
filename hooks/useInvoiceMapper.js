export default function useInvoiceMapper() {
  // Utilidades
  const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Map responses from Wispro "first billing" endpoint (sin cambios)
  const mapWisproResponseToInvoices = (apiData) => {
    if (!apiData || !apiData.billing_data) return [];

    const invoice = {
      id: apiData.billing_data.invoice_id,
      invoice_number: apiData.billing_data.invoice_id,
      client_name: apiData.user?.name || "",
      client_national_identification_number: `${apiData.user?.billing_id_type || ""}${apiData.user?.billing_id || ""}`,
      client_email: apiData.user?.email || "",
      balance: Number(apiData.amount_total || apiData.amount_to_pay || 0),
      total: Number(apiData.amount_total || 0),
      date: normalizeDate(apiData.billing_data.date),
      line_items: apiData.billing_data.line_items?.map((item, idx) => ({
        line_item_id: `item_${idx}`,
        name: item.name,
        rate: Number(item.base || item.rate || 0),
        line_item_taxes: [{ tax_amount: Number(item.iva || 0) }],
      })) || [],
    };

    return [invoice];
  };

  // Map responses from AC/Odoo endpoint - NUEVO FORMATO
  const mapAcResponseToUserAndInvoices = (apiData) => {
    if (!apiData) return { user: null, invoices: [], totalBalance: 0 };

    // ✅ NUEVO FORMATO: { exists, message, userData, invoices: [...] }
    if (apiData.userData && Array.isArray(apiData.invoices)) {
      const apiUser = apiData.userData;
      
      const mappedUserData = {
        contact_id: apiUser.contact_id || null,
        contact_name: apiUser.contact_name || apiUser.name || "",
        sub_id: apiUser.sub_id || null,
        status: apiUser.status || "active",
        billing_id: apiUser.billing_id || "",
        billing_id_type: apiUser.billing_id_type || "",
        email: apiUser.email || "",
      };

      const invoices = apiData.invoices.map((inv) => ({
        id: inv.id,
        invoice_id: inv.invoice_id || inv.billing_data?.invoice_id || "",
        invoice_number: inv.invoice_id || inv.billing_data?.invoice_id || "",
        status: inv.billing_data?.state || inv.state || "",
        balance: Number(inv.amount_residual || 0),
        total: Number(inv.amount_total || 0),
        amount_untaxed: Number(inv.amount_untaxed || 0),
        amount_tax: Number(inv.amount_tax || 0),
        amount_total: Number(inv.amount_total || 0),
        amount_paid: Number(inv.amount_paid || 0),
        amount_residual: Number(inv.amount_residual || 0), // ✅ Este es el campo clave ahora
        date: normalizeDate(inv.billing_data?.date || inv.created_at),
        due_date: normalizeDate(inv.billing_data?.due_date || inv.due_date),
        payment_made: Number(inv.amount_paid || 0),
        line_items: inv.billing_data?.line_items?.map((item, idx) => ({
          line_item_id: `item_${idx}`,
          name: item.name,
          rate: Number(item.base || item.rate || 0),
          base: Number(item.base || 0),
          iva: Number(item.iva || 0),
          quantity: Number(item.quantity || 1),
          total: Number(item.total || (item.base * (item.quantity || 1))),
          line_item_taxes: [{ tax_amount: Number(item.iva || 0) }],
        })) || [],
        client_name: mappedUserData.contact_name,
        client_national_identification_number: `${mappedUserData.billing_id_type || ""}${mappedUserData.billing_id || ""}`,
        tag: inv.tag || null,
        subscription_order_id: inv.billing_data?.subscription_order_id || null,
      }));

      const totalBalance = invoices.reduce((sum, inv) => sum + inv.amount_residual, 0);

      return { 
        user: mappedUserData, 
        invoices, 
        totalBalance 
      };
    }

    // Legacy format (mantenido para compatibilidad)
    const mappedUserData = {
      contact_id: apiData.user?.id || apiData.contact_id || null,
      contact_name: apiData.user?.name || apiData.contact_name || "",
      sub_id: apiData.user?.id || apiData.sub_id || null,
      status: apiData.user?.status || "active",
      billing_id: apiData.user?.billing_id || apiData.billing_id || "",
      billing_id_type: apiData.user?.billing_id_type || apiData.billing_id_type || "",
      email: apiData.user?.email || apiData.email || "",
    };

    const invoices = apiData.billing_data ? [{
      invoice_id: apiData.billing_data.invoice_id,
      invoice_number: apiData.billing_data.invoice_id || apiData.invoice_number || "", // ✅ Fix
      status: apiData.billing_data.state,
      balance: Number(apiData.amount_residual || 0),
      total: Number(apiData.amount_total || 0),
      amount_residual: Number(apiData.amount_residual || 0),
      amount_untaxed: Number(apiData.amount_untaxed || 0),
      amount_tax: Number(apiData.amount_tax || 0),
      amount_total: Number(apiData.amount_total || 0),
      amount_paid: Number(apiData.amount_paid || 0),
      date: normalizeDate(apiData.billing_data.date),
      due_date: normalizeDate(apiData.billing_data.due_date),
      payment_made: Number(apiData.amount_paid || 0),
      line_items: apiData.billing_data.line_items?.map((item, idx) => ({
        line_item_id: `item_${idx}`,
        name: item.name,
        rate: Number(item.base || item.rate || 0),
        base: Number(item.base || item.rate || 0),
        iva: Number(item.iva || 0),
        quantity: Number(item.quantity || 1),
        total: Number(item.total || ((item.base || item.rate || 0) * (item.quantity || 1) + (item.iva || 0))),
        line_item_taxes: [{ tax_amount: Number(item.iva || 0) }],
      })) || [],
      client_name: mappedUserData.contact_name,
      client_national_identification_number: `${mappedUserData.billing_id_type || ""}${mappedUserData.billing_id || ""}`,
      subscription_order_id: apiData.billing_data.subscription_order_id || null,
    }] : [];

    const totalBalance = invoices.reduce((sum, inv) => sum + inv.amount_residual, 0);

    return { user: mappedUserData, invoices, totalBalance };
  };

  return { 
    mapWisproResponseToInvoices, 
    mapAcResponseToUserAndInvoices 
  };
}
