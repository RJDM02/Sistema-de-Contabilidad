import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const ListarAgencias = () => {
  const [agencias, setAgencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [agenciaToDelete, setAgenciaToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgencias = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        const response = await axios.get("https://sistemacontable-wico.onrender.com/api/listar_agencia/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAgencias(response.data);
        toast.success("Agencias cargadas correctamente");
      } catch (error) {
        console.error("Error al obtener las agencias", error);
        setError("Error al cargar la lista de agencias");
        toast.error("Error al cargar las agencias");
      } finally {
        setLoading(false);
      }
    };

    fetchAgencias();
  }, []);

  const handleInsertarAgencia = () => {
    navigate("/gestAgencia/insertarAgencia");
  };

  const handleShowModal = (agencia) => {
    setAgenciaToDelete(agencia);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setAgenciaToDelete(null);
  };

  const handleDeleteAgencia = async () => {
    if (!agenciaToDelete) return;
    
    try {
      setDeleting(agenciaToDelete.id);
      const token = localStorage.getItem("auth");

      await axios.delete(
        `https://sistemacontable-wico.onrender.com/api/eliminar_agencia/${agenciaToDelete.id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Actualizar el estado local eliminando la agencia
      setAgencias(agencias.filter(a => a.id !== agenciaToDelete.id));
      
      toast.success("Agencia eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar la agencia", error);
      const errorMessage = error.response?.data?.detail || "Error al eliminar la agencia";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleting(null);
      handleCloseModal();
    }
  };

  // Ordenar las agencias alfabéticamente por nombre
  const agenciasOrdenadas = [...agencias].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="container mt-4">
      <ToastContainer 
        position="top-left"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={1}
      />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Lista de Agencias</h2>
        <button
          onClick={handleInsertarAgencia}
          className="btn btn-primary"
        >
          Insertar Agencia
        </button>
      </div>

      {loading && <div className="text-center">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agenciasOrdenadas.map((agencia) => (
                <tr key={agencia.id}>
                  <td>{agencia.id}</td>
                  <td>{agencia.nombre}</td>
                  <td>
                    <button
                      onClick={() => handleShowModal(agencia)}
                      className="btn btn-sm btn-danger"
                      disabled={deleting === agencia.id}
                    >
                      {deleting === agencia.id ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro que deseas eliminar la agencia: <strong>{agenciaToDelete?.nombre}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteAgencia}>
            {deleting ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : 'Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ListarAgencias;