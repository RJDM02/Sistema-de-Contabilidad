import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListarCobros = () => {
  const [cobros, setCobros] = useState([]);
  const [cobrosFiltrados, setCobrosFiltrados] = useState([]);
  const [cobrosSupervisados, setCobrosSupervisados] = useState([]);
  const [cobrosSupervisadosFiltrados, setCobrosSupervisadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // Estados para filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('cliente'); // 'cliente' o 'documento'
  const [filtroTabla, setFiltroTabla] = useState('misCobros'); // 'misCobros' o 'cobrosSupervisados'
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  // Obtener token de autenticación y datos de usuario
  const getAuthData = () => {
    const token = localStorage.getItem("auth");
    const role = localStorage.getItem("role");
    const id = localStorage.getItem("userID");
    setUserRole(role);
    setUserId(id);
    return token;
  };

  // Obtener lista de cobros
  useEffect(() => {
    const fetchCobros = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getAuthData();
        
        // 1. Obtener cobros del usuario actual
        const response = await axios.get("http://localhost:8000/api/listar_cobro_usuario_en_sesion/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCobros(response.data);
        setCobrosFiltrados(response.data); // Inicializar con todos los datos

        // 2. Si es supervisor, obtener y filtrar cobros supervisados
        if (userRole === 'user_Supervisor') {
          const responseAll = await axios.get("http://localhost:8000/api/listar_cobro/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          const userIdNumber = Number(localStorage.getItem("userID"));
          
          // Filtrar cobros donde el supervisor sea el usuario actual
          const supervisados = responseAll.data.filter(cobro => 
            cobro.usuario_supervisor && 
            cobro.usuario_supervisor.id === userIdNumber
          );
          setCobrosSupervisados(supervisados);
          setCobrosSupervisadosFiltrados(supervisados); // Inicializar con todos los datos
        }
        
        toast.success("Cobros cargados correctamente");
      } catch (error) {
        console.error("Error al obtener los cobros", error);
        setError("Error al cargar la lista de cobros");
        toast.error("Error al cargar los cobros");
      } finally {
        setLoading(false);
      }
    };

    fetchCobros();
  }, [userRole, userId]);

  // Función para aplicar filtros
  const aplicarFiltros = () => {
    if (!filtroTexto.trim()) {
      // Si no hay texto de filtro, mostrar todos los datos
      setCobrosFiltrados(cobros);
      setCobrosSupervisadosFiltrados(cobrosSupervisados);
      setFiltrosAplicados(false);
      return;
    }

    const textoFiltro = filtroTexto.toLowerCase().trim();
    
    if (filtroTabla === 'misCobros' || filtroTabla === 'ambos') {
      const filtrado = cobros.filter(cobro => {
        if (filtroTipo === 'cliente') {
          return cobro.cliente?.nombre?.toLowerCase().includes(textoFiltro);
        } else if (filtroTipo === 'documento') {
          return cobro.documento?.nombre_documento?.toLowerCase().includes(textoFiltro);
        }
        return false;
      });
      setCobrosFiltrados(filtrado);
    }
    
    if ((filtroTabla === 'cobrosSupervisados' || filtroTabla === 'ambos') && userRole === 'user_Supervisor') {
      const filtrado = cobrosSupervisados.filter(cobro => {
        if (filtroTipo === 'cliente') {
          return cobro.cliente?.nombre?.toLowerCase().includes(textoFiltro);
        } else if (filtroTipo === 'documento') {
          return cobro.documento?.nombre_documento?.toLowerCase().includes(textoFiltro);
        }
        return false;
      });
      setCobrosSupervisadosFiltrados(filtrado);
    }
    
    setFiltrosAplicados(true);
    toast.info("Filtros aplicados");
  };

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroTexto('');
    setCobrosFiltrados(cobros);
    setCobrosSupervisadosFiltrados(cobrosSupervisados);
    setFiltrosAplicados(false);
    toast.info("Filtros eliminados");
  };

  const handleModificar = (id) => {
    navigate(`/gestCobro/modificarCobro/${id}`);
  };

  const handleInsertarCobro = () => {
    navigate("/gestCobro/insertarCobro");
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este cobro?')) return;
    
    try {
      setDeletingId(id);
      const token = getAuthData();
      
      await axios.delete(
        `http://localhost:8000/api/eliminar_cobro/${id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Actualizar ambas listas
      const cobrosActualizados = cobros.filter(cobro => cobro.id !== id);
      setCobros(cobrosActualizados);
      setCobrosFiltrados(cobrosActualizados);
      
      if (userRole === 'user_Supervisor') {
        const supervisadosActualizados = cobrosSupervisados.filter(cobro => cobro.id !== id);
        setCobrosSupervisados(supervisadosActualizados);
        setCobrosSupervisadosFiltrados(supervisadosActualizados);
      }
      
      toast.success("Cobro eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar el cobro", error);
      const errorMessage = error.response?.data?.detail || "Error al eliminar el cobro";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  // Función para "Mis Cobros" (0.40 para no supervisados, 0.20 para supervisados)
  const calcularTotalesGenerales = (listaCobros, esSupervisado = false) => {
    let totalUnidades = 0;
    let totalCobrar = 0;
    const factor = esSupervisado ? 0.40 : 0.20;
    
    listaCobros.forEach(cobro => {
      cobro.contenido?.forEach(registro => {
        totalUnidades += registro.unidades || 0;
      });
    });

    totalCobrar = totalUnidades * factor;
    
    return {
      totalUnidades,
      totalCobrar: totalCobrar.toFixed(2)
    };
  };

  // Función específica para "Cobros Supervisados" (siempre 0.20)
  const calcularTotalesSupervisados = (listaCobros) => {
    let totalUnidades = 0;
    let totalCobrar = 0;
    const factor = 0.20;
    
    listaCobros.forEach(cobro => {
      cobro.contenido?.forEach(registro => {
        totalUnidades += registro.unidades || 0;
      });
    });

    totalCobrar = totalUnidades * factor;
    
    return {
      totalUnidades,
      totalCobrar: totalCobrar.toFixed(2)
    };
  };

  // Calcular totales para "Mis Cobros" (utilizando la lista filtrada cuando hay filtros)
  const { totalUnidades, totalCobrar } = calcularTotalesGenerales(
    cobrosFiltrados, 
    userRole === 'user_Supervisor' || userRole === 'Admin' || userRole === 'user_User'
  );
  
  // Calcular totales para "Cobros Supervisados" (utilizando la lista filtrada cuando hay filtros)
  const { 
    totalUnidades: totalUnidadesSupervisados, 
    totalCobrar: totalCobrarSupervisados 
  } = calcularTotalesSupervisados(cobrosSupervisadosFiltrados);

  // Calcular totales globales
  const totalUnidadesGlobal = totalUnidades + totalUnidadesSupervisados;
  const totalCobrarGlobal = parseFloat(totalCobrar) + parseFloat(totalCobrarSupervisados);

  return (
    <div className="container mt-4">
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
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Lista de Cobros</h2>
        <button
          onClick={handleInsertarCobro}
          className="btn btn-primary"
        >
          Insertar Cobro
        </button>
      </div>

      {/* Barra de filtros */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="m-0">Filtros de Búsqueda</h4>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Buscar por:</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Texto de búsqueda..." 
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                />
              </div>
            </div>
            
            <div className="col-md-3">
              <label className="form-label">Filtrar por:</label>
              <select 
                className="form-select" 
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="cliente">Cliente</option>
                <option value="documento">Documento</option>
              </select>
            </div>
            
            <div className="col-md-3">
              <label className="form-label">Aplicar en:</label>
              <select 
                className="form-select" 
                value={filtroTabla}
                onChange={(e) => setFiltroTabla(e.target.value)}
              >
                <option value="misCobros">Mis Cobros</option>
                {userRole === 'user_Supervisor' && (
                  <>
                    <option value="cobrosSupervisados">Cobros Supervisados</option>
                    <option value="ambos">Ambas Tablas</option>
                  </>
                )}
              </select>
            </div>
            
            <div className="col-md-2 d-flex align-items-end">
              {!filtrosAplicados ? (
                <button 
                  className="btn btn-success w-100" 
                  onClick={aplicarFiltros}
                >
                  Aplicar Filtros
                </button>
              ) : (
                <button 
                  className="btn btn-secondary w-100" 
                  onClick={limpiarFiltros}
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
          
          {filtrosAplicados && (
            <div className="alert alert-info mt-3 mb-0">
              <i className="bi bi-info-circle-fill me-2"></i>
              Mostrando resultados filtrados por: <strong>{filtroTipo === 'cliente' ? 'Cliente' : 'Documento'}</strong> 
              que contiene "<strong>{filtroTexto}</strong>"
            </div>
          )}
        </div>
      </div>

      {loading && <div className="text-center">Cargando...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <>
          {/* Panel de Resumen General */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-dark text-white">
              <h3 className="m-0">Resumen General</h3>
              {filtrosAplicados && (
                <span className="badge bg-warning text-dark ms-2">
                  Mostrando datos filtrados
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <div className="card bg-light border-secondary h-100">
                    <div className="card-header bg-secondary text-white">
                      <h5 className="card-title mb-0">Mis Cobros</h5>
                    </div>
                    <div className="card-body text-center">
                      <div className="mt-2">
                        <p className="mb-1"><strong>Total Unidades:</strong> {totalUnidades}</p>
                        <p className="mb-0"><strong>Total a Cobrar:</strong> ${totalCobrar}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {userRole === 'user_Supervisor' && (
                  <div className="col-md-4">
                    <div className="card bg-light border-secondary h-100">
                      <div className="card-header bg-secondary text-white">
                        <h5 className="card-title mb-0">Cobros Supervisados</h5>
                      </div>
                      <div className="card-body text-center">
                        <div className="mt-2">
                          <p className="mb-1"><strong>Total Unidades:</strong> {totalUnidadesSupervisados}</p>
                          <p className="mb-0"><strong>Total a Cobrar:</strong> ${totalCobrarSupervisados}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className={`col-md-${userRole === 'user_Supervisor' ? '4' : '8'}`}>
                  <div className="card bg-dark text-white h-100">
                    <div className="card-header bg-black">
                      <h5 className="card-title mb-0">Total Global</h5>
                    </div>
                    <div className="card-body text-center">
                      <div className="mt-2">
                        <p className="mb-1"><strong>Total Unidades:</strong> {totalUnidadesGlobal}</p>
                        <p className="mb-0"><strong>Total a Cobrar:</strong> ${totalCobrarGlobal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla principal de cobros del usuario */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h3 className="m-0">Mis Cobros</h3>
              {filtrosAplicados && filtroTabla !== 'cobrosSupervisados' && (
                <span className="badge bg-warning text-dark">
                  Filtrado: {cobrosFiltrados.length} de {cobros.length} registros
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table table-striped table-hover">
                  <thead className="table-dark" style={{ position: 'sticky', top: 0 }}>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Documento</th>
                      <th>Registros</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrosFiltrados.map((cobro) => (
                      <tr key={`mis-cobros-${cobro.id}`}>
                        <td>{cobro.id}</td>
                        <td>{cobro.cliente?.nombre || 'N/A'}</td>
                        <td>{cobro.documento?.nombre_documento || 'N/A'}</td>
                        <td>
                          <div style={{ 
                            maxHeight: '120px', 
                            overflowY: 'auto',
                            paddingRight: '10px'
                          }}>
                            {cobro.contenido?.map(registro => (
                              <div key={registro.id} className="mb-1">
                                {registro.nombre_completo} - {registro.unidades} unidades
                              </div>
                            )) || 'No hay registros'}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <button 
                              onClick={() => handleModificar(cobro.id)}
                              className="btn btn-sm btn-warning"
                              disabled={deletingId === cobro.id}
                            >
                              Modificar
                            </button>
                            <button
                              onClick={() => handleEliminar(cobro.id)}
                              className="btn btn-sm btn-danger"
                              disabled={deletingId === cobro.id}
                            >
                              {deletingId === cobro.id ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              ) : 'Eliminar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Mensaje si no hay resultados */}
                    {cobrosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          <div className="alert alert-secondary mb-0">
                            No se encontraron registros que coincidan con el filtro
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {/* Fila de totales */}
                    {cobrosFiltrados.length > 0 && (
                      <tr className="table-secondary">
                        <td colSpan="3"><strong>Totales</strong></td>
                        <td>
                          <strong>Total unidades: {totalUnidades}</strong>
                        </td>
                        <td>
                          <strong>Total a cobrar: ${totalCobrar}</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tabla de cobros supervisados (solo para user_Supervisor) */}
          {userRole === 'user_Supervisor' && (
            <div className="card shadow-sm">
              <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                <h3 className="m-0">Cobros Supervisados</h3>
                {filtrosAplicados && filtroTabla !== 'misCobros' && (
                  <span className="badge bg-warning text-dark">
                    Filtrado: {cobrosSupervisadosFiltrados.length} de {cobrosSupervisados.length} registros
                  </span>
                )}
              </div>
              <div className="card-body">
                {cobrosSupervisadosFiltrados.length > 0 ? (
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table table-striped table-hover">
                      <thead className="table-dark" style={{ position: 'sticky', top: 0 }}>
                        <tr>
                          <th>ID</th>
                          <th>Usuario</th>
                          <th>Cliente</th>
                          <th>Documento</th>
                          <th>Registros</th>
                          <th>Total Unidades</th>
                          <th>Total a Cobrar (0.20)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cobrosSupervisadosFiltrados.map((cobro) => {
                          const unidadesCobro = cobro.contenido?.reduce((sum, r) => sum + (r.unidades || 0), 0) || 0;
                          const totalCobro = (unidadesCobro * 0.20).toFixed(2);
                          
                          return (
                            <tr key={`supervisados-${cobro.id}`}>
                              <td>{cobro.id}</td>
                              <td>{cobro.usuario_supervisor?.nombre || 'N/A'}</td>
                              <td>{cobro.cliente?.nombre || 'N/A'}</td>
                              <td>{cobro.documento?.nombre_documento || 'N/A'}</td>
                              <td>
                                <div style={{ 
                                  maxHeight: '120px', 
                                  overflowY: 'auto',
                                  paddingRight: '10px'
                                }}>
                                  {cobro.contenido?.map(registro => (
                                    <div key={registro.id} className="mb-1">
                                      {registro.nombre_completo} - {registro.unidades} unidades
                                    </div>
                                  )) || 'No hay registros'}
                                </div>
                              </td>
                              <td>{unidadesCobro}</td>
                              <td>${totalCobro}</td>
                            </tr>
                          );
                        })}
                        
                        {/* Mensaje si no hay resultados */}
                        {cobrosSupervisadosFiltrados.length === 0 && (
                          <tr>
                            <td colSpan="7" className="text-center py-4">
                              <div className="alert alert-secondary mb-0">
                                No se encontraron registros que coincidan con el filtro
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {/* Fila de totales supervisados */}
                        {cobrosSupervisadosFiltrados.length > 0 && (
                          <tr className="table-secondary">
                            <td colSpan="5"><strong>Totales Supervisados</strong></td>
                            <td>
                              <strong>{totalUnidadesSupervisados}</strong>
                            </td>
                            <td>
                              <strong>${totalCobrarSupervisados}</strong>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-secondary">
                    No hay cobros supervisados para mostrar
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ListarCobros;