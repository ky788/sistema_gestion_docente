"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function AsistenciaPage() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistenciasDelDia, setAsistenciasDelDia] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [fechaFiltro, setFechaFiltro] = useState(() => new Date().toISOString().split('T')[0]);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');

  useEffect(() => {
    fetchData();
  }, [fechaFiltro]);

  async function fetchData() {
    try {
      setLoading(true);
      // Obtener todos los alumnos
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('*')
        .order('apellido', { ascending: true });

      if (alumnosError) throw alumnosError;
      if (alumnosData) setAlumnos(alumnosData);

      // Obtener asistencias para la fecha seleccionada
      const { data: asistenciaData, error: asistenciaError } = await supabase
        .from('asistencia')
        .select('*')
        .eq('fecha', fechaFiltro);

      if (asistenciaError) throw asistenciaError;
      
      const mapaAsistencias: Record<string, boolean> = {};
      if (asistenciaData) {
        asistenciaData.forEach(reg => {
          mapaAsistencias[reg.alumno_id] = reg.presente;
        });
      }
      setAsistenciasDelDia(mapaAsistencias);
      
    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarcarAsistencia(alumnoId: string, presente: boolean) {
    try {
      // Revisa si ya existe un registro de asistencia para este alumno en la fecha seleccionada
      const { data: existente } = await supabase
        .from('asistencia')
        .select('id')
        .eq('alumno_id', alumnoId)
        .eq('fecha', fechaFiltro)
        .maybeSingle(); // maybeSingle para no lanzar error si no existe
        
      if (existente) {
        const { error } = await supabase
          .from('asistencia')
          .update({ presente })
          .eq('id', existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('asistencia')
          .insert([{ alumno_id: alumnoId, fecha: fechaFiltro, presente }]);
        if (error) throw error;
      }

      // Actualizar vista local
      setAsistenciasDelDia(prev => ({ ...prev, [alumnoId]: presente }));
    } catch (error: any) {
      console.error('Error guardando asistencia:', error);
      alert('Error guardando asistencia: ' + (error.message || JSON.stringify(error)));
    }
  }

  // Cursos únicos
  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  // Alumnos filtrados
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Toma de Asistencia</h1>

      {/* Controles de Fecha y Curso */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label htmlFor="fecha" className="text-gray-700 font-semibold whitespace-nowrap">Fecha:</label>
          <input 
            type="date" 
            id="fecha"
            value={fechaFiltro}
            onChange={e => setFechaFiltro(e.target.value)}
            className="w-full md:w-48 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label htmlFor="curso" className="text-gray-700 font-semibold whitespace-nowrap">Filtrar por Curso:</label>
          <select 
            id="curso"
            value={cursoFiltro}
            onChange={e => setCursoFiltro(e.target.value)}
            className="w-full md:w-64 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition"
          >
            <option value="Todos">Todos</option>
            {cursosUnicos.map((curso, i) => (
              <option key={i} value={curso}>{curso}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Alumnos */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-6 text-gray-700">Listado para Asistencia</h2>
        {loading ? (
          <p className="text-center text-gray-500 animate-pulse py-8">Cargando...</p>
        ) : alumnosFiltrados.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay alumnos para mostrar.</p>
        ) : (
          <div className="grid gap-3">
            {alumnosFiltrados.map((alumno) => {
              const presenteStatus = asistenciasDelDia[alumno.id];
              return (
                <div key={alumno.id} className="flex flex-col sm:flex-row justify-between items-center p-4 border border-gray-100 rounded-lg hover:shadow-sm transition bg-gray-50/50">
                  <div className="mb-4 sm:mb-0 text-center sm:text-left">
                    <p className="font-semibold text-gray-800 text-lg">{alumno.apellido}, {alumno.nombre}</p>
                    <p className="text-sm text-gray-600 mt-1 uppercase tracking-wider font-medium">{alumno.curso}</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                      onClick={() => handleMarcarAsistencia(alumno.id, true)}
                      className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-medium transition duration-200 ${
                        presenteStatus === true 
                          ? 'bg-green-600 text-white shadow hover:bg-green-700' 
                          : 'bg-white border-2 border-green-200 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      ✅ Presente
                    </button>
                    <button
                      onClick={() => handleMarcarAsistencia(alumno.id, false)}
                      className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-medium transition duration-200 ${
                        presenteStatus === false 
                          ? 'bg-red-600 text-white shadow hover:bg-red-700' 
                          : 'bg-white border-2 border-red-200 text-red-700 hover:bg-red-50'
                      }`}
                    >
                      ❌ Ausente
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
