import React, { useRef, useState } from "react";

export default function FIleInput({ onChange, erros = "" }) {
  const [file, setFile] = useState(null);
  const [inputFileStatus, setInputFileStatus] = useState("empty");
  const dropRef = useRef(null);
  const getPerfiles = (e) => {
    // primero leemos el formato del archivo
    const pfile = e.target.files[0];

    // verificamos si son de un formato aceptable
    // (Formato jpg, png o pdf

    if (
      pfile.type === "image/jpeg" ||
      pfile.type === "image/png" ||
      pfile.type === "application/pdf"
    ) {
      setFile(pfile);
      setInputFileStatus("acepted");
      onChange(pfile);
      return;
    }

    setInputFileStatus("not-acepted");
    setFile(null);
    return;
  };

  return (
    <div
      className={`sl-drop-zone`}
      ref={dropRef}
    >
      <button
        onClick={() => {
          document.getElementById("sl-fl-input").click();
        }}
        type="button"
        className="!border-none !bg-sl-pink-500 !text-white hover:bg-sl-pink-600"
      >
        Adjuntar Capture
      </button>

      {inputFileStatus === "not-acepted" && (
        <div>
          <p className="text-red-500 text-sm mt-1">Formato no soportado. Solo se permiten archivos JPG, PNG o PDF.</p>
        </div>
      )}
      {inputFileStatus === "acepted" &&
        file &&
        (file.type === "image/jpeg" || file.type === "image/png" ? (
          <>
            <p>Es una Imagen</p>
            <img src={URL.createObjectURL(file)} alt="Ref-previe" />
          </>
        ) : (
          <>
            <p>Es un pdf</p>
            <iframe src={URL.createObjectURL(file)} />
          </>
        ))}
      {inputFileStatus === "empty" && (
        <p>Seleccione un Capture o PDF.</p>
      )}

      <input id="sl-fl-input" type="file" hidden onChange={getPerfiles} />
      {erros && <p className="text-red-500">{erros}</p>}
    </div>
  );
}
