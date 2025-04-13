import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListarDocumentacion = () => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocumentos = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("auth");
        const response = await axios.get("http://localhost:8000/api/listar_documentacion/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // Procesar datos para agrupar por cliente
        const processedData = processDocumentData(response.data);
        setDocumentos(processedData);
      } catch (error) {
        console.error("Error al obtener los documentos", error);
        setError("Error al cargar la lista de documentos");
        toast.error("Error al cargar la lista de documentos");
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentos();
  }, []);

  // Procesar datos para agrupar por cliente
  const processDocumentData = (data) => {
    // Ordenar por nombre de cliente
    const sortedData = [...data].sort((a, b) => 
      a.cliente.nombre_cliente.localeCompare(b.cliente.nombre_cliente)
    );

    // Agregar propiedad rowSpan para celdas agrupadas
    let currentClient = null;
    let clientCount = 0;

    return sortedData.map((doc) => {
      const isNewClient = doc.cliente.id_cliente !== currentClient;
      if (isNewClient) {
        currentClient = doc.cliente.id_cliente;
        clientCount = sortedData.filter(d => d.cliente.id_cliente === currentClient).length;
      }

      return {
        ...doc,
        rowSpan: isNewClient ? clientCount : 0,
      };
    });
  };

  const handleInsertarDocumento = () => {
    navigate("/gestDocumentacion/insertarDocumentacion");
  };

  const handleShowDeleteModal = (id) => {
    setDocumentoToDelete(id);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDocumentoToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!documentoToDelete) return;
    
    try {
      setUpdating(documentoToDelete);
      const token = localStorage.getItem("auth");

      await axios.delete(
        `http://localhost:8000/api/eliminar_documentacion/${documentoToDelete}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Actualizar el estado local
      setDocumentos(documentos.filter(doc => doc.id !== documentoToDelete));
      toast.success('Documento eliminado correctamente');
    } catch (error) {
      console.error("Error al eliminar el documento", error);
      toast.error(error.response?.data?.detail || "Error al eliminar el documento");
    } finally {
      setUpdating(null);
      setShowDeleteModal(false);
      setDocumentoToDelete(null);
    }
  };

  const getTipoDocumentoText = (tipoValue) => {
    switch(tipoValue) {
      case 1:
        return "Bill";
      case 2:
        return "Contrato";
      case 3:
        return "Identificación";
      default:
        return `Tipo ${tipoValue}`; 
    }
  };

  const formatearFecha = (fechaBackend) => {
    // Asumiendo que fechaBackend viene como "YYYY-MM-DD"
    const partes = fechaBackend.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`; // Formato DD/MM/YYYY
    }
    return fechaBackend; // Si el formato no es el esperado, devolver original
  };

  // Función para renderizar celdas agrupadas
  const renderGroupedCell = (value, row, additionalContent = null) => {
    if (row.rowSpan > 0) {
      return (
        <td rowSpan={row.rowSpan}>
          {value}
          {additionalContent}
        </td>
      );
    }
    return null;
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Lista de Documentos</h2>
        <button
          onClick={handleInsertarDocumento}
          className="btn btn-primary"
        >
          Insertar Documento
        </button>
      </div>

      {loading && <div className="text-center">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Cliente</th>
                <th>Tipo Documento</th>
                <th>Nombre Documento</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((documento) => (
                <tr key={documento.id}>
                  {renderGroupedCell(documento.cliente.nombre_cliente, documento)}
                  
                  <td>{getTipoDocumentoText(documento.tipo)}</td>
                  <td>{documento.nombre_archivo}</td>
                  <td>{formatearFecha(documento.fecha_creacion)}</td>
                  
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        onClick={() => handleShowDeleteModal(documento.id)}
                        className="btn btn-sm btn-danger"
                        disabled={updating === documento.id}
                      >
                        {updating === documento.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Está seguro que desea eliminar este documento? Esta acción no se puede deshacer.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            {updating ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Eliminando...
              </>
            ) : 'Sí, Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Contenedor de notificaciones Toast */}
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default ListarDocumentacion;