import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListarRegistrosDeCobros = () => {
  const { cobroId } = useParams();
  const navigate = useNavigate();
  
  const [cobro, setCobro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchDetallesCobro = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("auth");
        
        const response = await axios.get(`https://sistemacontable-wico.onrender.com/api/listar_cobro_detalles/${cobroId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCobro(response.data);
      } catch (error) {
        console.error("Error al obtener detalles del cobro", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetallesCobro();
  }, [cobroId]);

  const handleEliminarCobro = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este cobro? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeleting(true);
      const token = localStorage.getItem("auth");
      
      await axios.delete(`https://sistemacontable-wico.onrender.com/api/eliminar_cobro/${cobroId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Cobro eliminado correctamente');
      navigate(-1);
    } catch (error) {
      console.error("Error al eliminar el cobro", error);
      const errorMessage = error.response?.data?.detail || "Error al eliminar el cobro";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-center mt-4">Cargando detalles del cobro...</div>;
  if (error) return <div className="alert alert-danger mt-4">Error: {error}</div>;
  if (!cobro) return <div className="alert alert-info mt-4">No se encontró información del cobro</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Detalles del Cobro #{cobro.id}</h2>
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary me-2"
          >
            Volver
          </button>
          <button 
            onClick={handleEliminarCobro}
            className="btn btn-danger"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Eliminando...
              </>
            ) : 'Eliminar Cobro'}
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h4>Información General</h4>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <p><strong>Usuario:</strong> {cobro.usuario_registra?.nombre}</p>
              {cobro.usuario_supervisor && (
                <p><strong>Supervisor:</strong> {cobro.usuario_supervisor?.nombre}</p>
              )}
            </div>
            <div className="col-md-4">
              <p><strong>Cliente:</strong> {cobro.cliente?.nombre}</p>
              <p><strong>Agencias:</strong> {cobro.cliente?.agencias?.map(a => a.nombre).join(', ') || 'N/A'}</p>
            </div>
            <div className="col-md-4">
              <p><strong>Documento:</strong> {cobro.documento?.nombre_documento}</p>
              <p><strong>Mes:</strong> {cobro.mes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-primary text-white">
          <h4>Registros del Pago</h4>
        </div>
        <div className="card-body">
          {cobro.contenido?.length > 0 && (
            <>
              <h5 className="mb-3">Registros Bill</h5>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre Completo</th>
                      <th>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobro.contenido.map(registro => (
                      <tr key={`bill-${registro.id}`}>
                        <td>{registro.id}</td>
                        <td>{registro.nombre_completo}</td>
                        <td>{registro.unidades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {cobro.contenido_open?.length > 0 && (
            <>
              <h5 className="mb-3 mt-4">Registros Open</h5>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre Completo</th>
                      <th>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobro.contenido_open.map(registro => (
                      <tr key={`open-${registro.id}`}>
                        <td>{registro.id}</td>
                        <td>{registro.nombre_completo}</td>
                        <td>{registro.unidades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {cobro.contenido_spr?.length > 0 && (
            <>
              <h5 className="mb-3 mt-4">Registros SPR</h5>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre Completo</th>
                      <th>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobro.contenido_spr.map(registro => (
                      <tr key={`spr-${registro.id}`}>
                        <td>{registro.id}</td>
                        <td>{registro.nombre_completo}</td>
                        <td>{registro.unidades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {cobro.unidades > 0 && !cobro.contenido?.length && !cobro.contenido_open?.length && !cobro.contenido_spr?.length && (
            <div className="alert alert-info">
              <p><strong>Unidades totales:</strong> {cobro.unidades}</p>
              <p>Este cobro no tiene registros detallados, solo unidades totales.</p>
            </div>
          )}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ListarRegistrosDeCobros;