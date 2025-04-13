import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ListarPagosCobros  = () =>{
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(null);

    const handleinsertarPagoCobros = () => {
        navigate("/gestCobro/insertarPagoCobros");
      };

    return (
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Lista Cobros de Trabajadores</h2>
            <button
              onClick={handleinsertarPagoCobros}
              className="btn btn-primary"
            >
              Insertar Pago 
            </button>
          </div>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Trabajador</th>
                    <th>Fecha del pago</th>
                    <th>total de unidades</th>
                    <th>total a cobrar</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                </tbody>
              </table>
            </div>
        </div>
    );
}

export default ListarPagosCobros;