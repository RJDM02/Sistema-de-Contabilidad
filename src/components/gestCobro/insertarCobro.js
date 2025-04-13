import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InsertarCobro = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    categoria: '',
    cliente_id: '',
    tipo_documento: '',
    documento_id: '',
    registros: [],
    usuario_supervisor: ''
  });

  // Datos obtenidos de la API
  const [clientes, setClientes] = useState([]);
  const [documentosCliente, setDocumentosCliente] = useState([]);
  const [todosDocumentos, setTodosDocumentos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [userRole, setUserRole] = useState('');

  // Obtener token de autenticación y rol de usuario
  const getToken = () => {
    const token = localStorage.getItem('auth');
    const role = localStorage.getItem('role');
    setUserRole(role);
    return token;
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.categoria) newErrors.categoria = 'La categoría es requerida';
    if (!formData.cliente_id) newErrors.cliente_id = 'El cliente es requerido';
    if (!formData.tipo_documento) newErrors.tipo_documento = 'El tipo de documento es requerido';
    if (!formData.documento_id) newErrors.documento_id = 'El documento es requerido';
    if (formData.registros.length === 0) newErrors.registros = 'Debe seleccionar al menos un registro';
    
    // Validación especial para usuarios supervisados
    if (userRole === 'user_Supervisado' && !formData.usuario_supervisor) {
      newErrors.usuario_supervisor = 'Debe seleccionar un supervisor';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 1. Obtener lista de clientes y supervisores al cargar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();
        
        // Obtener clientes
        const clientesResponse = await axios.get('http://localhost:8000/api/list_client/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClientes(clientesResponse.data);
        
        // Obtener todos los documentos
        const documentosResponse = await axios.get('http://localhost:8000/api/listar_documentacion/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTodosDocumentos(documentosResponse.data);

        // Si el usuario es supervisado, obtener lista de supervisores
        if (userRole === 'user_Supervisado') {
          const supervisoresResponse = await axios.get('http://localhost:8000/api/usuario/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Filtrar solo los usuarios con rol de supervisor
          const supervisoresFiltrados = supervisoresResponse.data.filter(
            usuario => usuario.rol.nombre === 'user_Supervisor'
          );
          setSupervisores(supervisoresFiltrados);
        }
        
      } catch (error) {
        toast.error('Error al cargar datos iniciales');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userRole]);

  // 2. Filtrar clientes por categoría seleccionada (1: Terapia, 2: TCM)
  const clientesFiltrados = clientes.filter(cliente => 
    formData.categoria ? cliente.categoria === parseInt(formData.categoria) : true
  );

  // 3. Obtener documentos del cliente seleccionado
  useEffect(() => {
    if (!formData.cliente_id) {
      setDocumentosCliente([]);
      return;
    }

    // Filtrar documentos del cliente seleccionado de la lista completa
    const docsCliente = todosDocumentos.filter(
      doc => doc.cliente.id_cliente === parseInt(formData.cliente_id)
    );
    
    setDocumentosCliente(docsCliente);
    setRegistros([]);
    setFormData(prev => ({ ...prev, documento_id: '', registros: [] }));
  }, [formData.cliente_id, todosDocumentos]);

  // 4. Filtrar documentos por tipo (1: Bille, 2: Terapia)
  const documentosFiltrados = documentosCliente.filter(doc => 
    formData.tipo_documento ? doc.tipo === parseInt(formData.tipo_documento) : true
  );

  // 5. Obtener registros del documento seleccionado
  useEffect(() => {
    const fetchRegistros = async () => {
      if (!formData.documento_id || !formData.cliente_id) {
        setRegistros([]);
        return;
      }
      
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:8000/api/list_client_document/${formData.cliente_id}/`,
          {
            headers: { Authorization: `Bearer ${getToken()}` },
            params: { document_id: formData.documento_id }
          }
        );
        
        // Buscar el documento específico para obtener sus registros
        const docSeleccionado = response.data.documentos.find(
          doc => doc.id === parseInt(formData.documento_id)
        );
        
        setRegistros(docSeleccionado?.contenido_registros || []);
        setFormData(prev => ({ ...prev, registros: [] })); // Resetear selección
      } catch (error) {
        toast.error('Error al cargar registros del documento');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegistros();
  }, [formData.documento_id, formData.cliente_id]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Limpiar errores al cambiar un campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'categoria') {
      setFormData({
        categoria: value,
        cliente_id: '',
        tipo_documento: '',
        documento_id: '',
        registros: [],
        usuario_supervisor: ''
      });
      setDocumentosCliente([]);
      setRegistros([]);
    } 
    else if (name === 'cliente_id') {
      setFormData({
        ...formData,
        cliente_id: value,
        tipo_documento: '',
        documento_id: '',
        registros: [],
        usuario_supervisor: ''
      });
      setRegistros([]);
    }
    else if (name === 'tipo_documento') {
      setFormData({
        ...formData,
        tipo_documento: value,
        documento_id: '',
        registros: [],
        usuario_supervisor: ''
      });
    }
    else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Manejar selección de registros
  const handleSelectRegistro = (registroId) => {
    setFormData(prev => {
      const nuevosRegistros = prev.registros.includes(registroId)
        ? prev.registros.filter(id => id !== registroId)
        : [...prev.registros, registroId];
      
      return { ...prev, registros: nuevosRegistros };
    });
    
    // Limpiar error de registros si se selecciona al menos uno
    if (errors.registros && (formData.registros.length > 0 || (formData.registros.length === 1 && !formData.registros.includes(registroId)))) {
      setErrors(prev => ({ ...prev, registros: '' }));
    }
  };

  // Seleccionar todos los registros
  const selectAllRegistros = () => {
    const todosLosIds = registros.map(r => r.id);
    
    if (formData.registros.length === todosLosIds.length) {
      setFormData(prev => ({ ...prev, registros: [] }));
    } else {
      setFormData(prev => ({ ...prev, registros: todosLosIds }));
    }
    
    // Limpiar error de registros
    if (errors.registros) {
      setErrors(prev => ({ ...prev, registros: '' }));
    }
  };

  // Enviar el cobro
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar formulario antes de enviar
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Preparar los registros completos (no solo los IDs)
      const registrosCompletos = registros.filter(r => 
        formData.registros.includes(r.id)
      );

      // Preparar datos para enviar
      const datosParaEnviar = {
        cliente: parseInt(formData.cliente_id),
        documento: parseInt(formData.documento_id),
        contenido_registro: registrosCompletos.map(r => ({
          id: r.id,
          nombre_completo: r.nombre_completo,
          unidades: r.unidades || 0
        }))
      };

      // Agregar supervisor solo si el usuario es supervisado
      if (userRole === 'user_Supervisado') {
        datosParaEnviar.usuario_supervisor = parseInt(formData.usuario_supervisor);
      }

      // Enviar datos al backend
      await axios.post(
        'http://localhost:8000/api/insertar_cobro/',
        datosParaEnviar,
        {
          headers: { 
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('Cobro registrado correctamente');
      setTimeout(() => navigate('/gestCobro/listarCobros'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al registrar cobro');
      console.error("Error completo:", error);
      if (error.response) {
        console.error("Respuesta del servidor:", error.response.data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mt-4" style={{ marginBottom: '100px' }}>
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2>Registrar Nuevo Cobro</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* 1. Selección de Categoría */}
            <div className="mb-3">
              <label className="form-label">Categoría del Cliente *</label>
              <select
                name="categoria"
                className={`form-select ${errors.categoria ? 'is-invalid' : ''}`}
                value={formData.categoria}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="">Seleccione una categoría</option>
                <option value="1">Terapia</option>
                <option value="2">TCM</option>
              </select>
              {errors.categoria && <div className="invalid-feedback">{errors.categoria}</div>}
            </div>

            {/* 2. Selección de Cliente */}
            <div className="mb-3">
              <label className="form-label">Cliente *</label>
              <select
                name="cliente_id"
                className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                value={formData.cliente_id}
                onChange={handleChange}
                required
                disabled={!formData.categoria || loading}
              >
                <option value="">Seleccione un cliente</option>
                {clientesFiltrados.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
              {errors.cliente_id && <div className="invalid-feedback">{errors.cliente_id}</div>}
            </div>

            {/* 3. Selección de Tipo de Documento */}
            <div className="mb-3">
              <label className="form-label">Tipo de Documento *</label>
              <select
                name="tipo_documento"
                className={`form-select ${errors.tipo_documento ? 'is-invalid' : ''}`}
                value={formData.tipo_documento}
                onChange={handleChange}
                required
                disabled={!formData.cliente_id || loading}
              >
                <option value="">Seleccione un tipo</option>
                <option value="1">Bill</option>
                <option value="2">Terapia</option>
              </select>
              {errors.tipo_documento && <div className="invalid-feedback">{errors.tipo_documento}</div>}
            </div>

            {/* 4. Selección de Documento */}
            <div className="mb-3">
              <label className="form-label">Documento *</label>
              <select
                name="documento_id"
                className={`form-select ${errors.documento_id ? 'is-invalid' : ''}`}
                value={formData.documento_id}
                onChange={handleChange}
                required
                disabled={!formData.tipo_documento || loading || !documentosCliente.length}
              >
                <option value="">Seleccione un documento</option>
                {documentosFiltrados.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nombre_archivo} - {new Date(doc.fecha_creacion).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.documento_id && (
                <div className="invalid-feedback">{errors.documento_id}</div>
              )}
              {documentosFiltrados.length === 0 && formData.tipo_documento && !errors.documento_id && (
                <div className="text-danger mt-1">
                  No hay documentos {formData.tipo_documento === '1' ? 'Bill' : 'Terapia'} para este cliente
                </div>
              )}
            </div>

            {/* 5. Selección de Supervisor (solo para user_Supervisado) */}
            {userRole === 'user_Supervisado' && (
              <div className="mb-3">
                <label className="form-label">Supervisor *</label>
                <select
                  name="usuario_supervisor"
                  className={`form-select ${errors.usuario_supervisor ? 'is-invalid' : ''}`}
                  value={formData.usuario_supervisor}
                  onChange={handleChange}
                  required
                  disabled={loading || supervisores.length === 0}
                >
                  <option value="">Seleccione un supervisor</option>
                  {supervisores.map(supervisor => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.username}
                    </option>
                  ))}
                </select>
                {errors.usuario_supervisor && (
                  <div className="invalid-feedback">{errors.usuario_supervisor}</div>
                )}
                {supervisores.length === 0 && !errors.usuario_supervisor && (
                  <div className="text-danger mt-1">
                    No hay supervisores disponibles
                  </div>
                )}
              </div>
            )}

            {/* 6. Selección de Registros */}
            {registros.length > 0 && (
              <div className="mb-4">
                <label className="form-label">Registros *</label>
                <div 
                  className={`border p-3 rounded ${errors.registros ? 'border-danger' : ''}`}
                  style={{ 
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginBottom: '20px'
                  }}
                >
                  <div className="form-check mb-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="selectAll"
                      checked={formData.registros.length === registros.length && registros.length > 0}
                      onChange={selectAllRegistros}
                    />
                    <label className="form-check-label" htmlFor="selectAll">
                      <strong>Seleccionar todos</strong>
                    </label>
                  </div>
                  
                  {registros.map(registro => (
                    <div key={registro.id} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`registro-${registro.id}`}
                        checked={formData.registros.includes(registro.id)}
                        onChange={() => handleSelectRegistro(registro.id)}
                      />
                      <label className="form-check-label" htmlFor={`registro-${registro.id}`}>
                        {registro.nombre_completo}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.registros && (
                  <div className="text-danger">{errors.registros}</div>
                )}
                <small className="text-muted">
                  {formData.registros.length} de {registros.length} registros seleccionados
                </small>
              </div>
            )}

            {/* Botones */}
            <div 
              className="d-flex justify-content-between mt-4"
              style={{
                position: 'sticky',
                bottom: '0',
                backgroundColor: 'white',
                padding: '15px 0',
                borderTop: '1px solid #dee2e6',
                marginTop: '20px'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/gestCobro/listarCobros')}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </>
                ) : 'Registrar Cobro'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default InsertarCobro;