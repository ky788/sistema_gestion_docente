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
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('*')
        .order('apellido', { ascending: true });

      if (alumnosError) throw alumnosError;
      if (alumnosData) setAlumnos(alumnosData);

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
      const { data: existente } = await supabase
        .from('asistencia')
        .select('id')
        .eq('alumno_id', alumnoId)
        .eq('fecha', fechaFiltro)
        .maybeSingle();
        
      if (existente) {
        const { error } = await supabase.from('asistencia').update({ presente }).eq('id', existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('asistencia').insert([{ alumno_id: alumnoId, fecha: fechaFiltro, presente }]);
        if (error) throw error;
      }
      setAsistenciasDelDia(prev => ({ ...prev, [alumnoId]: presente }));
    } catch (error: any) {
      console.error('Error guardando asistencia:', error);
    }
  }

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Toma de Asistencia</h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</label>
          <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="w-full md:w-48 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium" />
        </div>
        
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filtrar por Curso</label>
          <select value={cursoFiltro} onChange={e => setCursoFiltro(e.target.value)} className="w-full md:w-64 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium">
            <option value="Todos">Todos</option>
            {cursosUnicos.map((curso, i) => (
              <option key={i} value={curso}>{curso}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-medium flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Cargando listado para hoy...
          </div>
        ) : alumnosFiltrados.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 py-20">No hay alumnos seleccionados.</p>
        ) : (
          alumnosFiltrados.map((alumno) => {
            const presenteStatus = asistenciasDelDia[alumno.id];
            return (
              <div key={alumno.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg text-gray-800">{alumno.apellido}, {alumno.nombre}</p>
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mt-1 bg-blue-50 px-2 py-0.5 rounded-lg inline-block">{alumno.curso}</p>
                  </div>
                  {presenteStatus !== undefined && (
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${presenteStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {presenteStatus ? 'Marcado: Presente' : 'Marcado: Ausente'}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 h-14">
                  <button
                    onClick={() => handleMarcarAsistencia(alumno.id, true)}
                    className={`rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      presenteStatus === true 
                        ? 'bg-green-600 text-white shadow-lg shadow-green-200 scale-[1.02]' 
                        : 'bg-white border-2 border-green-200 text-green-600 active:bg-green-50'
                    }`}
                  >
                    <span className="text-xl">✅</span>
                    Presente
                  </button>
                  <button
                    onClick={() => handleMarcarAsistencia(alumno.id, false)}
                    className={`rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      presenteStatus === false 
                        ? 'bg-red-600 text-white shadow-lg shadow-red-200 scale-[1.02]' 
                        : 'bg-white border-2 border-gray-200 text-gray-600 active:bg-red-50'
                    }`}
                  >
                    <span className="text-xl">❌</span>
                    Ausente
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
