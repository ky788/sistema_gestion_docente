"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppContextProps {
  escuela: string;
  curso: string;
  division: string;
  turno: string;
  materia: string;
  historialMaterias: string[];
  setContext: (key: string, value: string) => void;
  isReady: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [escuela, setEscuela] = useState('');
  const [curso, setCurso] = useState('');
  const [division, setDivision] = useState('');
  const [turno, setTurno] = useState('Mañana');
  const [materia, setMateria] = useState('');
  const [historialMaterias, setHistorialMaterias] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedEscuela = localStorage.getItem('escuelaSeleccionada');
    const savedCurso = localStorage.getItem('cursoSeleccionado');
    const savedDivision = localStorage.getItem('divisionSeleccionada');
    const savedTurno = localStorage.getItem('turnoSeleccionado');
    const savedMateria = localStorage.getItem('materiaSeleccionada');
    const savedHistorial = localStorage.getItem('historialMaterias');

    if (savedEscuela) setEscuela(savedEscuela);
    if (savedCurso) setCurso(savedCurso);
    if (savedDivision) setDivision(savedDivision);
    if (savedTurno) setTurno(savedTurno);
    if (savedMateria) setMateria(savedMateria);
    if (savedHistorial) {
      try { setHistorialMaterias(JSON.parse(savedHistorial)); } catch(e) {}
    }
    
    setIsReady(true);
  }, []);

  const setContext = (key: string, value: string) => {
    if (key === 'escuela') { setEscuela(value); localStorage.setItem('escuelaSeleccionada', value); }
    if (key === 'curso') { setCurso(value); localStorage.setItem('cursoSeleccionado', value); }
    if (key === 'division') { setDivision(value); localStorage.setItem('divisionSeleccionada', value); }
    if (key === 'turno') { setTurno(value); localStorage.setItem('turnoSeleccionado', value); }
    if (key === 'materia') { 
      setMateria(value); 
      localStorage.setItem('materiaSeleccionada', value); 
      
      const materiaLimpia = value.trim();
      if (materiaLimpia !== '') {
        setHistorialMaterias(prev => {
          if (!prev.includes(materiaLimpia)) {
            const nuevoHistorial = [...prev, materiaLimpia];
            localStorage.setItem('historialMaterias', JSON.stringify(nuevoHistorial));
            return nuevoHistorial;
          }
          return prev;
        });
      }
    }
  };

  return (
    <AppContext.Provider value={{ escuela, curso, division, turno, materia, historialMaterias, setContext, isReady }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
