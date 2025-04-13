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
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Get user role from token in localStorage
    const token = localStorage.getItem("auth");
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        setUserRole(decodedToken.rol_nombre);
        // Si hay un nombre de usuario en el token, también lo extraemos
        if (decodedToken.nombre) {
          setUserName(decodedToken.nombre);
        }
      } catch (err) {
        console.error("Error decoding token", err);
      }
    }
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    setUserRole(null);
    navigate("/");
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Navigation items based on role
  const getNavItems = () => {
    const items = [];
    
    // Home link for all users
    if (!isActive("/home")) {
      items.push({
        path: "/home",
        icon: "bi-house-door",
        label: "Home"
      });
    }
    
    // SuperAdmin specific links
    if (userRole === "SuperAdmin") {
      if (!isActive("/gestRol")) {
        items.push({
          path: "/gestRol/listaUsuarios",
          icon: "bi-people",
          label: "Gestionar Rol"
        });
      }
      
      if (!isActive("/superVisarPagoCliente")) {
        items.push({
          path: "/superVisarPagoCliente/listarPagosClientes",
          icon: "bi-person-lines-fill",
          label: "Supervisar Pagos de Clientes"
        });
      }
    }
    
    // Links for Admin or regular Users
    if (userRole === "Admin" || userRole === "user_User" || userRole === "user_Supervisor" || userRole === "user_Supervisado") {
      if (!isActive("/gestCobro")) {
        items.push({
          path: "/gestCobro/listarCobros",
          icon: "bi-people",
          label: "Gestionar Cobros"
        });
      }
    }
    
    // Links for SuperAdmin or Admin
    if (userRole === "SuperAdmin" || userRole === "Admin") {
      if (!isActive("/gestTrabajador")) {
        items.push({
          path: "/gestTrabajador/listaTrabajadores",
          icon: "bi-person-badge",
          label: "Gestionar Trabajador"
        });
      }
      
      if (!isActive("/gestCliente")) {
        items.push({
          path: "/gestCliente/listarClientes",
          icon: "bi-person-lines-fill",
          label: "Gestionar Clientes"
        });
      }
      
      if (!isActive("/gestDocumentacion")) {
        items.push({
          path: "/gestDocumentacion/listarDocumentacion",
          icon: "bi-file-earmark-text",
          label: "Gestionar Documentación"
        });
      }
      
      if (!isActive("/gestPago")) {
        items.push({
          path: "/gestPago/listarPagosCobros",
          icon: "bi-credit-card",
          label: "Gestionar Pagos"
        });
      }
    }
    
    return items;
  };

  const navItems = getNavItems();

  // Función para generar color basado en el rol
  const getRoleColor = () => {
    switch (userRole) {
      case "SuperAdmin": return "#4c51bf"; // Púrpura
      case "Admin": return "#2b6cb0"; // Azul
      case "user_User": return "#2f855a"; // Verde
      case "user_Supervisor": return "#c05621"; // Naranja
      case "user_Supervisado": return "#718096"; // Gris
      default: return "#6b7280"; // Gris por defecto
    }
  };

  return (
    <nav className="navbar navbar-expand-lg sticky-top" style={{
      background: 'linear-gradient(to right, #2c3e50, #3a506b)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      padding: '12px 0'
    }}>
      <div className="container">
        <Link 
          className="navbar-brand d-flex align-items-center" 
          to="/home" 
          style={{ 
            fontWeight: '700', 
            fontSize: '1.6rem',
            color: 'white',
            letterSpacing: '0.5px'
          }}
        >
          <i className="bi bi-building me-2"></i>
          Mi App
        </Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          onClick={toggleMobileMenu}
          style={{
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '4px 8px'
          }}
        >
          <i className="bi bi-list text-white" style={{ fontSize: '1.5rem' }}></i>
        </button>

        <div className={`collapse navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`}>
          <ul className="navbar-nav ms-auto align-items-center">
            {navItems.map((item, index) => (
              <li className="nav-item mx-1" key={index}>
                <Link 
                  className="nav-link d-flex align-items-center text-white" 
                  to={item.path}
                  style={{ 
                    fontSize: '1rem', 
                    fontWeight: '500',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    opacity: '0.9',
                    margin: '0 2px',
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
                  <i className={`bi ${item.icon} me-2`}></i>
                  {item.label}
                </Link>
              </li>
            ))}

            {/* User Dropdown with avatar-style circle */}
            <li className="nav-item ms-3" ref={dropdownRef}>
              <button 
                className="btn d-flex align-items-center justify-content-center" 
                onClick={toggleDropdown} 
                style={{ 
                  borderRadius: '50%', 
                  backgroundColor: getRoleColor(),
                  border: '2px solid rgba(255,255,255,0.3)',
                  width: '40px',
                  height: '40px',
                  position: 'relative',
                  color: 'white',
                  fontSize: '1.1rem',
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
                    marginTop: '10px', 
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
                  {/* Cabecera del perfil */}
                  <div className="text-center py-3" style={{ 
                    backgroundColor: getRoleColor(),
                    marginTop: '-8px',
                    marginBottom: '8px',
                    padding: '16px 8px',
                    color: 'white'
                  }}>
                    <div className="d-flex align-items-center justify-content-center mb-2">
                      <div style={{ 
                        width: '45px', 
                        height: '45px', 
                        borderRadius: '50%', 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        fontWeight: '600'
                      }}>
                        <i className="bi bi-person-fill"></i> 
                      </div>
                    </div>
                    <span className="d-block" style={{ fontWeight: '600' }}>{userName}</span>
                    {(userRole === "SuperAdmin" || userRole === "Admin") ? "Administrador" : "Usuario"}
                  </div>
                  
                  {/* Opciones del menú */}
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
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        backgroundColor: '#e3ecff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        color: '#3b82f6'
                      }}>
                        <i className="bi bi-key-fill"></i> 
                      </div>
                      <div>
                        <span className="d-block" style={{ fontWeight: '500', fontSize: '0.95rem' }}>Cambiar Contraseña</span>
                        <small className="text-muted" style={{ fontSize: '0.8rem' }}>Actualizar credenciales</small>
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
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        backgroundColor: '#ffe5e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        color: '#ef4444'
                      }}>
                        <i className="bi bi-door-closed-fill"></i> {/* Puerta cerrándose para logout */}
                      </div>
                      <div>
                        <span className="d-block" style={{ fontWeight: '500', fontSize: '0.95rem' }}>Cerrar Sesión</span>
                        <small className="text-muted" style={{ fontSize: '0.8rem' }}>Salir de la aplicación</small>
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

