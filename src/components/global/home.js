import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [username, setUsername] = useState("");
  const [rol, setRol] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Datos para el dashboard
  const [resumenCobros, setResumenCobros] = useState({
    totalUnidades: 0,
    totalCobrar: 0,
    unidadesMesActual: 0,
    valorMesActual: 0,
    cantidadDocumentos: 0,
    cantidadClientes: 0
  });
  
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getRolDescripcion = (rol) => {
    if (rol === "SuperAdmin" || rol === "Admin") {
      return "Administrador";
    } else if (
      rol === "user_User" ||
      rol === "user_Supervisor" ||
      rol === "user_Supervisado"
    ) {
      return rol === "user_Supervisor" ? "Supervisor" : "Usuario";
    } else {
      return "Invitado";
    }
  };

  // Formato de número para mostrar con separadores de miles
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Obtener mes actual en formato texto
  const getMesActual = () => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const fecha = new Date();
    return meses[fecha.getMonth()];
  };

  // Cargar datos de usuario y dashboard
  useEffect(() => {
    const savedUsername = localStorage.getItem("username") || "Usuario";
    const savedRol = localStorage.getItem("role") || "Invitado";
    const savedUserId = localStorage.getItem("userID");
    
    setUsername(savedUsername);
    setRol(savedRol);
    setUserId(savedUserId);
    
    // Si no es SuperAdmin, cargar datos de cobros
    if (savedRol !== "SuperAdmin") {
      cargarDatosCobros(savedUserId);
    }
  }, []);

  // Función para cargar datos de cobros para el dashboard
  const cargarDatosCobros = async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem("auth");
      
      // 1. Obtener cobros del usuario en sesión
      const response = await axios.get("http://localhost:8000/api/listar_cobro_usuario_en_sesion/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Calcular totales
      let totalUnidades = 0;
      let totalCobrar = 0;
      let unidadesMesActual = 0;
      let valorMesActual = 0;
      const clientesUnicos = new Set();
      const documentosUnicos = new Set();
      const mesActual = new Date().getMonth();
      const factor = rol === "user_Supervisor" ? 0.40 : 0.20;
      
      response.data.forEach(cobro => {
        // Agregar cliente y documento a conjuntos
        if (cobro.cliente?.nombre) {
          clientesUnicos.add(cobro.cliente.nombre);
        }
        if (cobro.documento?.nombre_documento) {
          documentosUnicos.add(cobro.documento.nombre_documento);
        }
        
        // Obtener mes del cobro (si hay fecha)
        const fechaCobro = cobro.fecha_creacion ? new Date(cobro.fecha_creacion) : new Date();
        const mesCobro = fechaCobro.getMonth();
        
        // Sumar unidades
        let unidadesCobro = 0;
        cobro.contenido?.forEach(registro => {
          unidadesCobro += registro.unidades || 0;
        });
        
        totalUnidades += unidadesCobro;
        
        // Separar el mes actual
        if (mesCobro === mesActual) {
          unidadesMesActual += unidadesCobro;
          valorMesActual += unidadesCobro * factor;
        }
      });
      
      // Calcular total a cobrar
      totalCobrar = totalUnidades * factor;
      
      // Actualizar estado con todos los datos calculados
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
  };

  const saludo = getGreeting();
  const descripcionRol = getRolDescripcion(rol);
  const mesActual = getMesActual();

  // Funciones de navegación (se mantienen aunque ya no tengan botones)
  const irAListaCobros = () => {
    navigate("/gestCobro/listarCobro");
  };

  const irAInsertarCobro = () => {
    navigate("/gestCobro/insertarCobro");
  };

  return (
    <div className="container-fluid py-4 px-4 bg-light" style={{minHeight: "92vh"}}>
      {/* Encabezado */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="display-6 text-primary fw-bold mb-1">
                {saludo}, {username}!
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

      {/* Dashboard principal - Solo para usuarios que no son SuperAdmin */}
      {rol !== "SuperAdmin" ? (
        loading ? (
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
        ) : (
          <>
            {/* Tarjetas de Resumen */}
            <div className="row g-4 mb-4">
              {/* Tarjeta Total de Unidades */}
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

              {/* Tarjeta Total a Cobrar */}
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

              {/* Tarjeta Clientes */}
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

              {/* Tarjeta Documentos */}
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

            {/* Resumen Mensual (se mantiene pero se quitan las Acciones Rápidas) */}
            <div className="row g-4 mb-4">
              {/* Tarjeta de Resumen Mensual ahora ocupa todo el ancho */}
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
                              aria-valuenow={resumenCobros.unidadesMesActual} 
                              aria-valuemin="0" 
                              aria-valuemax={resumenCobros.totalUnidades}
                            ></div>
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
                              aria-valuenow={resumenCobros.valorMesActual} 
                              aria-valuemin="0" 
                              aria-valuemax={resumenCobros.totalCobrar}
                            ></div>
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
        )
      ) : (
        /* Contenido para SuperAdmin */
        <div className="row g-4">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-header bg-dark text-white">
                <h5 className="card-title mb-0">Panel de Administración</h5>
              </div>
              <div className="card-body">
                <p className="lead">
                  Como administrador del sistema, usted tiene acceso a todas las funciones de gestión.
                  Use el menú de navegación para acceder a las diferentes secciones del sistema.
                </p>
              </div>
            </div>
          </div>
          
          {/* Tarjetas informativas para Admin */}
          <div className="col-md-4">
            <div className="card shadow h-100">
              <div className="card-header bg-primary text-white">
                <h5 className="card-title mb-0">
                  <i className="bi bi-people me-2"></i> Usuarios
                </h5>
              </div>
              <div className="card-body">
                <p className="mb-0">
                  Administre los usuarios del sistema, asigne roles y permisos para controlar el acceso a las distintas funciones.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card shadow h-100">
              <div className="card-header bg-info text-white">
                <h5 className="card-title mb-0">
                  <i className="bi bi-gear me-2"></i> Configuración
                </h5>
              </div>
              <div className="card-body">
                <p className="mb-0">
                  Configure los parámetros generales del sistema de contabilidad, incluyendo tasas, impuestos y otras variables.
                </p>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card shadow h-100">
              <div className="card-header bg-warning text-dark">
                <h5 className="card-title mb-0">
                  <i className="bi bi-bar-chart me-2"></i> Reportes
                </h5>
              </div>
              <div className="card-body">
                <p className="mb-0">
                  Acceda a reportes completos y estadísticas del sistema para monitorear el rendimiento global.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;



