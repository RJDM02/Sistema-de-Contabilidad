import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Card, Badge, Form } from 'react-bootstrap';

const ModificarPagosClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totals, setTotals] = useState({
    total: 0,
    clientes: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth");
        
        // Obtener clientes
        const clientesResponse = await axios.get(
          "https://sistemacontable-wico.onrender.com/api/list_client/", 
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        // Obtener historial de pagos
        const pagosResponse = await axios.get(
          "https://sistemacontable-wico.onrender.com/api/listar_historial_pago/", 
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        setClientes(clientesResponse.data);
        setPagos(pagosResponse.data);
        
        // Calcular totales
        const totalPagado = pagosResponse.data.reduce((sum, pago) => sum + pago.monto, 0);
        setTotals({
          total: totalPagado,
          clientes: clientesResponse.data.length
        });
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Agrupar pagos por cliente
  const pagosPorCliente = pagos.reduce((acc, pago) => {
    if (!acc[pago.cliente_id]) {
      acc[pago.cliente_id] = [];
    }
    acc[pago.cliente_id].push(pago);
    return acc;
  }, {});

  // Función para alternar la expansión de filas
  const toggleRow = (clienteId) => {
    const newExpandedRows = [...expandedRows];
    const index = newExpandedRows.indexOf(clienteId);
    
    if (index === -1) {
      newExpandedRows.push(clienteId);
    } else {
      newExpandedRows.splice(index, 1);
    }
    
    setExpandedRows(newExpandedRows);
  };

  if (loading) return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="container-fluid mt-3">
      <div className="alert alert-danger" role="alert">
        Error al cargar el historial: {error}
      </div>
    </div>
  );

  return (
    <div className="container-fluid mt-3">
      <div className="card shadow">
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h3 className="m-0">Historial de Pagos</h3>
          <div>
            <span className="badge bg-info me-2">Clientes: {totals.clientes}</span>
            <span className="badge bg-success">Total Pagado: ${totals.total.toFixed(2)}</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <Table bordered hover className="mb-0">
              <thead className="table-dark sticky-top">
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th className="text-end">Total Pagado</th>
                  <th className="text-end">Último Pago</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente, index) => {
                  const clientePagos = pagosPorCliente[cliente.id] || [];
                  const montoTotal = clientePagos.reduce((sum, pago) => sum + pago.monto, 0);
                  const ultimoPago = clientePagos.length > 0 
                    ? new Date(Math.max(...clientePagos.map(p => new Date(p.fecha))))
                    : null;
                  const tienePagos = clientePagos.length > 0;
                  const estado = tienePagos ? 'Con pagos' : 'Sin pagos';
                  
                  return (
                    <React.Fragment key={cliente.id}>
                      <tr 
                        className={`fw-bold ${tienePagos ? 'table-primary' : 'table-secondary'}`} 
                        onClick={() => toggleRow(cliente.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="text-center">{index + 1}</td>
                        <td>{cliente.nombre}</td>
                        <td className="text-end">${montoTotal.toFixed(2)}</td>
                        <td className="text-end">
                          {ultimoPago 
                            ? ultimoPago.toLocaleDateString() 
                            : 'N/A'}
                        </td>
                        <td className="text-center">
                          <span className={`badge ${tienePagos ? 'bg-success' : 'bg-secondary'}`}>
                            {estado}
                          </span>
                        </td>
                      </tr>
                      
                      {expandedRows.includes(cliente.id) && clientePagos.map((pago, pagoIndex) => (
                        <tr key={pago.id} className="table-info">
                          <td className="text-end">{index + 1}.{pagoIndex + 1}</td>
                          <td colSpan="1">
                            <small className="text-muted">Pago registrado</small>
                          </td>
                          <td className="text-end">${pago.monto.toFixed(2)}</td>
                          <td className="text-end">{new Date(pago.fecha).toLocaleDateString()}</td>
                          <td className="text-center">
                            <span className="badge bg-info">Registrado</span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
        <div className="card-footer bg-light">
          <div className="row align-items-center">
            <div className="col-md-4">
              <span className="badge bg-primary me-2">Cliente</span>
              <span className="badge bg-info">Detalle pago</span>
            </div>
            <div className="col-md-8 text-md-end">
              <strong className="text-success">Total Pagado: ${totals.total.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModificarPagosClientes;