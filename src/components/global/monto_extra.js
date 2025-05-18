import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Card, Spinner, Alert, Button, Modal } from 'react-bootstrap';

const MontosExtra = () => {
  const [montosExtra, setMontosExtra] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [montoToDelete, setMontoToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth");
      
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

  const handleDeleteClick = (id) => {
    setMontoToDelete(id);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("auth");
      await axios.delete(`https://sistemacontable-wico.onrender.com/api/eliminar_monto_extra/${montoToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMontosExtra(montosExtra.filter(monto => monto.id !== montoToDelete));
      setShowConfirm(false);
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert('Error al eliminar el monto extra');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseConfirm = () => {
    setShowConfirm(false);
    setMontoToDelete(null);
  };

  const getNombreCliente = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Cliente no encontrado';
  };

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
      {/* Modal de confirmación */}
      <Modal show={showConfirm} onHide={handleCloseConfirm}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro de que deseas eliminar este monto extra? Esta acción no se puede deshacer.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseConfirm}>
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleConfirmDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner as="span" size="sm" animation="border" role="status" />
                {' Eliminando...'}
              </>
            ) : 'Sí, eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Card className="shadow">
        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Listado de Montos Extra</h5>
          <Button 
            variant="outline-light" 
            size="sm"
            onClick={fetchData}
          >
            <i className="bi bi-arrow-clockwise"></i> Actualizar
          </Button>
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
                  <th>Acciones</th>
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
                      <td className="text-center">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(monto.id)}
                          title="Eliminar monto extra"
                        >
                          <i className="bi bi-trash"></i> Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">No hay montos extra registrados</td>
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