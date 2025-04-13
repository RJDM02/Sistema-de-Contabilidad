import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const InsertarDocumentacion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Estados para los formularios
  const [formData, setFormData] = useState({
    tipo_documento: '',
    tipo_cliente: '',
    cliente_id: '',
    archivo: null
  });
  
  // Estados para los datos
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  
  // Tipos disponibles
  const tiposDocumento = [
    { id: 1, nombre: 'Bill' },
    { id: 2, nombre: 'Documento de Terapi' }
  ];
  
  const tiposCliente = [
    { id: 1, nombre: 'Terapia' },
    { id: 2, nombre: 'TCM' }
  ];

  // Obtener clientes al cargar el componente
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const token = localStorage.getItem('auth');
        const response = await axios.get('http://localhost:8000/api/list_client/', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setClientes(response.data);
      } catch (error) {
        console.error('Error al obtener clientes:', error);
        setError('Error al cargar la lista de clientes');
      }
    };
    
    fetchClientes();
  }, []);

  // Filtrar clientes cuando cambia el tipo de cliente
  useEffect(() => {
    if (formData.tipo_cliente) {
      const filtered = clientes.filter(cliente => 
        cliente.categoria === parseInt(formData.tipo_cliente)
      );
      setFilteredClientes(filtered);
    } else {
      setFilteredClientes([]);
    }
  }, [formData.tipo_cliente, clientes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Resetear cliente seleccionado si cambia el tipo de cliente
    if (name === 'tipo_cliente') {
      setFormData(prev => ({
        ...prev,
        cliente_id: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      archivo: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const token = localStorage.getItem('auth');
      
      // Validaciones
      if (!formData.tipo_documento) {
        throw new Error('Seleccione el tipo de documento');
      }
      if (!formData.tipo_cliente) {
        throw new Error('Seleccione el tipo de cliente');
      }
      if (!formData.cliente_id) {
        throw new Error('Seleccione un cliente');
      }
      if (!formData.archivo) {
        throw new Error('Seleccione un archivo');
      }
      
      // Crear FormData para la subida
      const data = new FormData();
      data.append('tipo_documento', formData.tipo_documento);
      data.append('cliente_id', formData.cliente_id);
      data.append('archivo', formData.archivo);
      
      const response = await axios.post(
        'http://localhost:8000/api/procesar_excel/',
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setSuccess(true);
      setTimeout(() => navigate('/gestDocumentacion/listarDocumentacion'), 2000);
    } catch (error) {
      console.error('Error al subir documento:', error);
      setError(error.response?.data?.message || error.message || 'Error al subir documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Insertar Documentación</h2>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {success && (
            <div className="alert alert-success">
              Documento subido correctamente. Redirigiendo...
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Tipo de Documento */}
            <div className="mb-3">
              <label htmlFor="tipo_documento" className="form-label">
                Tipo de Documento *
              </label>
              <select
                id="tipo_documento"
                name="tipo_documento"
                className="form-select"
                value={formData.tipo_documento}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un tipo</option>
                {tiposDocumento.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Tipo de Cliente */}
            <div className="mb-3">
              <label htmlFor="tipo_cliente" className="form-label">
                Tipo de Cliente *
              </label>
              <select
                id="tipo_cliente"
                name="tipo_cliente"
                className="form-select"
                value={formData.tipo_cliente}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un tipo</option>
                {tiposCliente.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Cliente */}
            <div className="mb-3">
              <label htmlFor="cliente_id" className="form-label">
                Cliente *
              </label>
              <select
                id="cliente_id"
                name="cliente_id"
                className="form-select"
                value={formData.cliente_id}
                onChange={handleChange}
                disabled={!formData.tipo_cliente}
                required
              >
                <option value="">Seleccione un cliente</option>
                {filteredClientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Archivo */}
            <div className="mb-4">
              <label htmlFor="archivo" className="form-label">
                Documento *
              </label>
              <input
                type="file"
                id="archivo"
                name="archivo"
                className="form-control"
                onChange={handleFileChange}
                required
              />
              <div className="form-text">
                Seleccione el documento a subir (formato permitido: .xls, .xlsx)
              </div>
            </div>
            
            {/* Botones */}
            <div className="d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/gestDocumentacion/listarDocumentacion')}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Procesando...
                  </>
                ) : 'Subir Documento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InsertarDocumentacion;