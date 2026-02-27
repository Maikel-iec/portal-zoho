import React from "react";
import CredidCard from "../icons/CredidCard";
import Input from "../componet/Input";
export default function CreditCardPayment({ hData, tasaActual }) {
  return (
    <form action="" className="w-full mt-4">
      <h3>Tarjeta de Crédito</h3>
      <div>
        <CredidCard />
      </div>
      <div className="input-box mt-4">
        <span className="text-sm font-semibold !mb-[8px]">Cédula*</span>
        <div className="flex gap-2 w-full">
          <select id="tipoDocumento" className="p-2" name="tipoDocumento">
            <option value="">Seleccione</option>
            <option value="V">V</option>
            <option value="E">E</option>
          </select>
          <input
            type="number"
            className="w-full"
            id="Cedula"
            name="Cédula"
            onWheel={(e) => e.target.blur()}
          />
        </div>
      </div>
      <div className="input-box mt-4 w-full">
        <span className="text-sm font-semibold !mb-[8px]">Número de Tarjeta*</span>
        <div className="flex w-full relative">
          <input
            type="number"
            className="w-full"
            onWheel={(e) => e.target.blur()}
            placeholder="1234 5678 9012 3456"
          />
        </div>
        <div className="flex gap-2 w-full">
          <Input
            className="text-sm font-semibold !mb-[8px]"
            labelText={"Fecha de Vencimiento*"}
            name={"expDate"}
            isNumber={false}
            placeholder="MM/AA"
            description={null}
          />
          <Input
            labelText={"CVV*"}
            name={"cvv"}
            isNumber={true}
            placeholder="000"
            description={null}
          />
        </div>
      </div>
    </form>
  );
}
