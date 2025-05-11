import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListarCobros = () => {
  // 1. ESTADOS DEL COMPONENTE
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
  const [filtroTipo, setFiltroTipo] = useState('cliente');
  const [filtroTabla, setFiltroTabla] = useState('misCobros');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  // Lista de meses para el filtro
  const meses = [
    '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  // 2. FUNCIONES AUXILIARES
  const getAuthData = () => {
    const token = localStorage.getItem("auth");
    const role = localStorage.getItem("role");
    const id = localStorage.getItem("userID");
    setUserRole(role);
    setUserId(id);
    return token;
  };

  const getAgenciasNames = (agencias) => {
    if (!agencias || !Array.isArray(agencias)) return 'N/A';
    return agencias.map(agencia => agencia.nombre).join(', ');
  };

  // Función para calcular unidades netas (incluyendo bonificación/sanción)
  const calcularUnidadesNetas = (cobro) => {
    let unidadesNetas = 0;
    
    // Sumar unidades de contenido
    if (cobro.contenido?.length > 0) {
      unidadesNetas += cobro.contenido.reduce((sum, item) => sum + (parseInt(item.unidades) || 0), 0);
    }
    
    if (cobro.contenido_open?.length > 0) {
      unidadesNetas += cobro.contenido_open.reduce((sum, item) => sum + (parseInt(item.unidades) || 0), 0);
    }
    
    if (cobro.contenido_spr?.length > 0) {
      unidadesNetas += cobro.contenido_spr.reduce((sum, item) => sum + (parseInt(item.unidades) || 0), 0);
    }
    
    // Si no hay contenido detallado, usar unidades directas
    if ((!cobro.contenido || cobro.contenido.length === 0) &&
        (!cobro.contenido_open || cobro.contenido_open.length === 0) &&
        (!cobro.contenido_spr || cobro.contenido_spr.length === 0)) {
      unidadesNetas = parseInt(cobro.unidades) || 0;
    }
    
    // Aplicar bonificación/sanción
    unidadesNetas += parseFloat(cobro.bonificado) || 0;
    unidadesNetas -= parseFloat(cobro.sancionado) || 0;
    
    // No permitir unidades negativas
    return Math.max(0, unidadesNetas);
  };

  // 3. EFECTOS (useEffect)
  useEffect(() => {
    const fetchCobros = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getAuthData();
        
        const response = await axios.get("https://sistemacontable-wico.onrender.com/api/listar_cobro_usuario_en_sesion/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCobros(response.data);
        setCobrosFiltrados(response.data);

        if (userRole === 'user_Supervisor') {
          const responseAll = await axios.get("https://sistemacontable-wico.onrender.com/api/listar_cobro/", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const userIdNumber = Number(localStorage.getItem("userID"));
          const supervisados = responseAll.data.filter(cobro => 
            cobro.usuario_supervisor && 
            cobro.usuario_supervisor.id === userIdNumber
          );
          setCobrosSupervisados(supervisados);
          setCobrosSupervisadosFiltrados(supervisados);
        }
        
        mostrarNotificacion("Cobros cargados correctamente");
      } catch (error) {
        console.error("Error al obtener los cobros", error);
        setError("Error al cargar la lista de cobros");
        mostrarNotificacion("Error al cargar los cobros", 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCobros();
  }, [userRole, userId]);

  // 4. MANEJADORES DE EVENTOS
  const aplicarFiltros = () => {
    if (!filtroTexto.trim() && !filtroMes) {
      setCobrosFiltrados(cobros);
      setCobrosSupervisadosFiltrados(cobrosSupervisados);
      setFiltrosAplicados(false);
      return;
    }

    const textoFiltro = filtroTexto.toLowerCase().trim();
    const mesFiltro = filtroMes.toLowerCase();
    
    if (filtroTabla === 'misCobros' || filtroTabla === 'ambos') {
      const filtrado = cobros.filter(cobro => {
        const cumpleTexto = !textoFiltro || 
          (filtroTipo === 'cliente' && cobro.cliente?.nombre?.toLowerCase().includes(textoFiltro)) ||
          (filtroTipo === 'documento' && cobro.documento?.nombre_documento?.toLowerCase().includes(textoFiltro));
        
        const cumpleMes = !filtroMes || cobro.mes?.toLowerCase() === mesFiltro;
        
        return cumpleTexto && cumpleMes;
      });
      setCobrosFiltrados(filtrado);
    }
    
    if ((filtroTabla === 'cobrosSupervisados' || filtroTabla === 'ambos') && userRole === 'user_Supervisor') {
      const filtrado = cobrosSupervisados.filter(cobro => {
        const cumpleTexto = !textoFiltro || 
          (filtroTipo === 'cliente' && cobro.cliente?.nombre?.toLowerCase().includes(textoFiltro)) ||
          (filtroTipo === 'documento' && cobro.documento?.nombre_documento?.toLowerCase().includes(textoFiltro));
        
        const cumpleMes = !filtroMes || cobro.mes?.toLowerCase() === mesFiltro;
        
        return cumpleTexto && cumpleMes;
      });
      setCobrosSupervisadosFiltrados(filtrado);
    }
    
    setFiltrosAplicados(true);
    mostrarNotificacion("Filtros aplicados", 'info');
  };

  const limpiarFiltros = () => {
    setFiltroTexto('');
    setFiltroMes('');
    setCobrosFiltrados(cobros);
    setCobrosSupervisadosFiltrados(cobrosSupervisados);
    setFiltrosAplicados(false);
    toast.info("Filtros eliminados");
  };

  const handleModificar = (id) => {
    const cobro = cobrosFiltrados.find(c => c.id === id) || 
                 cobrosSupervisadosFiltrados.find(c => c.id === id);
    
    if (cobro) {
      let tipoCobro = 'bill';
      if (cobro.contenido_open?.length > 0) {
        tipoCobro = 'open';
      } else if (cobro.contenido_spr?.length > 0) {
        tipoCobro = 'spr';
      }
      
      navigate(`/gestCobro/modificarCobro/${id}?tipo=${tipoCobro}`);
    }
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
        `https://sistemacontable-wico.onrender.com/api/eliminar_cobro/${id}/`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

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

  const calcularTotalesGenerales = (listaCobros, esSupervisado = false) => {
    let totalUnidades = 0;
    let totalCobrar = 0;
    const factor = esSupervisado ? 0.40 : 0.20;
    
    listaCobros.forEach(cobro => {
      const unidadesNetas = calcularUnidadesNetas(cobro);
      totalUnidades += unidadesNetas;
      totalCobrar += unidadesNetas * factor;
    });
    
    return {
      totalUnidades,
      totalCobrar: totalCobrar.toFixed(2)
    };
  };

  const calcularTotalesSupervisados = (listaCobros) => {
    let totalUnidades = 0;
    let totalCobrar = 0;
    const factor = 0.20;
    
    listaCobros.forEach(cobro => {
      const unidadesNetas = calcularUnidadesNetas(cobro);
      totalUnidades += unidadesNetas;
      totalCobrar += unidadesNetas * factor;
    });
    
    return {
      totalUnidades,
      totalCobrar: totalCobrar.toFixed(2)
    };
  };

  const { totalUnidades, totalCobrar } = calcularTotalesGenerales(
    cobrosFiltrados, 
    userRole === 'user_Supervisor' || userRole === 'Admin' || userRole === 'user_User'
  );
  
  const { 
    totalUnidades: totalUnidadesSupervisados, 
    totalCobrar: totalCobrarSupervisados 
  } = calcularTotalesSupervisados(cobrosSupervisadosFiltrados);

  const totalUnidadesGlobal = totalUnidades + totalUnidadesSupervisados;
  const totalCobrarGlobal = parseFloat(totalCobrar) + parseFloat(totalCobrarSupervisados);

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    toast.dismiss();
    if (tipo === 'success') {
      toast.success(mensaje);
    } else if (tipo === 'error') {
      toast.error(mensaje);
    } else if (tipo === 'info') {
      toast.info(mensaje);
    }
  };

  // 6. RENDERIZADO DEL COMPONENTE
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
        <h2>Lista de Cobros</h2>
        <button onClick={handleInsertarCobro} className="btn btn-primary">
          Insertar Cobro
        </button>
      </div>

      {/* Sección de Filtros */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="m-0">Filtros de Búsqueda</h4>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
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
            
            <div className="col-md-2">
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
            
            <div className="col-md-2">
              <label className="form-label">Mes:</label>
              <select
                className="form-select"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
              >
                {meses.map((mes, index) => (
                  <option key={index} value={mes}>
                    {mes === '' ? 'Todos' : mes.charAt(0).toUpperCase() + mes.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-2">
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
            
            <div className="col-md-3 d-flex align-items-end gap-2">
              {!filtrosAplicados ? (
                <button className="btn btn-success flex-grow-1" onClick={aplicarFiltros}>
                  Aplicar Filtros
                </button>
              ) : (
                <button className="btn btn-secondary flex-grow-1" onClick={limpiarFiltros}>
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
          
          {filtrosAplicados && (
            <div className="alert alert-info mt-3 mb-0">
              <i className="bi bi-info-circle-fill me-2"></i>
              Mostrando resultados filtrados por: 
              {filtroTipo && <strong> {filtroTipo === 'cliente' ? 'Cliente' : 'Documento'}</strong>}
              {filtroTexto && <> que contiene "<strong>{filtroTexto}</strong>"</>}
              {filtroMes && <> del mes de <strong>{filtroMes.charAt(0).toUpperCase() + filtroMes.slice(1)}</strong></>}
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
                        <p className="mb-1"><strong>Total Unidades Netas:</strong> {totalUnidades}</p>
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
                          <p className="mb-1"><strong>Total Unidades Netas:</strong> {totalUnidadesSupervisados}</p>
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
                        <p className="mb-1"><strong>Total Unidades Netas:</strong> {totalUnidadesGlobal}</p>
                        <p className="mb-0"><strong>Total a Cobrar:</strong> ${totalCobrarGlobal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Mis Cobros */}
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
                      <th>Agencia(s)</th>
                      <th>Documento</th>
                      <th>Mes</th>
                      <th>Registros</th>
                      <th>Bonos/Descuentos</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrosFiltrados.map((cobro) => {
                      const tieneContenido = (cobro.contenido?.length > 0) || 
                                           (cobro.contenido_open?.length > 0) || 
                                           (cobro.contenido_spr?.length > 0);
                      const bonificacion = parseFloat(cobro.bonificado) || 0;
                      const sancion = parseFloat(cobro.sancionado) || 0;
                      const bonifSanc = bonificacion - sancion;
                      
                      return (
                        <tr key={`mis-cobros-${cobro.id}`}>
                          <td>{cobro.id}</td>
                          <td>{cobro.cliente?.nombre || 'N/A'}</td>
                          <td>{getAgenciasNames(cobro.cliente?.agencias)}</td>
                          <td>{cobro.documento?.nombre_documento || 'N/A'}</td>
                          <td>{cobro.mes}</td>
                          <td>
                            {tieneContenido ? (
                              <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '10px' }}>
                                {cobro.contenido?.map(registro => (
                                  <div key={`regular-${registro.id}`} className="mb-1">
                                    {registro.nombre_completo} - {registro.unidades} unidades (Bill)
                                  </div>
                                ))}
                                {cobro.contenido_open?.map(registro => (
                                  <div key={`open-${registro.id}`} className="mb-1">
                                    {registro.nombre_completo} - {registro.unidades} unidades (Open)
                                  </div>
                                ))}
                                {cobro.contenido_spr?.map(registro => (
                                  <div key={`spr-${registro.id}`} className="mb-1">
                                    {registro.nombre_completo} - {registro.unidades} unidades (SPR)
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center">
                                <strong>Unidades del cobro: {cobro.unidades || 0}</strong>
                              </div>
                            )}
                          </td>
                          <td className={bonifSanc > 0 ? 'text-success' : bonifSanc < 0 ? 'text-danger' : ''}>
                            {bonifSanc > 0 ? `+${bonifSanc}` : bonifSanc}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              {tieneContenido && (
                                <button 
                                  onClick={() => handleModificar(cobro.id)}
                                  className="btn btn-sm btn-warning"
                                  disabled={deletingId === cobro.id}
                                >
                                  Modificar
                                </button>
                              )}
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
                      );
                    })}
                    
                    {cobrosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <div className="alert alert-secondary mb-0">
                            No se encontraron registros que coincidan con el filtro
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {cobrosFiltrados.length > 0 && (
                      <tr className="table-secondary">
                        <td colSpan="5"><strong>Totales</strong></td>
                        <td>
                          <strong>Total unidades: {totalUnidades}</strong>
                        </td>
                        <td colSpan="2">
                          <strong>Total a cobrar: ${totalCobrar}</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tabla de Cobros Supervisados (solo para user_Supervisor) */}
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
                          <th>Agencia(s)</th>
                          <th>Documento</th>
                          <th>Mes</th>
                          <th>Registros</th>
                          <th>Bonos/Descuentos</th>
                          <th>Total Unidades</th>
                          <th>Total a Cobrar (0.20)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cobrosSupervisadosFiltrados.map((cobro) => {
                          const tieneContenido = (cobro.contenido?.length > 0) || 
                                               (cobro.contenido_open?.length > 0) || 
                                               (cobro.contenido_spr?.length > 0);
                          const bonificacion = parseFloat(cobro.bonificado) || 0;
                          const sancion = parseFloat(cobro.sancionado) || 0;
                          const bonifSanc = bonificacion - sancion;
                          const unidadesNetas = calcularUnidadesNetas(cobro);
                          const totalCobro = (unidadesNetas * 0.20).toFixed(2);
                          
                          return (
                            <tr key={`supervisados-${cobro.id}`}>
                              <td>{cobro.id}</td>
                              <td>{cobro.usuario_supervisor?.nombre || 'N/A'}</td>
                              <td>{cobro.cliente?.nombre || 'N/A'}</td>
                              <td>{getAgenciasNames(cobro.cliente?.agencias)}</td>
                              <td>{cobro.documento?.nombre_documento || 'N/A'}</td>
                              <td>{cobro.mes}</td>
                              <td>
                                {tieneContenido ? (
                                  <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '10px' }}>
                                    {cobro.contenido?.map(registro => (
                                      <div key={`regular-${registro.id}`} className="mb-1">
                                        {registro.nombre_completo} - {registro.unidades} unidades (Bill)
                                      </div>
                                    ))}
                                    {cobro.contenido_open?.map(registro => (
                                      <div key={`open-${registro.id}`} className="mb-1">
                                        {registro.nombre_completo} - {registro.unidades} unidades (Open)
                                      </div>
                                    ))}
                                    {cobro.contenido_spr?.map(registro => (
                                      <div key={`spr-${registro.id}`} className="mb-1">
                                        {registro.nombre_completo} - {registro.unidades} unidades (SPR)
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <strong>Unidades del cobro: {cobro.unidades || 0}</strong>
                                  </div>
                                )}
                              </td>
                              <td className={bonifSanc > 0 ? 'text-success' : bonifSanc < 0 ? 'text-danger' : ''}>
                                {bonifSanc > 0 ? `+${bonifSanc}` : bonifSanc}
                              </td>
                              <td>{unidadesNetas}</td>
                              <td>${totalCobro}</td>
                            </tr>
                          );
                        })}
                        
                        {cobrosSupervisadosFiltrados.length === 0 && (
                          <tr>
                            <td colSpan="10" className="text-center py-4">
                              <div className="alert alert-secondary mb-0">
                                No se encontraron registros que coincidan con el filtro
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {cobrosSupervisadosFiltrados.length > 0 && (
                          <tr className="table-secondary">
                            <td colSpan="7"><strong>Totales Supervisados</strong></td>
                            <td>
                              <strong>{totalUnidadesSupervisados}</strong>
                            </td>
                            <td colSpan="2">
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