import React from "react";
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import RequireAuth from "./components/RequireAuth"; 
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

// global
import Login from "./components/global/login";
import Home from "./components/global/home";
import Changerpassword from "./components/global/changerpassword";
import Navbar from "./components/global/navbar";
import Unauthorized from "./components/global/unauthorized";

// gestRol
import ListaUsuarios from "./components/gestRol/listaUsuarios";
import ModificarRol from "./components/gestRol/modificarRol";

// gestTrabajadores
import ListaTrabajadores from "./components/gestTrabajador/listaTrabajadores";
import InsertarTrabajador from "./components/gestTrabajador/insertarTrabajador";
import ModificarTrabajador from "./components/gestTrabajador/modificarTrabajador";

// gestCliente
import ListarClientes from "./components/gestCliente/listarClientes";
import InsertarCliente from "./components/gestCliente/insertarCliente";
import ModificarCliente from "./components/gestCliente/modificarCliente";

// gestCobro
import ListarCobros from "./components/gestCobro/listarCobros";
import InsertarCobro from "./components/gestCobro/insertarCobro";
import ModificarCobro from "./components/gestCobro/modificarCobro";

// gestDocumentacion
import ListarDocumentacion from "./components/gestDocumentacion/listarDocumentacion";
import InsertarDocumentacion from "./components/gestDocumentacion/insertarDocumentacion";
import ModificarDocumentacion from "./components/gestDocumentacion/modificarDocumentacion";

// gestPago
import ListarPagosCobros from "./components/gestPago/listarPagosCobros";
import InsertarPagoCobros from "./components/gestPago/insertarPagoCobros";
import ModificarPagosCobros from "./components/gestPago/modificarPagosCobros";
import ListarPagosCobrosDetallados from "./components/gestPago/listarPagosCobrosDetallados";
import ListarRegistrosDeCobros from "./components/gestPago/listarRegistrosDeCobros";

// superVisarPagoCliente
import ListarPagosClientes from "./components/superVisarPagoCliente/listarPagosClientes";
import ModificarPagoCliente from "./components/superVisarPagoCliente/modificarPagoCliente";
import ComparativaTotalCobrar from "./components/superVisarPagoCliente/comparativaTotalCobrar";

// gestAgencia
import ListarAgencias from "./components/gestAgencia/listarAgencias";
import InsertarAgencia from "./components/gestAgencia/insertarAgencia";

const Layout = () => {
  const location = useLocation();
  const isAuth = localStorage.getItem("auth");

  return (
    <>
      {isAuth && location.pathname !== "/" && <Navbar />}
      <Outlet />
    </>
  );
};

function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<Login />} />

        {/* Layout general con navbar */}
        <Route element={<Layout />}>

          {/* Rutas protegidas para todos los roles */}
          <Route element={<RequireAuth allowedRoles={["SuperAdmin", "Admin", "user_User", "user_Supervisor", "user_Supervisado"]} />}>
            <Route path="/home" element={<Home />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["SuperAdmin", "Admin", "user_User", "user_Supervisor", "user_Supervisado"]} />}>
            <Route path="/changerPassword" element={<Changerpassword />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["Admin", "user_User", "user_Supervisor", "user_Supervisado"]} />}>
            <Route path="/gestCobro/listarCobros" element={<ListarCobros />} />
            <Route path="/gestCobro/insertarCobro" element={<InsertarCobro />} />
            <Route path="/gestCobro/modificarCobro/:id" element={<ModificarCobro />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["SuperAdmin"]} />}>
            {/* Rol */}
            <Route path="/gestRol/listaUsuarios" element={<ListaUsuarios />} />
            <Route path="/modificarRol/:id" element={<ModificarRol />} />
            {/* PagoCliente */}
            <Route path="/superVisarPagoCliente/listarPagosClientes" element={<ListarPagosClientes />} />
            <Route path="/superVisarPagoCliente/modificarPagoCliente/" element={<ModificarPagoCliente />} />
          </Route>

          <Route element={<RequireAuth allowedRoles={["SuperAdmin", "Admin"]} />}>
            {/* Trabajador */}
            <Route path="/gestTrabajador/listaTrabajadores" element={<ListaTrabajadores />} />
            <Route path="/gestTrabajador/insertarTrabajador" element={<InsertarTrabajador />} />
            <Route path="/gestTrabajador/modificarTrabajador/:id" element={<ModificarTrabajador />} />
            
            {/* Agencia */}
            <Route path="/gestAgencia/listarAgencias" element={<ListarAgencias />} />
            <Route path="/gestAgencia/insertarAgencia" element={<InsertarAgencia />} />

            {/* Cliente */}
            <Route path="/gestCliente/listarClientes" element={<ListarClientes />} />
            <Route path="/gestCliente/insertarCliente" element={<InsertarCliente />} />
            <Route path="/gestCliente/modificarCliente/:id" element={<ModificarCliente />} />

            {/* Documentación */}
            <Route path="/gestDocumentacion/listarDocumentacion" element={<ListarDocumentacion />} />
            <Route path="/gestDocumentacion/insertarDocumentacion" element={<InsertarDocumentacion />} />
            <Route path="/gestDocumentacion/modificarDocumentacion/:id" element={<ModificarDocumentacion />} />

            {/* Pago */}
            <Route path="/gestPago/listarPagosCobros" element={<ListarPagosCobros />} />
            <Route path="/gestPago/insertarPagoCobros" element={<InsertarPagoCobros />} />
            <Route path="/gestPago/modificarPagoCobros/:id" element={<ModificarPagosCobros />} />
            <Route path="/gestPago/listarPagosCobrosDetallados/:userId" element={<ListarPagosCobrosDetallados />} />
            <Route path="/gestPago/listarRegistrosDeCobros/:cobroId" element={<ListarRegistrosDeCobros />} />
            
            {/*SuperVisarPagoCliente*/}
            <Route path="/superVisarPagoCliente/comparativaTotalCobrar" element={<ComparativaTotalCobrar/>} />

          </Route>

          {/* Página de acceso denegado */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Catch all: redireccionar a /home si la ruta no existe */}
          <Route path="*" element={<Navigate to="/home" />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;



