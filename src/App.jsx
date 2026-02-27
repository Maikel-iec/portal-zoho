import React, { useEffect, useState } from "react";
import axios from "axios";
import PaymentForm from "./template/PaymentForm";
// import "./main.css";
import { Router } from "react-router-dom";

export default function App() {
  const [name, setName] = useState("");

  const sendData = async () => {
    // console.log(name);
    const res = await axios.get("http://localhost:5002");
    // console.log("https://sl-payment-services-448255069594.us-east1.run.app");
    // const res = await axios.get(
    //   "https://sl-payment-services-448255069594.us-east1.run.app"
    // );
    // console.log("datos-enviados");
    // console.log(res.data);
  };

  useEffect(() => {}, []);

  return <PaymentForm />;
}
