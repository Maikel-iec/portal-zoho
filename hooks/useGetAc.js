import axios from 'axios';
import { TOKEN } from '../util/proyect-config';
import { API_ENDPOINTS } from '../util/api-endpoints';
import useInvoiceMapper from './useInvoiceMapper';

/**
 * Fetch AC details and normalize response. Accepts both formats:
 * - { isSuccess: true, data: {...} }
 * - direct object {...}
 */
export async function fetchAcDetails(ac, { saveToSession = true } = {}) {
  if (!ac) throw new Error('AC is required');

  const tokenKey = Object.keys(TOKEN)[0];
  const tokenValue = TOKEN[tokenKey];

  const response = await axios.post(API_ENDPOINTS.WP.GET_AC(ac), {}, {
    headers: { [tokenKey]: tokenValue },
  });

  const apiData = response.data && response.data.isSuccess ? response.data.data : response.data;

  const { mapAcResponseToUserAndInvoices } = useInvoiceMapper();
  const { user, invoices } = mapAcResponseToUserAndInvoices(apiData);

  // Asegurar que el tag se guarde en las facturas mapeadas
  if (invoices.length > 0) {
    invoices.forEach((inv) => {
      if (!inv.tag) {
        // Intentar obtener el tag de la respuesta raíz (formato legacy/single)
        const rootTag = apiData.tag || (apiData.billing_data && apiData.billing_data.tag);
        if (rootTag) {
          inv.tag = rootTag;
        } else if (apiData.invoices && Array.isArray(apiData.invoices)) {
          // Intentar buscar en la lista de facturas original (formato nuevo)
          const rawInv = apiData.invoices.find((r) => {
            const rId = String(r.id || '');
            const rInvId = String(r.invoice_id || '');
            const rBillInvId = String(r.billing_data?.invoice_id || '');
            
            const iId = String(inv.id || '');
            const iInvId = String(inv.invoice_id || '');
            const iInvNum = String(inv.invoice_number || '');

            return (rId && rId === iId) ||
                   (rInvId && (rInvId === iInvId || rInvId === iInvNum)) ||
                   (rBillInvId && (rBillInvId === iInvId || rBillInvId === iInvNum));
          });
          if (rawInv) {
            const tag = rawInv.tag || (rawInv.billing_data && rawInv.billing_data.tag);
            if (tag) inv.tag = tag;
          }
        }
      }
    });
  }

  // Actualizar el tag en la URL si es diferente al de la factura
  if (invoices.length > 0 && invoices[0].tag) {
    const fetchedTag = invoices[0].tag;
    const currentUrl = new URL(window.location.href);
    const currentTag = currentUrl.searchParams.get("tag");
    if (fetchedTag && currentTag !== fetchedTag) {
      currentUrl.searchParams.set("tag", fetchedTag);
      window.history.replaceState(null, "", currentUrl.toString());
    }
  }

  if (saveToSession) {
    try {
      sessionStorage.setItem('invoices', JSON.stringify(invoices));
      sessionStorage.setItem('userData', JSON.stringify(user));
    } catch (err) {
      console.warn('Could not save AC data to sessionStorage:', err);
    }
  }

  return { user, invoices, raw: apiData };
}

export default function useGetAc() {
  return fetchAcDetails;
}
