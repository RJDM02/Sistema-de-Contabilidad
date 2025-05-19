import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import 'bootstrap-icons/font/bootstrap-icons.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("Usuario");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    // Get user role from token in localStorage
    const token = localStorage.getItem("auth");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        setUserRole(decodedToken.rol_nombre);
        if (decodedToken.nombre) {
          setUserName(decodedToken.nombre);
        }
      } catch (err) {
        console.error("Error decoding token", err);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
    if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
      setShowMoreMenu(false);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    setUserRole(null);
    navigate("/");
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    setShowMoreMenu(false);
  };

  const toggleMoreMenu = () => {
    setShowMoreMenu(!showMoreMenu);
    setShowDropdown(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Navigation items based on role - ordered as requested
  const getNavItems = () => {
    const items = [];
    const currentPath = location.pathname;
    
    // Home link solo si NO estamos en home
    if (!currentPath.startsWith("/home")) {
      items.push({
        path: "/home",
        icon: "bi-house-door",
        label: "Home"
      });
    }

    // COBROS - Para todos los usuarios, solo si NO estamos en esa ruta
    if ((userRole === "Admin" || userRole === "user_User" || userRole === "user_Supervisor" || userRole === "user_Supervisado") 
        && !currentPath.startsWith("/gestCobro/listarCobros")) {
      items.push({
        path: "/gestCobro/listarCobros",
        icon: "bi-cash-coin",
        label: "Cobros"
      });
    }

    // COBROS - Vista especial para SuperAdmin, solo si NO estamos en esa ruta
    if (userRole === "SuperAdmin" && !currentPath.startsWith("/superVisarPagoCliente/listarPagosClientes")) {
      items.push({
        path: "/superVisarPagoCliente/listarPagosClientes",
        icon: "bi-cash-stack",
        label: "Cobros"
      });
    }

    // Elementos prioritarios (mostrados directamente en la barra)
    const priorityItems = items.slice(0, 2); // Los 2 primeros elementos siempre visibles

    // Elementos adicionales (mostrados en el menú "Más")
    const additionalItems = [];
    
    // Historial de Cobros - Solo SuperAdmin y si NO estamos en esa ruta
    if (userRole === "SuperAdmin" && !currentPath.startsWith("/superVisarPagoCliente/modificarPagoCliente")) {
      additionalItems.push({
        path: "/superVisarPagoCliente/modificarPagoCliente",
        icon: "bi-clock-history",
        label: "Historial de Cobros"
      });
    }

    // Monto Extra - solo si NO estamos en esa ruta
    if (!currentPath.startsWith("/monto_extra")) {
      additionalItems.push({
        path: "/monto_extra",
        icon: "bi-cash-stack",
        label: "Monto Extra"
      });
    }

    // Comparativa - solo si NO estamos en esa ruta
    if ((userRole === "SuperAdmin" || userRole === "Admin") && 
        !currentPath.startsWith("/superVisarPagoCliente/comparativaTotalCobrar")) {
      additionalItems.push({
        path: "/superVisarPagoCliente/comparativaTotalCobrar",
        icon: "bi-bar-chart",
        label: "Comparativa"
      });
    }

    // PAGOS - solo si NO estamos en esa ruta
    if ((userRole === "SuperAdmin" || userRole === "Admin") && 
        !currentPath.startsWith("/gestPago/listarPagosCobros")) {
      additionalItems.push({
        path: "/gestPago/listarPagosCobros",
        icon: "bi-credit-card",
        label: "Pagos"
      });
    }

    // TRABAJADORES - solo si NO estamos en esa ruta
    if ((userRole === "SuperAdmin" || userRole === "Admin") && 
        !currentPath.startsWith("/gestTrabajador/listaTrabajadores")) {
      additionalItems.push({
        path: "/gestTrabajador/listaTrabajadores",
        icon: "bi-person-badge",
        label: "Trabajadores"
      });
    }

    // ROL - Solo SuperAdmin y si NO estamos en esa ruta
    if (userRole === "SuperAdmin" && !currentPath.startsWith("/gestRol/listaUsuarios")) {
      additionalItems.push({
        path: "/gestRol/listaUsuarios",
        icon: "bi-people",
        label: "Rol"
      });
    }

    // CLIENTES - solo si NO estamos en esa ruta
    if ((userRole === "SuperAdmin" || userRole === "Admin") && 
        !currentPath.startsWith("/gestCliente/listarClientes")) {
      additionalItems.push({
        path: "/gestCliente/listarClientes",
        icon: "bi-person-lines-fill",
        label: "Clientes"
      });
    }

    // AGENCIAS - solo si NO estamos en esa ruta
    if ((userRole === "SuperAdmin" || userRole === "Admin") && 
        !currentPath.startsWith("/gestAgencia/listarAgencias")) {
      additionalItems.push({
        path: "/gestAgencia/listarAgencias",
        icon: "bi-building",
        label: "Agencias"
      });
    }

    // DOCUMENTACIÓN - solo si NO estamos en esa ruta
    if ((userRole === "SuperAdmin" || userRole === "Admin") && 
        !currentPath.startsWith("/gestDocumentacion/listarDocumentacion")) {
      additionalItems.push({
        path: "/gestDocumentacion/listarDocumentacion",
        icon: "bi-file-earmark-text",
        label: "Documentación"
      });
    }
    
    return { priorityItems, additionalItems };
  };

  const { priorityItems, additionalItems } = getNavItems();

  const getRoleColor = () => {
    switch (userRole) {
      case "SuperAdmin": return "#4c51bf";
      case "Admin": return "#2b6cb0";
      case "user_User": return "#2f855a";
      case "user_Supervisor": return "#c05621";
      case "user_Supervisado": return "#718096";
      default: return "#6b7280";
    }
  };

  return (
    <nav className="navbar navbar-expand-lg sticky-top" style={{
      background: 'linear-gradient(to right, #2c3e50, #3a506b)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      padding: '8px 0',
      height: '60px',
      zIndex: 1030
    }}>
      <div className="container-fluid px-3">
        <Link 
          className="navbar-brand d-flex align-items-center" 
          to="/home" 
          style={{ 
            fontWeight: '600', 
            fontSize: '1.2rem',
            color: 'white',
            letterSpacing: '0.5px',
            marginRight: '8px',
            paddingRight: '8px'
          }}
        >
          <i className="bi bi-building me-1"></i>
          Mi App
        </Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          onClick={toggleMobileMenu}
          style={{
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '2px 6px'
          }}
        >
          <i className="bi bi-list text-white" style={{ fontSize: '1.2rem' }}></i>
        </button>

        <div className={`collapse navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav d-flex align-items-center">
            {/* Elementos prioritarios siempre visibles */}
            {priorityItems.map((item, index) => (
              <li className="nav-item mx-1" key={index}>
                <Link 
                  className="nav-link d-flex align-items-center text-white" 
                  to={item.path}
                  style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '500',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    opacity: '0.9',
                    margin: '0 1px',
                    backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                >
                  <i className={`bi ${item.icon} me-1`}></i>
                  <span className="d-none d-sm-inline">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Perfil de usuario - Ahora está a la derecha */}
          <ul className="navbar-nav ms-auto align-items-center">
            {/* Botón "Más" - Ahora justo antes del icono de usuario */}
            {additionalItems.length > 0 && (
              <li className="nav-item mx-1" ref={moreMenuRef}>
                <button
                  className="nav-link d-flex align-items-center text-white"
                  onClick={toggleMoreMenu}
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    opacity: '0.9',
                    margin: '0 1px',
                    backgroundColor: showMoreMenu ? 'rgba(255,255,255,0.15)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (!showMoreMenu) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!showMoreMenu) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                >
                  <i className="bi bi-grid-3x3-gap-fill me-1"></i>
                  <span className="d-none d-sm-inline">Más</span>
                  <i className={`bi bi-chevron-${showMoreMenu ? 'up' : 'down'} ms-1`} style={{ fontSize: '0.8rem' }}></i>
                </button>

                {showMoreMenu && (
                  <div
                    className="dropdown-menu show"
                    style={{
                      position: 'absolute',
                      right: '0',
                      left: 'auto',
                      marginTop: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '8px 0',
                      minWidth: '220px',
                      backgroundColor: 'white',
                      zIndex: 1000
                    }}
                  >
                    {additionalItems.map((item, index) => (
                      <Link
                        key={index}
                        className="dropdown-item d-flex align-items-center py-2"
                        to={item.path}
                        style={{
                          borderRadius: '6px',
                          margin: '2px 8px',
                          padding: '8px 12px',
                          transition: 'background-color 0.2s',
                          backgroundColor: isActive(item.path) ? '#f3f4f6' : 'transparent',
                          fontWeight: isActive(item.path) ? '500' : 'normal'
                        }}
                      >
                        <i className={`bi ${item.icon} me-2`} style={{ color: '#4a5568' }}></i>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            )}

            {/* Perfil de usuario */}
            <li className="nav-item" ref={dropdownRef}>
              <button 
                className="btn d-flex align-items-center justify-content-center" 
                onClick={toggleDropdown} 
                style={{ 
                  borderRadius: '50%', 
                  backgroundColor: getRoleColor(),
                  border: '2px solid rgba(255,255,255,0.3)',
                  width: '36px',
                  height: '36px',
                  position: 'relative',
                  color: 'white',
                  fontSize: '1rem',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  padding: 0
                }}
                title={`${userName} (${userRole || 'Usuario'})`}
              >
                <i className="bi bi-person-fill"></i> 
              </button>

              {showDropdown && (
                <div 
                  className="dropdown-menu show" 
                  style={{ 
                    position: 'absolute', 
                    right: '0', 
                    left: 'auto', 
                    marginTop: '8px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '8px 0',
                    minWidth: '220px',
                    backgroundColor: 'white',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  {/* Profile Header */}
                  <div className="text-center py-2" style={{ 
                    backgroundColor: getRoleColor(),
                    marginTop: '-8px',
                    marginBottom: '8px',
                    padding: '12px 8px',
                    color: 'white'
                  }}>
                    <div className="d-flex align-items-center justify-content-center mb-2">
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                      }}>
                        <i className="bi bi-person-fill"></i> 
                      </div>
                    </div>
                    <span className="d-block" style={{ fontWeight: '600' }}>{userName}</span>
                    <small>{(userRole === "SuperAdmin" || userRole === "Admin") ? "Administrador" : "Usuario"}</small>
                  </div>
                  
                  {/* Menu Options */}
                  <div className="px-2">
                    <button 
                      className="dropdown-item d-flex align-items-center py-2" 
                      onClick={() => navigate("/changerPassword")}
                      style={{
                        borderRadius: '6px',
                        margin: '4px 0',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        backgroundColor: '#e3ecff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '10px',
                        color: '#3b82f6'
                      }}>
                        <i className="bi bi-key-fill"></i> 
                      </div>
                      <div>
                        <span className="d-block" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Cambiar Contraseña</span>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Actualizar credenciales</small>
                      </div>
                    </button>
                    
                    <div className="dropdown-divider mx-2 my-2"></div>
                    
                    <button 
                      className="dropdown-item d-flex align-items-center py-2" 
                      onClick={handleLogout}
                      style={{
                        borderRadius: '6px',
                        margin: '4px 0',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        backgroundColor: '#ffe5e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '10px',
                        color: '#ef4444'
                      }}>
                        <i className="bi bi-door-closed-fill"></i>
                      </div>
                      <div>
                        <span className="d-block" style={{ fontWeight: '500', fontSize: '0.9rem' }}>Cerrar Sesión</span>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Salir de la aplicación</small>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;