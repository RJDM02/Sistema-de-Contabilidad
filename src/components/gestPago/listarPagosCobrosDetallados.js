import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListarPagosCobrosDetallados = () => {
  const { userId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mes = queryParams.get('mes');
  const navigate = useNavigate();
  
  // Estados principales
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usuario, setUsuario] = useState(null);
  
  // Estados para los modales
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null); // 'bonificar' o 'sancionar'
  const [currentCobroId, setCurrentCobroId] = useState(null);
  
  // Estado para el formulario del modal
  const [formData, setFormData] = useState({
    monto: '',
    nota: ''
  });

  // Función para obtener los detalles
  const fetchDetalles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth");
      
      // Obtener datos del usuario
      const userResponse = await axios.get(
        `https://sistemacontable-wico.onrender.com/api/usuario/${userId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsuario(userResponse.data);
      
      // Obtener todos los cobros
      const cobrosResponse = await axios.get(
        `https://sistemacontable-wico.onrender.com/api/listar_cobro/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Filtrar cobros por usuario y mes
      const cobrosFiltrados = cobrosResponse.data.filter(cobro => {
        const coincideUsuario = cobro.usuario_registra?.id === parseInt(userId);
        const coincideMes = mes ? cobro.mes?.toLowerCase() === mes.toLowerCase() : true;
        return coincideUsuario && coincideMes;
      });
      
      setDetalles(cobrosFiltrados);
    } catch (error) {
      console.error("Error al obtener detalles", error);
      setError(error.message);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalles();
  }, [userId, mes]);

  // Función para ver detalles de un cobro específico
  const handleVerDetalles = (cobroId) => {
    navigate(`/gestPago/listarRegistrosDeCobros/${cobroId}`);
  };

  // Manejadores para los modales
  const handleOpenModal = (type, cobroId) => {
    setModalType(type);
    setCurrentCobroId(cobroId);
    setShowModal(true);
    setFormData({ monto: '', nota: '' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType(null);
    setCurrentCobroId(null);
  };

  // Manejador para cambios en el formulario
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para aplicar bonificación/descuento
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("auth");
      const payload = {};
      
      if (modalType === 'bonificar') {
        payload.bonificado = parseFloat(formData.monto);
        payload.nota_bonificado = formData.nota;
      } else {
        payload.sancionado = parseFloat(formData.monto);
        payload.nota_sancionado = formData.nota;
      }
      
      await axios.put(
        `https://sistemacontable-wico.onrender.com/api/sancionar_acreditar/${currentCobroId}/`,
        payload,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success(`${modalType === 'bonificar' ? 'Bonificación' : 'Descuento'} aplicado correctamente`);
      handleCloseModal();
      
      // Actualizar la lista de cobros
      await fetchDetalles();
      
    } catch (error) {
      console.error(`Error al aplicar ${modalType}`, error);
      toast.error(error.response?.data?.message || `Error al aplicar ${modalType}`);
    }
  };

  // Función para calcular unidades netas
  const calcularUnidadesNetas = (cobro) => {
    const unidadesOriginales = 
      cobro.contenido?.reduce((sum, item) => sum + (item.unidades || 0), 0) ||
      cobro.contenido_open?.reduce((sum, item) => sum + (item.unidades || 0), 0) ||
      cobro.contenido_spr?.reduce((sum, item) => sum + (item.unidades || 0), 0) ||
      cobro.unidades || 0;
    
    // Asumiendo que 1 sol de bonificación/descuento = 1 unidad
    const bonos = cobro.bonificado || 0;
    const descuentos = cobro.sancionado || 0;
    
    return unidadesOriginales + bonos - descuentos;
  };

  if (loading) return <div className="text-center mt-4">Cargando detalles...</div>;
  if (error) return <div className="alert alert-danger mt-4">Error: {error}</div>;

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          Detalles de Pago para {usuario?.first_name} {usuario?.last_name}
        </h2>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary"
        >
          Volver
        </button>
      </div>
      
      <h5 className="mb-3">Mes: {mes || 'Todos los meses'}</h5>
      
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white">
          <h3 className="m-0">Detalles de Pago</h3>
        </div>
        <div className="card-body">
          <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="table table-striped table-hover">
              <thead className="table-dark" style={{ position: 'sticky', top: 0 }}>
                <tr>
                  <th>ID Cobro</th>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Unidades Originales</th>
                  <th>Unidades Netas</th>
                  <th>Bonos (S/.)</th>
                  <th>Descuentos (S/.)</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {detalles.length > 0 ? (
                  detalles.map((cobro) => {
                    const unidadesOriginales = 
                      cobro.contenido?.reduce((sum, item) => sum + (item.unidades || 0), 0) ||
                      cobro.contenido_open?.reduce((sum, item) => sum + (item.unidades || 0), 0) ||
                      cobro.contenido_spr?.reduce((sum, item) => sum + (item.unidades || 0), 0) ||
                      cobro.unidades || 0;
                    
                    const bonos = cobro.bonificado || 0;
                    const descuentos = cobro.sancionado || 0;
                    const unidadesNetas = calcularUnidadesNetas(cobro);

                    return (
                      <tr key={cobro.id}>
                        <td>{cobro.id}</td>
                        <td>{cobro.cliente?.nombre || 'N/A'}</td>
                        <td>{cobro.documento?.nombre_documento || 'N/A'}</td>
                        <td>{unidadesOriginales}</td>
                        <td>
                          {unidadesNetas}
                          {(bonos > 0 || descuentos > 0) && (
                            <small className="d-block text-muted">
                              {bonos > 0 && `+${bonos} (bonif.) `}
                              {descuentos > 0 && `-${descuentos} (desc.)`}
                            </small>
                          )}
                        </td>
                        <td className={bonos > 0 ? "text-success fw-bold" : ""}>
                          {bonos > 0 ? `S/. ${bonos.toFixed(2)}` : '-'}
                        </td>
                        <td className={descuentos > 0 ? "text-danger fw-bold" : ""}>
                          {descuentos > 0 ? `S/. ${descuentos.toFixed(2)}` : '-'}
                        </td>
                        <td>
                          {cobro.tipo_tarea === 1 && 'Notas'}
                          {cobro.tipo_tarea === 2 && 'Subir Notas al Sistema'}
                          {cobro.tipo_tarea === 3 && 'Bill'}
                          {cobro.tipo_tarea === 4 && 'Open'}
                          {cobro.tipo_tarea === 5 && 'SPR'}
                        </td>
                        <td>{cobro.mes || 'N/A'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button 
                              onClick={() => handleVerDetalles(cobro.id)}
                              className="btn btn-sm btn-primary"
                            >
                              Detalles
                            </button>
                            <button 
                              onClick={() => handleOpenModal('bonificar', cobro.id)}
                              className="btn btn-sm btn-success"
                            >
                              Bonus
                            </button>
                            <button 
                              onClick={() => handleOpenModal('sancionar', cobro.id)}
                              className="btn btn-sm btn-warning"
                            >
                              Descuentos
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      No se encontraron cobros para este usuario{mes ? ` en el mes de ${mes}` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Bonificar/Descontar */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className={`modal-header ${modalType === 'bonificar' ? 'bg-success' : 'bg-warning'} text-white`}>
                <h5 className="modal-title">
                  {modalType === 'bonificar' ? 'Aplicar Bonificación' : 'Aplicar Descuento'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Monto en Soles</label>
                  <input
                    type="number"
                    className="form-control"
                    name="monto"
                    value={formData.monto}
                    onChange={handleFormChange}
                    placeholder={`Ingrese monto`}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Motivo</label>
                  <textarea
                    className="form-control"
                    name="nota"
                    value={formData.nota}
                    onChange={handleFormChange}
                    placeholder="Ingrese el motivo"
                    rows="3"
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className={`btn ${modalType === 'bonificar' ? 'btn-success' : 'btn-warning'}`} 
                  onClick={handleSubmit}
                >
                  {modalType === 'bonificar' ? 'Aplicar Bonificación' : 'Aplicar Descuento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListarPagosCobrosDetallados;