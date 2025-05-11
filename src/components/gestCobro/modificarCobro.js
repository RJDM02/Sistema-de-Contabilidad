import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ModificarCobro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Estados del formulario
  const [cobroData, setCobroData] = useState({
    cliente: null,
    documento: null,
    registrosSeleccionados: [],
    mes: ''
  });

  // Todos los registros disponibles del documento
  const [registrosDisponibles, setRegistrosDisponibles] = useState([]);

  // Lista de meses para el select
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // Obtener token de autenticación
  const getToken = () => localStorage.getItem('auth');

  // Cargar datos del cobro a modificar
  useEffect(() => {
    const fetchCobro = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `https://sistemacontable-wico.onrender.com/api/listar_cobro_detalles/${id}/`,
          {
            headers: { Authorization: `Bearer ${getToken()}` }
          }
        );

        const cobro = response.data;
        
        // Mapear los IDs de los registros ya seleccionados
        const idsSeleccionados = cobro.contenido.map(registro => registro.id);
        
        setCobroData({
          cliente: cobro.cliente,
          documento: cobro.documento,
          registrosSeleccionados: idsSeleccionados,
          mes: cobro.mes || ''
        });

        // Cargar todos los registros disponibles del documento
        setRegistrosDisponibles(cobro.contenido || []);
        
      } catch (error) {
        toast.error('Error al cargar los datos del cobro');
        console.error(error);
        navigate('/gestCobro/listarCobros');
      } finally {
        setLoading(false);
      }
    };

    fetchCobro();
  }, [id, navigate]);

  // Manejar selección/deselección de registros
  const handleSelectRegistro = (registroId) => {
    setCobroData(prev => {
      const nuevosRegistros = prev.registrosSeleccionados.includes(registroId)
        ? prev.registrosSeleccionados.filter(id => id !== registroId)
        : [...prev.registrosSeleccionados, registroId];
      
      return { ...prev, registrosSeleccionados: nuevosRegistros };
    });
  };

  // Manejar cambio del mes
  const handleMesChange = (e) => {
    const { value } = e.target;
    setCobroData(prev => ({ ...prev, mes: value }));
  };

  // Seleccionar todos los registros
  const selectAllRegistros = () => {
    const todosLosIds = registrosDisponibles.map(r => r.id);
    
    if (cobroData.registrosSeleccionados.length === todosLosIds.length) {
      setCobroData(prev => ({ ...prev, registrosSeleccionados: [] }));
    } else {
      setCobroData(prev => ({ ...prev, registrosSeleccionados: todosLosIds }));
    }
  };

  // Enviar la modificación del cobro
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Validación - al menos un registro seleccionado
      if (cobroData.registrosSeleccionados.length === 0) {
        throw new Error('Debe seleccionar al menos un registro');
      }

      // Validación - mes seleccionado
      if (!cobroData.mes) {
        throw new Error('Debe seleccionar un mes');
      }

      // Filtrar solo los registros seleccionados con sus datos completos
      const registrosSeleccionadosCompletos = registrosDisponibles.filter(r => 
        cobroData.registrosSeleccionados.includes(r.id)
      );

      // Preparar datos para enviar al backend
      const datosParaEnviar = {
        contenido: registrosSeleccionadosCompletos,
        mes: cobroData.mes
      };

      // Enviar la modificación
      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/modificar_cobro/${id}/`,
        datosParaEnviar,
        {
          headers: { 
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('Cobro modificado correctamente');
      setTimeout(() => navigate('/gestCobro/listarCobros'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al modificar cobro');
      console.error("Error completo:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p>Cargando datos del cobro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ marginBottom: '100px' }}>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2>Modificar Cobro</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Información del cliente */}
            <div className="mb-3">
              <label className="form-label">Cliente</label>
              <input
                type="text"
                className="form-control"
                value={cobroData.cliente?.nombre || ''}
                readOnly
                disabled
              />
            </div>

            {/* Información del documento */}
            <div className="mb-3">
              <label className="form-label">Documento</label>
              <input
                type="text"
                className="form-control"
                value={cobroData.documento?.nombre_documento || ''}
                readOnly
                disabled
              />
            </div>

            {/* Selección de mes */}
            <div className="mb-3">
              <label className="form-label">Mes *</label>
              <select
                name="mes"
                className="form-select"
                value={cobroData.mes}
                onChange={handleMesChange}
                required
              >
                <option value="">Seleccione un mes</option>
                {meses.map(mes => (
                  <option key={mes} value={mes}>
                    {mes.charAt(0).toUpperCase() + mes.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selección de registros */}
            <div className="mb-4">
              <label className="form-label">Registros *</label>
              <div 
                className="border p-3 rounded" 
                style={{ 
                  maxHeight: '400px',
                  overflowY: 'auto',
                  marginBottom: '20px'
                }}
              >
                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="selectAll"
                    checked={cobroData.registrosSeleccionados.length === registrosDisponibles.length && registrosDisponibles.length > 0}
                    onChange={selectAllRegistros}
                  />
                  <label className="form-check-label" htmlFor="selectAll">
                    <strong>Seleccionar todos</strong>
                  </label>
                </div>
                
                {registrosDisponibles.map(registro => (
                  <div key={registro.id} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`registro-${registro.id}`}
                      checked={cobroData.registrosSeleccionados.includes(registro.id)}
                      onChange={() => handleSelectRegistro(registro.id)}
                    />
                    <label className="form-check-label" htmlFor={`registro-${registro.id}`}>
                      {registro.nombre_completo} - {registro.unidades} unidades
                    </label>
                  </div>
                ))}
              </div>
              <small className="text-muted">
                {cobroData.registrosSeleccionados.length} de {registrosDisponibles.length} registros seleccionados
              </small>
            </div>

            {/* Botones */}
            <div className="d-flex justify-content-between mt-4"
              style={{
                position: 'sticky',
                bottom: '0',
                backgroundColor: 'white',
                padding: '15px 0',
                borderTop: '1px solid #dee2e6',
                marginTop: '20px'
              }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/gestCobro/listarCobros')}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || cobroData.registrosSeleccionados.length === 0 || !cobroData.mes}
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

export default ModificarCobro;