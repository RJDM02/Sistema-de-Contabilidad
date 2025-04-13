import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ListarPagosClientes  = () =>{
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(null);

    return (
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Lista Pagos de los clientes</h2>
          </div>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Fecha del pago</th>
                    <th>total Pagar</th>
                    <th>total Pagado</th>
                    <th>Deuda</th>
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

export default ListarPagosClientes;