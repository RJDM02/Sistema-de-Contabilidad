import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

const Home = () => {
  const [firstName, setFirstName] = useState("");
  const [rol, setRol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumenCobros, setResumenCobros] = useState({
    totalUnidades: 0,
    totalCobrar: 0,
    unidadesMesActual: 0,
    valorMesActual: 0,
    cantidadDocumentos: 0,
    cantidadClientes: 0
  });
  const [resumenSuperAdmin, setResumenSuperAdmin] = useState({
    totalEstimadoMes: 0,
    totalRealMes: 0,
    pagadoMes: 0,
    deudaMes: 0
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getRolDescripcion = (rol) => {
    const roles = {
      "SuperAdmin": "Administrador",
      "Admin": "Administrador",
      "user_Supervisor": "Supervisor",
      "user_User": "Usuario",
      "user_Supervisado": "Usuario"
    };
    return roles[rol] || "Invitado";
  };

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const getMesActual = () => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[new Date().getMonth()];
  };

  const cargarDatosSuperAdmin = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("auth");
    
    const [estimadosResponse, tareasResponse, montosExtraResponse, cobrosResponse] = await Promise.all([
      axios.get("https://sistemacontable-wico.onrender.com/api/listar_cobros_estimados/", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("https://sistemacontable-wico.onrender.com/api/listar_tarea/", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("https://sistemacontable-wico.onrender.com/api/listar_monto_extra/", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("https://sistemacontable-wico.onrender.com/api/listar_cobro/", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ]);

    // 1. Total Cobrar (estimados + sumas - restas)
    let totalEstimado = 0;
    estimadosResponse.data.forEach(estimado => {
      totalEstimado += (estimado.bill || 0) + (estimado.notas || 0) + (estimado.subir_notas || 0);
    });
    
    tareasResponse.data.forEach(tarea => {
      if (tarea.cobro) {
        totalEstimado += (tarea.cobro.suma || 0) - (tarea.cobro.restar || 0);
      }
    });

    // 2. Monto Extra (suma directa)
    const montoExtra = montosExtraResponse.data.reduce((sum, extra) => sum + (extra.monto || 0), 0);

    // 3. Total Pagado (cobros reales * 0.4)
    let totalPagado = 0;
    cobrosResponse.data.forEach(cobro => {
      let unidades = 0;
      if (cobro.contenido?.length > 0) {
        unidades += cobro.contenido.reduce((sum, r) => sum + (r.unidades || 0), 0);
      }
      if (cobro.contenido_open?.length > 0) {
        unidades += cobro.contenido_open.reduce((sum, r) => sum + (r.unidades || 0), 0);
      }
      if (cobro.contenido_spr?.length > 0) {
        unidades += cobro.contenido_spr.reduce((sum, r) => sum + (r.unidades || 0), 0);
      }
      if (unidades === 0 && cobro.unidades) {
        unidades = cobro.unidades;
      }
      unidades += (cobro.bonificado || 0) - (cobro.sancionado || 0);
      totalPagado += unidades * 0.4;
    });

    // 4. Pendiente por Cobrar (Total Cobrar - Monto Extra)
    let pendiente = totalEstimado - montoExtra;
    if (pendiente < 0) pendiente = 0; // No mostrar valores negativos

    setResumenSuperAdmin({
      totalEstimadoMes: totalEstimado.toFixed(2),
      totalRealMes: montoExtra.toFixed(2),
      pagadoMes: totalPagado.toFixed(2),
      deudaMes: pendiente.toFixed(2)
    });
    
  } catch (error) {
    console.error("Error al cargar datos para SuperAdmin", error);
    setError("No se pudieron cargar los datos financieros. Por favor, intente nuevamente más tarde.");
  } finally {
    setLoading(false);
  }
}, []);

  const cargarDatosCobros = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("auth");
      const response = await axios.get("https://sistemacontable-wico.onrender.com/api/listar_cobro_usuario_en_sesion/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let totalUnidades = 0;
      let totalCobrar = 0;
      let unidadesMesActual = 0;
      let valorMesActual = 0;
      const clientesUnicos = new Set();
      const documentosUnicos = new Set();
      
      const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      const nombreMesActual = meses[new Date().getMonth()];
      const factor = rol === "user_Supervisado" ? 0.20 : 0.40;
      
      response.data.forEach(cobro => {
        if (cobro.cliente?.nombre) clientesUnicos.add(cobro.cliente.nombre);
        if (cobro.documento?.nombre_documento) documentosUnicos.add(cobro.documento.nombre_documento);
        
        let unidadesCobro = 0;
        
        if (cobro.contenido?.length > 0) {
          unidadesCobro += cobro.contenido.reduce((sum, r) => sum + (r.unidades || 0), 0);
        }
        if (cobro.contenido_open?.length > 0) {
          unidadesCobro += cobro.contenido_open.reduce((sum, r) => sum + (r.unidades || 0), 0);
        }
        if (cobro.contenido_spr?.length > 0) {
          unidadesCobro += cobro.contenido_spr.reduce((sum, r) => sum + (r.unidades || 0), 0);
        }
        if (unidadesCobro === 0 && cobro.unidades) {
          unidadesCobro = cobro.unidades;
        }
        
        totalUnidades += unidadesCobro;
        
        if (cobro.mes && cobro.mes.toLowerCase() === nombreMesActual) {
          unidadesMesActual += unidadesCobro;
          valorMesActual += unidadesCobro * factor;
        }
      });
      
      totalCobrar = totalUnidades * factor;
      
      setResumenCobros({
        totalUnidades,
        totalCobrar: totalCobrar.toFixed(2),
        unidadesMesActual,
        valorMesActual: valorMesActual.toFixed(2),
        cantidadClientes: clientesUnicos.size,
        cantidadDocumentos: documentosUnicos.size
      });
      
    } catch (error) {
      console.error("Error al cargar datos para el dashboard", error);
      setError("No se pudieron cargar los datos. Por favor, intente nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  }, [rol]);

  useEffect(() => {
    const savedFirstName = localStorage.getItem("nombre");
    const savedRol = localStorage.getItem("role") || "Invitado";
    const savedUserId = localStorage.getItem("userID");
    
    setFirstName(savedFirstName);
    setRol(savedRol);
    
    if (savedRol === "SuperAdmin") {
      cargarDatosSuperAdmin();
    } else if (savedRol !== "SuperAdmin") {
      cargarDatosCobros(savedUserId);
    }
  }, [cargarDatosCobros, cargarDatosSuperAdmin]);

  const saludo = getGreeting();
  const descripcionRol = getRolDescripcion(rol);
  const mesActual = getMesActual();

  return (
    <div className="container-fluid py-4 px-4 bg-light" style={{minHeight: "92vh"}}>
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="display-6 text-primary fw-bold mb-1">
                {saludo}, {firstName}!
              </h1>
              <p className="text-secondary mb-0">
                Bienvenido a su sistema de administración de contabilidad.
                {rol !== "SuperAdmin" && " Aquí tiene un resumen de su actividad."}
              </p>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <span className="badge bg-primary fs-6 px-3 py-2">
                {descripcionRol}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando su información...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      ) : rol === "SuperAdmin" ? (
        <div className="row g-4">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-header bg-dark text-white">
                <h5 className="card-title mb-0">Resumen Financiero</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 col-lg-3 mb-4">
                    <div className="card h-100 border-primary">
                      <div className="card-body text-center">
                        <h6 className="text-primary">Total Cobrar</h6>
                        <h3 className="fw-bold">${formatNumber(resumenSuperAdmin.totalEstimadoMes)}</h3>
                        <p className="text-muted small">Valor estimado a cobrar</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6 col-lg-3 mb-4">
                    <div className="card h-100 border-info">
                      <div className="card-body text-center">
                        <h6 className="text-info">Monto Extra</h6>
                        <h3 className="fw-bold">${formatNumber(resumenSuperAdmin.totalRealMes)}</h3>
                        <p className="text-muted small">Monto extra recibido</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6 col-lg-3 mb-4">
                    <div className="card h-100 border-success">
                      <div className="card-body text-center">
                        <h6 className="text-success">Total Pagado</h6>
                        <h3 className="fw-bold">${formatNumber(resumenSuperAdmin.pagadoMes)}</h3>
                        <p className="text-muted small">Monto recibido</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6 col-lg-3 mb-4">
                    <div className="card h-100 border-danger">
                      <div className="card-body text-center">
                        <h6 className="text-danger">Pendiente por Cobrar</h6>
                        <h3 className="fw-bold">${formatNumber(resumenSuperAdmin.deudaMes)}</h3>
                        <p className="text-muted small">Diferencia por cobrar</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="card">
                    <div className="card-header bg-light">
                      <h6 className="mb-0">Resumen Comparativo</h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="d-flex justify-content-between mb-2">
                            <span>Estimado vs Pagado:</span>
                            <strong className={parseFloat(resumenSuperAdmin.pagadoMes) >= parseFloat(resumenSuperAdmin.totalEstimadoMes) ? "text-success" : "text-danger"}>
                              {((parseFloat(resumenSuperAdmin.pagadoMes) / (parseFloat(resumenSuperAdmin.totalEstimadoMes) || 1) * 100).toFixed(2))}%
                            </strong>
                          </div>
                          <div className="progress mb-4" style={{height: "10px"}}>
                            <div 
                              className="progress-bar bg-primary" 
                              role="progressbar" 
                              style={{width: `${Math.min(100, (parseFloat(resumenSuperAdmin.pagadoMes) / (parseFloat(resumenSuperAdmin.totalEstimadoMes) || 1) * 100))}%`}} 
                            />
                          </div>
                        </div>
                        
                        <div className="col-md-6">
                          <div className="d-flex justify-content-between mb-2">
                            <span>Porcentaje de cobranza:</span>
                            <strong className={parseFloat(resumenSuperAdmin.pagadoMes) >= parseFloat(resumenSuperAdmin.totalEstimadoMes) * 0.8 ? "text-success" : "text-warning"}>
                              {((parseFloat(resumenSuperAdmin.pagadoMes) / (parseFloat(resumenSuperAdmin.totalEstimadoMes) || 1) * 100).toFixed(2))}%
                            </strong>
                          </div>
                          <div className="progress mb-4" style={{height: "10px"}}>
                            <div 
                              className="progress-bar bg-success" 
                              role="progressbar" 
                              style={{width: `${Math.min(100, (parseFloat(resumenSuperAdmin.pagadoMes) / (parseFloat(resumenSuperAdmin.totalEstimadoMes) || 1) * 100))}%`}} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-md-6 col-lg-3">
              <div className="card shadow h-100">
                <div className="card-header bg-primary text-white">
                  <h5 className="card-title mb-0">Total de Unidades</h5>
                </div>
                <div className="card-body text-center">
                  <h2 className="display-5 fw-bold text-primary mb-0">{formatNumber(resumenCobros.totalUnidades)}</h2>
                  <p className="text-muted">Unidades registradas</p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="card shadow h-100">
                <div className="card-header bg-success text-white">
                  <h5 className="card-title mb-0">Total a Cobrar</h5>
                </div>
                <div className="card-body text-center">
                  <h2 className="display-5 fw-bold text-success mb-0">${formatNumber(resumenCobros.totalCobrar)}</h2>
                  <p className="text-muted">Valor a cobrar</p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="card shadow h-100">
                <div className="card-header bg-info text-white">
                  <h5 className="card-title mb-0">Clientes</h5>
                </div>
                <div className="card-body text-center">
                  <h2 className="display-5 fw-bold text-info mb-0">{resumenCobros.cantidadClientes}</h2>
                  <p className="text-muted">Clientes activos</p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="card shadow h-100">
                <div className="card-header bg-warning text-dark">
                  <h5 className="card-title mb-0">Documentos</h5>
                </div>
                <div className="card-body text-center">
                  <h2 className="display-5 fw-bold text-warning mb-0">{resumenCobros.cantidadDocumentos}</h2>
                  <p className="text-muted">Tipos de documentos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card shadow">
                <div className="card-header bg-dark text-white">
                  <h5 className="card-title mb-0">Resumen de {mesActual}</h5>
                </div>
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-md-6 text-center">
                      <div className="p-4 bg-light rounded border">
                        <h6 className="text-primary mb-3">Unidades Registradas</h6>
                        <h2 className="display-6 fw-bold mb-3">{formatNumber(resumenCobros.unidadesMesActual)}</h2>
                        <div className="progress mb-2" style={{height: "10px"}}>
                          <div 
                            className="progress-bar bg-primary" 
                            role="progressbar" 
                            style={{width: `${Math.min(100, (resumenCobros.unidadesMesActual / (resumenCobros.totalUnidades || 1)) * 100)}%`}} 
                          />
                        </div>
                        <p className="text-muted mb-0">
                          {Math.round((resumenCobros.unidadesMesActual / (resumenCobros.totalUnidades || 1)) * 100)}% del total
                        </p>
                      </div>
                    </div>
                    <div className="col-md-6 text-center mt-4 mt-md-0">
                      <div className="p-4 bg-light rounded border">
                        <h6 className="text-success mb-3">Valor a Cobrar</h6>
                        <h2 className="display-6 fw-bold mb-3">${formatNumber(resumenCobros.valorMesActual)}</h2>
                        <div className="progress mb-2" style={{height: "10px"}}>
                          <div 
                            className="progress-bar bg-success" 
                            role="progressbar" 
                            style={{width: `${Math.min(100, (resumenCobros.valorMesActual / (resumenCobros.totalCobrar || 1)) * 100)}%`}} 
                          />
                        </div>
                        <p className="text-muted mb-0">
                          {Math.round((resumenCobros.valorMesActual / (resumenCobros.totalCobrar || 1)) * 100)}% del total
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;



