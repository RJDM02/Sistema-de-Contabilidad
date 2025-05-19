import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Card, Spinner, Alert, Button, Modal, Form } from 'react-bootstrap';

const MontosExtra = () => {
  const [montosExtra, setMontosExtra] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [montoToDelete, setMontoToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [montoToEdit, setMontoToEdit] = useState(null);
  const [newMontoValue, setNewMontoValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

  const handleEditClick = (monto) => {
    setMontoToEdit(monto);
    setNewMontoValue(monto.monto);
    setShowEditModal(true);
  };

  const handleUpdateMonto = async () => {
    try {
      setEditLoading(true);
      const token = localStorage.getItem("auth");
      
      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/actualizar_monto_extra/${montoToEdit.id}/`,
        { monto: newMontoValue },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Actualizar el estado local
      setMontosExtra(montosExtra.map(monto => 
        monto.id === montoToEdit.id ? { ...monto, monto: newMontoValue } : monto
      ));
      
      setShowEditModal(false);
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert('Error al actualizar el monto extra');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseConfirm = () => {
    setShowConfirm(false);
    setMontoToDelete(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setMontoToEdit(null);
    setNewMontoValue('');
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
      {/* Modal de confirmación de eliminación */}
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

      {/* Modal para editar monto */}
      <Modal show={showEditModal} onHide={handleCloseEditModal}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Monto Extra</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Nuevo valor del monto</Form.Label>
            <Form.Control
              type="number"
              value={newMontoValue}
              onChange={(e) => setNewMontoValue(Number(e.target.value))}
              placeholder="Ingrese el nuevo monto"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateMonto}
            disabled={editLoading}
          >
            {editLoading ? (
              <>
                <Spinner as="span" size="sm" animation="border" role="status" />
                {' Guardando...'}
              </>
            ) : 'Guardar Cambios'}
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
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleEditClick(monto)}
                            title="Editar monto extra"
                          >
                            <i className="bi bi-pencil"></i> Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteClick(monto.id)}
                            title="Eliminar monto extra"
                          >
                            <i className="bi bi-trash"></i> Eliminar
                          </Button>
                        </div>
                      </td>
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