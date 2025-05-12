import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InsertarDocumentacion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  
  // Estados para los formularios
  const [formData, setFormData] = useState({
    tipo_documento: '',
    tipo_cliente: '',
    cliente_id: '',
    archivos: [],
    bill: false,
    notas: false
  });
  
  // Estados para los datos
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  
  // Tipos disponibles
  const tiposDocumento = [
    { id: 1, nombre: 'Terapia' },
    { id: 2, nombre: 'Bill' }
  ];
  
  const tiposCliente = [
    { id: 1, nombre: 'Terapia' },
    { id: 2, nombre: 'TCM' }
  ];

  // Obtener clientes al cargar el componente
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth');
        const response = await axios.get('https://sistemacontable-wico.onrender.com/api/list_client/', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const clientesOrdenados = response.data.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setClientes(clientesOrdenados);
      } catch (error) {
        console.error('Error al obtener clientes:', error);
        setError('Error al cargar la lista de clientes');
        toast.error('Error al cargar los clientes');
      } finally {
        setLoading(false);
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
      archivos: Array.from(e.target.files)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setUploadResults(null);
    
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
      if (formData.archivos.length === 0) {
        throw new Error('Seleccione al menos un archivo');
      }
      
      // Crear FormData para la subida
      const data = new FormData();
      data.append('tipo_documento', formData.tipo_documento);
      data.append('cliente_id', formData.cliente_id);
      data.append('bill', formData.bill);
      data.append('notas', formData.notas);
      
      // Agregar cada archivo al FormData
      formData.archivos.forEach((archivo, index) => {
        data.append(`archivo`, archivo);
      });
      
      const response = await axios.post(
        'https://sistemacontable-wico.onrender.com/api/procesar_excel/',
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setUploadResults(response.data);
      setSuccess(true);
      
      if (response.data.archivos_fallidos > 0) {
        toast.warning(`Procesamiento completado con ${response.data.archivos_fallidos} archivo(s) fallidos`);
      } else {
        toast.success('Todos los documentos fueron procesados exitosamente');
      }
      
    } catch (error) {
      console.error('Error al subir documentos:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al subir documentos';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (!uploadResults) return null;
    
    return (
      <div className="mt-4">
        <h4>Resultados del Procesamiento</h4>
        <div className="alert alert-info">
          <strong>Estado:</strong> {uploadResults.status === 'completed' ? 'Completado' : uploadResults.status}<br />
          <strong>Archivos procesados:</strong> {uploadResults.archivos_procesados}<br />
          <strong>Archivos fallidos:</strong> {uploadResults.archivos_fallidos}<br />
          <strong>Es Bill:</strong> {formData.bill ? 'Sí' : 'No'}<br />
          <strong>Es Notas:</strong> {formData.notas ? 'Sí' : 'No'}
        </div>
        
        {uploadResults.resultados_individuales?.length > 0 && (
          <div className="mb-4">
            <h5>Archivos procesados exitosamente:</h5>
            {uploadResults.resultados_individuales.map((item, index) => (
              <div key={index} className="card mb-3">
                <div className={`card-header ${item.resultado.status === 'success' ? 'bg-success' : 'bg-warning'} text-white`}>
                  {item.archivo} - {item.resultado.status === 'success' ? 'Éxito' : 'Éxito parcial'}
                </div>
                <div className="card-body">
                  <p><strong>Cliente ID:</strong> {item.resultado.cliente_id}</p>
                  <p><strong>Documento ID:</strong> {item.resultado.documento_id}</p>
                  <p><strong>Registros creados:</strong> {item.resultado.registros_creados}</p>
                  <p><strong>Filas omitidas:</strong> {item.resultado.filas_omitidas}</p>
                  <p><strong>Hoja procesada:</strong> {item.resultado.hoja_procesada}</p>
                  <p><strong>Rango de filas:</strong> {item.resultado.rango_filas}</p>
                  <p><strong>Fecha procesada:</strong> {item.resultado.fecha_procesada}</p>
                  <p><strong>Es Bill:</strong> {formData.bill ? 'Sí' : 'No'}</p>
                  <p><strong>Es Notas:</strong> {formData.notas ? 'Sí' : 'No'}</p>
                  
                  {item.resultado.errores?.length > 0 && (
                    <div className="mt-3">
                      <h6>Errores:</h6>
                      <ul className="list-group">
                        {item.resultado.errores.map((error, errIndex) => (
                          <li key={errIndex} className="list-group-item list-group-item-danger">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {uploadResults.errores?.length > 0 && (
          <div className="mb-4">
            <h5>Archivos con errores:</h5>
            <ul className="list-group">
              {uploadResults.errores.map((errorItem, index) => (
                <li key={index} className="list-group-item list-group-item-danger">
                  <strong>{errorItem.archivo}:</strong> {errorItem.error}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="d-flex justify-content-end">
          <button
            className="btn btn-primary"
            onClick={() => {
              setUploadResults(null);
              setFormData(prev => ({
                ...prev,
                archivos: [],
                bill: false,
                notas: false
              }));
              document.getElementById('archivos').value = '';
            }}
          >
            Subir más documentos
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mt-4">
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Insertar Documentación</h2>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {success && uploadResults && renderResults()}
          
          {!uploadResults && (
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
              
              {/* Checkbox para Bill */}
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  id="bill"
                  name="bill"
                  className="form-check-input"
                  checked={formData.bill}
                  onChange={(e) => setFormData(prev => ({ ...prev, bill: e.target.checked }))}
                />
                <label htmlFor="bill" className="form-check-label">
                  Hacemos el Bill
                </label>
              </div>
              
              {/* Checkbox para Notas */}
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  id="notas"
                  name="notas"
                  className="form-check-input"
                  checked={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.checked }))}
                />
                <label htmlFor="notas" className="form-check-label">
                  Se sube al  Sistema
                </label>
              </div>
              
              {/* Archivos (múltiples) */}
              <div className="mb-4">
                <label htmlFor="archivos" className="form-label">
                  Documentos *
                </label>
                <input
                  type="file"
                  id="archivos"
                  name="archivos"
                  className="form-control"
                  onChange={handleFileChange}
                  accept=".xls,.xlsx,.xlsm"
                  multiple
                  required
                />
                <div className="form-text">
                  Seleccione uno o más documentos a subir (formatos permitidos: .xls, .xlsx)
                </div>
                {formData.archivos.length > 0 && (
                  <div className="mt-2">
                    <strong>Archivos seleccionados:</strong>
                    <ul className="list-group mt-2">
                      {formData.archivos.map((file, index) => (
                        <li key={index} className="list-group-item">
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                  ) : 'Subir Documentos'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsertarDocumentacion;