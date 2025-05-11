import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ModificarDocumentacion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    nombre_archivo: '',
    es_bill: false,
    es_nota: false
  });

  // Obtener los datos del documento al cargar el componente
  useEffect(() => {
    const fetchDocumento = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('auth');
        
        const response = await axios.get(
          `https://sistemacontable-wico.onrender.com/api/detalle_documento/${id}/`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        // Mapear los datos de la API al estado del formulario
        setFormData({
          nombre_cliente: response.data.cliente.nombre_cliente,
          nombre_archivo: response.data.nombre_archivo,
          es_bill: response.data.bill,
          es_nota: response.data.notas
        });
        
      } catch (error) {
        console.error('Error al obtener el documento:', error);
        setError('Error al cargar los datos del documento');
        toast.error('Error al cargar los datos del documento');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocumento();
  }, [id]);

  const handleChangeCheckbox = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth');
      
      // Preparar los datos para enviar
      const datosActualizacion = {
        bill: formData.es_bill,
        notas: formData.es_nota
      };
      
      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/actualizar_documento/${id}/`,
        datosActualizacion,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success('Documento actualizado correctamente');
      // Redirigir después de 2 segundos para que el usuario vea el mensaje
      setTimeout(() => navigate('/gestDocumentacion/listarDocumentacion'), 2000);
      
    } catch (error) {
      console.error('Error al actualizar el documento:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar el documento';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p>Cargando información del documento...</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Modificar Documentación</h2>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            {/* Información del cliente (solo lectura) */}
            <div className="mb-3">
              <label htmlFor="nombre_cliente" className="form-label">
                Cliente
              </label>
              <input
                type="text"
                id="nombre_cliente"
                className="form-control"
                value={formData.nombre_cliente}
                readOnly
              />
            </div>
            
            {/* Nombre del archivo (solo lectura) */}
            <div className="mb-3">
              <label htmlFor="nombre_archivo" className="form-label">
                Archivo
              </label>
              <input
                type="text"
                id="nombre_archivo"
                className="form-control"
                value={formData.nombre_archivo}
                readOnly
              />
            </div>
            
            {/* Checkbox para Bill */}
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                id="es_bill"
                name="es_bill"
                className="form-check-input"
                checked={formData.es_bill}
                onChange={handleChangeCheckbox}
              />
              <label htmlFor="es_bill" className="form-check-label">
                ¿Es un documento Bill?
              </label>
            </div>
            
            {/* Checkbox para Notas */}
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                id="es_nota"
                name="es_nota"
                className="form-check-input"
                checked={formData.es_nota}
                onChange={handleChangeCheckbox}
              />
              <label htmlFor="es_nota" className="form-check-label">
                ¿Es un documento de Notas?
              </label>
            </div>
            
            {/* Botones */}
            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/gestDocumentacion/listarDocumentacion')}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Guardando...
                  </>
                ) : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModificarDocumentacion;