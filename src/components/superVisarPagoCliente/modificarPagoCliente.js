import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Typography, IconButton, Collapse, Box, TablePagination
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import axios from 'axios';

const ModificarPagosClientes = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(7);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const token = localStorage.getItem('auth');
        const response = await axios.get('https://sistemacontable-wico.onrender.com/api/historial_fondo/', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Agrupar por cliente manteniendo los valores exactos
        const historialPorCliente = response.data.reduce((acc, pago) => {
          if (!acc[pago.cliente_id]) {
            acc[pago.cliente_id] = {
              id: pago.cliente_id,
              nombre_cliente: pago.cliente_nombre,
              pagos: [],
            };
          }
          // Agregamos el pago exactamente como viene del backend
          acc[pago.cliente_id].pagos.push({
            id: pago.id,
            fecha: pago.fecha,
            monto: pago.fondo, // Valor exacto sin modificar
          });
          return acc;
        }, {});

        // Convertir a array y ordenar alfabéticamente por nombre de cliente
        const sortedData = Object.values(historialPorCliente).sort((a, b) => 
          a.nombre_cliente.localeCompare(b.nombre_cliente)
        );

        setHistorial(sortedData);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };

    fetchHistorial();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleRow = (clienteId) => {
    setExpandedRows(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
  };

  if (loading) return <Typography>Cargando historial de pagos...</Typography>;
  if (error) return <Typography color="error">Error: {error}</Typography>;

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '10px', boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="historial de fondos de clientes">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ width: 50, fontWeight: 'bold', backgroundColor: '#3f51b5', color: 'white' }} />
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#3f51b5', color: 'white' }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#3f51b5', color: 'white' }}>Cantidad de Registros</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historial.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((cliente) => (
              <React.Fragment key={cliente.id}>
                <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                  <TableCell>
                    <IconButton
                      aria-label="expand row"
                      size="small"
                      onClick={() => toggleRow(cliente.id)}
                    >
                      {expandedRows[cliente.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: '500' }}>{cliente.nombre_cliente}</TableCell>
                  <TableCell>{cliente.pagos.length}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={3}>
                    <Collapse in={expandedRows[cliente.id]} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 1 }}>
                        <Typography variant="subtitle1" gutterBottom component="div">
                          Detalle de Fondos
                        </Typography>
                        <Table size="small" sx={{ backgroundColor: '#f9f9f9' }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Monto</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {cliente.pagos.map((pago, index) => (
                              <TableRow key={`${pago.id}-${index}`}>
                                <TableCell>{new Date(pago.fecha).toLocaleDateString()}</TableCell>
                                <TableCell sx={{ color: '#2e7d32' }}>
                                  ${pago.monto.toFixed(2)} {/* Mostramos el valor exacto */}
                                </TableCell>
                                <TableCell>
                                  {/* Espacio para acciones si las necesitas */}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[7, 14, 25]}
        component="div"
        count={historial.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ backgroundColor: '#f5f5f5' }}
      />
    </Paper>
  );
};

export default ModificarPagosClientes;