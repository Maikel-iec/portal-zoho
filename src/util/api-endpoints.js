import { apiurl, mediaApiUrl, apiWP, wispro } from './proyect-config';

export const API_ENDPOINTS = {
  MOBILE_PAYMENT: {
    C2P_BDV: `${apiurl}/bdv/c2p`,
    C2P_MB: `${apiurl}/mb/c2p`,
    P2P_BDV: `${apiurl}/bdv/get-movement-v2`,
    P2P_CONFIRMATION: `${apiurl}/confirmation-services/p2p`,
  },
  PAYPAL: {
    REPORT_PAYMENT: `${mediaApiUrl}/boucher/paypal`,
  },
  R4: {
    CHECK_OPERATION: `${apiurl}/mb/consulta-operaciones`,
    DEBIT_IMMEDIATE: `${apiurl}/mb/debito-inmediato`,
    GENERATE_OTP: `${apiurl}/mb/generar-otp`,
  },
  WISPRO: {
    GET_BY_NATIONAL_ID: (id) => `${wispro}/${id}`,
    GET_FIRST_BILLING_DATA: (id) => `${wispro}/get-first-billing-data/${id}`,
  },
  WP: {
    GET_AC: (id) => `${apiWP}/get-ac/${id}`,
    ODOO_CONTACT: `${apiWP}/odoo/contact`,
    ZOHO_CONTACT: `${apiWP}/zoho/contact`,
  },
  ZELLE: {
    REPORT_PAYMENT: `${mediaApiUrl}/boucher/zelle`,
  },
};
