import React from 'react';
import Logo7Link from '../icons/Logo7Link';
import Input from './Input';

export default function AffiliationResult({
  clientData,
  pendingInvoices,
  totalBalance,
  onProcessPayment,
  onGoBack,
  isLoading,
  credit,
  debit,
  children,

  // --- INICIO: Props para la funcionalidad de Abono ---
  isAddingCredit,
  setIsAddingCredit,
  creditAmount,
  setCreditAmount,
  creditError,
  setCreditError,
  handleConfirmCredit,
}) {

  const handleCancelCredit = () => {
    setIsAddingCredit(false);
    setCreditAmount('');
    setCreditError('');
  };

  return (
    <div
      className="!w-full !max-w-md !mx-auto !h-full !flex !flex-col !items-center !justify-center !p-8 !min-h-[300px] !rounded-box !bg-sl-blue-950"
    >
      <div className="!card-body !items-center !text-white">
        <div className="!self-center !w-56 !mx-auto !mb-4">
          <Logo7Link />
        </div>
        <h2 className="!card-title !text-2xl !justify-center !mb-2 !text-white">Centro de Pagos</h2>

        <div className="!w-full !text-left !space-y-1 !mb-4">
          <p><span className="!text-sl-pink-600">{clientData.name}</span></p>
          <p><span className="!font-bold">ID del Cliente:</span> {clientData.id || 'N/A'}</p>
          <p><span className="!font-bold">ID Fiscal:</span> {clientData.fiscalId || 'N/A'}</p>
          <p><span className="!font-bold">Email:</span> {clientData.email || 'N/A'}</p>
        </div>

        <div className="!divider !divider-default !text-white !my-1"></div>

        {/* --- Lógica condicional: Muestra vista de deuda o vista "al día" --- */}
        {totalBalance > 0 ? (
          <>
            {/* Renderiza el contenido adicional, como el acordeón de detalles */}
            {children}

            {/* Muestra el desglose de crédito/débito si se proporcionan los datos */}
            {credit !== undefined && (
              <div className="!w-full !flex !justify-between !items-center !font-semibold !text-md !mt-4">
                <p>Deuda Acumulada:</p>
                <p className="!text-right">${(credit || 0).toFixed(2)}</p>
              </div>
            )}
            {debit > 0 && (
              <div className="!w-full !flex !justify-between !items-center !font-semibold !text-md !text-green-400">
                <p>Saldo a Favor (Abono):</p>
                <p className="!text-right">-${(debit || 0).toFixed(2)}</p>
              </div>
            )}

            {/* Si no hay 'children' (como en el caso de Wispro), mostramos la lista de facturas. */}
            {!children && pendingInvoices.map(invoice => (
              <div key={invoice.id || invoice.invoice_id} className="!w-full !space-y-2 !my-4 !border-b !border-sl-blue-800 !pb-2">
                <div className="!flex !justify-between !items-center">
                  <p className="!font-bold">Factura #{invoice.invoice_number}</p>
                  <p className="!font-bold !text-right">${parseFloat(invoice.balance || 0).toFixed(2)}</p>
                </div>
                {invoice.items?.map((item, index) => (
                  <div key={item.id || index} className="!grid !grid-cols-3 !gap-2 !text-sm !text-center">
                    <p className="!text-left !col-span-2">{item.description || item.name || 'N/A'}</p>
                    <p className="!text-right">${parseFloat(item.gross_amount || item.rate || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ))}

            <div className="!divider !divider-default !text-white"></div>

            <div className="!w-full !flex !justify-between !items-center !font-bold !text-lg">
              <p>Deuda Total</p>
              <p className="!text-right">${(totalBalance || 0).toFixed(2)}</p>
            </div>

            <p className="!text-xs !text-gray-400 !text-center !w-full !mt-1">
              Tenga en cuenta que este monto no incluye IGTF. En caso de pagar por PayPal o Zelle se añadirá 3% de IGTF y en caso de Paypall tenga en cuenta que tiene una comision adicional.
            </p>

            <div className="!card-actions !w-full !mt-4 !justify-center">
              <button onClick={onProcessPayment} className="!btn !w-full !bg-sl-pink-500 !text-white" disabled={isLoading}>
                {isLoading ? <span className="!loading !loading-spinner"></span> : "Procesar Pago"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="!text-sl-pink-50 !text-xl !font-bold !mt-8 !mb-4">Usted está al día con sus Pagos</h3>
            {totalBalance < 0 && (
              <p className="!text-lg !text-green-400 mb-4">Tiene un saldo a favor de <span className="!font-bold">${Math.abs(totalBalance).toFixed(2)}</span></p>
            )}

            {/* --- INICIO: Lógica para Abono/Saldo a Favor --- */}
            {/* {isAddingCredit ? (
              <div className="w-full mt-4 p-4 bg-sl-blue-900 border border-sl-blue-700 rounded-lg text-left">
                <h4 className="text-lg font-bold text-white mb-2">Abonar a cuenta</h4>
                <p className="text-sm text-neutral-400 mb-4">Ingrese el monto que desea abonar en Divisas.</p>
                <div className="flex flex-col sm:flex-row gap-2 items-start">
                  <div className="w-full">
                    <Input
                      name="creditAmount"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="0.00 $"
                      pattern="^\d+(\.\d{1,2})?"
                      type="number"
                      className="!input !input-bordered !w-full !bg-sl-blue-800 !placeholder-sl-blue-500 !text-white !border-sl-blue-600"
                    />
                    {creditError && <p className="text-red-500 text-xs mt-1">{creditError}</p>}
                  </div>
                  <button onClick={handleConfirmCredit} className="btn btn-primary sm:w-auto shrink-0">
                    Confirmar
                  </button>
                </div>
                <button onClick={handleCancelCredit} className="btn btn-ghost text-sl-pink-500 mt-2 p-0 h-auto min-h-0 hover:bg-transparent">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="!card-actions !w-full !mt-4 !justify-center">
                <button onClick={() => setIsAddingCredit(true)} className="!btn !w-full !bg-sl-pink-500 !text-white">Abonar Saldo</button>
              </div>
            )} */}
          </>
        )}

        <div className="!divider !divider-default !w-full !text-white">O</div>
        <button type="button" onClick={onGoBack} className="!btn !btn-ghost !w-full !text-center !text-white !bg-transparent !border-none">
          Regresar
        </button>
      </div>
    </div>
  );
}