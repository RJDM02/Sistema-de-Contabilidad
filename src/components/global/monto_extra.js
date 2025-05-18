import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Card, Spinner, Alert } from 'react-bootstrap';

const MontosExtra = () => {
  const [montosExtra, setMontosExtra] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth");
        
        // Realizar ambas peticiones en paralelo
        const [montosResponse, clientesResponse] = await Promise.all([
          axios.get("https://sistemacontable-wico.onrender.com/api/listar_monto_extra/", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get("https://sistemacontable-wico.onrender.com/api/list_client/", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setMontosExtra(montosResponse.data);
        setClientes(clientesResponse.data);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar los datos. Por favor intente nuevamente.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para obtener el nombre del cliente por ID
  const getNombreCliente = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Cliente no encontrado';
  };

  // Función para formatear números con separadores de miles
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Cargando montos extra...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="my-4">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
      </Alert>
    );
  }

  return (
    <div className="container-fluid py-4">
      <Card className="shadow">
        <Card.Header className="bg-dark text-white">
          <h5 className="mb-0">Listado de Montos Extra</h5>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Monto</th>
                  <th>Cliente</th>
                  <th>Fecha de Registro</th>
                </tr>
              </thead>
              <tbody>
                {montosExtra.length > 0 ? (
                  montosExtra.map((monto) => (
                    <tr key={monto.id}>
                      <td>{monto.id}</td>
                      <td>${formatNumber(monto.monto)}</td>
                      <td>{getNombreCliente(monto.cliente)}</td>
                      <td>{new Date(monto.fecha_registro).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">No hay montos extra registrados</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          <div className="mt-3">
            <h5 className="text-primary">
              Total Montos Extra: ${formatNumber(
                montosExtra.reduce((sum, monto) => sum + (monto.monto || 0), 0)
              )}
            </h5>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MontosExtra;