import React from "react";
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import RequireAuth from "./components/RequireAuth"; 
import InactivityDetector from "./components/InactivityDetector";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

// Componentes globales
import Login from "./components/global/login";
import Home from "./components/global/home";
import Changerpassword from "./components/global/changerpassword";
import Navbar from "./components/global/navbar";
import Unauthorized from "./components/global/unauthorized";
import MontosExtra from "./components/global/monto_extra";

// Componentes de gestión
import ListaUsuarios from "./components/gestRol/listaUsuarios";
import ModificarRol from "./components/gestRol/modificarRol";
import ListaTrabajadores from "./components/gestTrabajador/listaTrabajadores";
import InsertarTrabajador from "./components/gestTrabajador/insertarTrabajador";
import ModificarTrabajador from "./components/gestTrabajador/modificarTrabajador";
import ListarClientes from "./components/gestCliente/listarClientes";
import InsertarCliente from "./components/gestCliente/insertarCliente";
import ModificarCliente from "./components/gestCliente/modificarCliente";
import ListarCobros from "./components/gestCobro/listarCobros";
import InsertarCobro from "./components/gestCobro/insertarCobro";
import ModificarCobro from "./components/gestCobro/modificarCobro";
import ListarDocumentacion from "./components/gestDocumentacion/listarDocumentacion";
import InsertarDocumentacion from "./components/gestDocumentacion/insertarDocumentacion";
import ModificarDocumentacion from "./components/gestDocumentacion/modificarDocumentacion";
import ListarPagosCobros from "./components/gestPago/listarPagosCobros";
import InsertarPagoCobros from "./components/gestPago/insertarPagoCobros";
import ModificarPagosCobros from "./components/gestPago/modificarPagosCobros";
import ListarPagosCobrosDetallados from "./components/gestPago/listarPagosCobrosDetallados";
import ListarRegistrosDeCobros from "./components/gestPago/listarRegistrosDeCobros";
import ListarPagosClientes from "./components/superVisarPagoCliente/listarPagosClientes";
import ModificarPagoCliente from "./components/superVisarPagoCliente/modificarPagoCliente";
import ComparativaTotalCobrar from "./components/superVisarPagoCliente/comparativaTotalCobrar";
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

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        {/* Rutas protegidas */}
        <Route element={<RequireAuth allowedRoles={["SuperAdmin", "Admin", "user_User", "user_Supervisor", "user_Supervisado"]} />}>
          <Route path="/home" element={<Home />} />
          <Route path="/changerPassword" element={<Changerpassword />} />
          <Route path="/monto_extra" element={<MontosExtra />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["Admin", "user_User", "user_Supervisor", "user_Supervisado"]} />}>
          <Route path="/gestCobro/listarCobros" element={<ListarCobros />} />
          <Route path="/gestCobro/insertarCobro" element={<InsertarCobro />} />
          <Route path="/gestCobro/modificarCobro/:id" element={<ModificarCobro />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["SuperAdmin"]} />}>
          <Route path="/gestRol/listaUsuarios" element={<ListaUsuarios />} />
          <Route path="/modificarRol/:id" element={<ModificarRol />} />
          <Route path="/superVisarPagoCliente/listarPagosClientes" element={<ListarPagosClientes />} />
          <Route path="/superVisarPagoCliente/modificarPagoCliente/" element={<ModificarPagoCliente />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={["SuperAdmin", "Admin"]} />}>
          <Route path="/gestTrabajador/listaTrabajadores" element={<ListaTrabajadores />} />
          <Route path="/gestTrabajador/insertarTrabajador" element={<InsertarTrabajador />} />
          <Route path="/gestTrabajador/modificarTrabajador/:id" element={<ModificarTrabajador />} />
          <Route path="/gestAgencia/listarAgencias" element={<ListarAgencias />} />
          <Route path="/gestAgencia/insertarAgencia" element={<InsertarAgencia />} />
          <Route path="/gestCliente/listarClientes" element={<ListarClientes />} />
          <Route path="/gestCliente/insertarCliente" element={<InsertarCliente />} />
          <Route path="/gestCliente/modificarCliente/:id" element={<ModificarCliente />} />
          <Route path="/gestDocumentacion/listarDocumentacion" element={<ListarDocumentacion />} />
          <Route path="/gestDocumentacion/insertarDocumentacion" element={<InsertarDocumentacion />} />
          <Route path="/gestDocumentacion/modificarDocumentacion/:id" element={<ModificarDocumentacion />} />
          <Route path="/gestPago/listarPagosCobros" element={<ListarPagosCobros />} />
          <Route path="/gestPago/insertarPagoCobros" element={<InsertarPagoCobros />} />
          <Route path="/gestPago/modificarPagoCobros/:id" element={<ModificarPagosCobros />} />
          <Route path="/gestPago/listarPagosCobrosDetallados/:userId" element={<ListarPagosCobrosDetallados />} />
          <Route path="/gestPago/listarRegistrosDeCobros/:cobroId" element={<ListarRegistrosDeCobros />} />
          <Route path="/superVisarPagoCliente/comparativaTotalCobrar" element={<ComparativaTotalCobrar/>} />
        </Route>

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <InactivityDetector inactivityTime={30} warningTime={10}>
        <AppRoutes />
      </InactivityDetector>
    </Router>
  );
}

export default App;



