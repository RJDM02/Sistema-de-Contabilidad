import React, { useEffect, useState } from 'react';
import './InactivityDetector.css'; 

const InactivityDetector = ({ 
  children, 
  onLogout, 
  inactivityTime = 5, // minutos
  warningTime = 1, // minutos
  showWarning = true 
}) => {
  const [remainingTime, setRemainingTime] = useState(null);
  const [isWarningVisible, setIsWarningVisible] = useState(false);

  // Convertir minutos a milisegundos
  const totalInactivityMs = inactivityTime * 60 * 1000;
  const warningTimeMs = warningTime * 60 * 1000;

  useEffect(() => {
    let inactivityTimer;
    let warningTimer;
    let intervalTimer;

    const startTimers = () => {
      // Limpiar timers existentes
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(intervalTimer);
      setIsWarningVisible(false);

      // Timer para mostrar advertencia
      if (showWarning) {
        warningTimer = setTimeout(() => {
          setIsWarningVisible(true);
          startCountdown();
        }, totalInactivityMs - warningTimeMs);
      }

      // Timer para cerrar sesión
      inactivityTimer = setTimeout(() => {
        onLogout();
      }, totalInactivityMs);
    };

    const startCountdown = () => {
      const endTime = Date.now() + warningTimeMs;
      intervalTimer = setInterval(() => {
        const timeLeft = Math.round((endTime - Date.now()) / 1000);
        setRemainingTime(timeLeft > 0 ? timeLeft : 0);
        
        if (timeLeft <= 0) {
          clearInterval(intervalTimer);
        }
      }, 1000);
    };

    const resetTimers = () => {
      startTimers();
    };

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown', 'mousemove', 'keydown', 
      'scroll', 'touchstart', 'click'
    ];

    // Agregar listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimers);
    });

    // Iniciar timers
    startTimers();

    // Limpieza
    return () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(intervalTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [onLogout, totalInactivityMs, warningTimeMs, showWarning]);

  const handleStayLoggedIn = () => {
    setIsWarningVisible(false);
    setRemainingTime(null);
  };

  return (
    <>
      {isWarningVisible && (
        <div className="inactivity-warning-overlay">
          <div className="inactivity-warning-modal">
            <h3>Sesión por expirar</h3>
            <p>
              Tu sesión se cerrará automáticamente por inactividad en {remainingTime} segundos.
            </p>
            <div className="warning-actions">
              <button 
                className="warning-button continue-btn"
                onClick={handleStayLoggedIn}
              >
                Continuar sesión
              </button>
              <button 
                className="warning-button logout-btn"
                onClick={onLogout}
              >
                Cerrar sesión ahora
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default InactivityDetector;