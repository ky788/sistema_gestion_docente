"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function AsistenciaPage() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistenciasDelDia, setAsistenciasDelDia] = useState<Record<string, { presente: boolean; tardanza: boolean }>>({});
  const [historialMensual, setHistorialMensual] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [fechaFiltro, setFechaFiltro] = useState(() => new Date().toISOString().split('T')[0]);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');

  // Estado para el Modal de Historial
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [fechaFiltro]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // 1. Obtener Alumnos
      const { data: alumnosData, error: alumnosError } = await supabase
        .from('alumnos')
        .select('*')
        .order('apellido', { ascending: true });

      if (alumnosError) throw alumnosError;
      if (alumnosData) setAlumnos(alumnosData);

      // 2. Obtener Asistencias del día actual
      const { data: asistenciaData, error: asistenciaError } = await supabase
        .from('asistencia')
        .select('*')
        .eq('fecha', fechaFiltro);

      if (asistenciaError) throw asistenciaError;
      
      const mapaAsistencias: Record<string, { presente: boolean; tardanza: boolean }> = {};
      if (asistenciaData) {
        asistenciaData.forEach(reg => {
          mapaAsistencias[reg.alumno_id] = { presente: reg.presente, tardanza: reg.tardanza || false };
        });
      }
      setAsistenciasDelDia(mapaAsistencias);

      // 3. Obtener Historial del mes actual para cálculos
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const { data: historialData, error: historialError } = await supabase
        .from('asistencia')
        .select('*')
        .gte('fecha', firstDayOfMonth);

      if (historialError) throw historialError;

      const mapaHistorial: Record<string, any[]> = {};
      if (historialData) {
        historialData.forEach(reg => {
          if (!mapaHistorial[reg.alumno_id]) mapaHistorial[reg.alumno_id] = [];
          mapaHistorial[reg.alumno_id].push(reg);
        });
      }
      setHistorialMensual(mapaHistorial);

    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarcarAsistencia(alumnoId: string, tipo: 'P' | 'A' | 'T') {
    const presente = tipo !== 'A';
    const tardanza = tipo === 'T';

    try {
      const { data: existente } = await supabase
        .from('asistencia')
        .select('id')
        .eq('alumno_id', alumnoId)
        .eq('fecha', fechaFiltro)
        .maybeSingle();
        
      if (existente) {
        const { error } = await supabase.from('asistencia')
          .update({ presente, tardanza })
          .eq('id', existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('asistencia')
          .insert([{ alumno_id: alumnoId, fecha: fechaFiltro, presente, tardanza }]);
        if (error) throw error;
      }
      
      // Actualizar estado local del día
      setAsistenciasDelDia(prev => ({ ...prev, [alumnoId]: { presente, tardanza } }));
      
      // Refrescar historial para actualizar el contador mensual
      fetchData(); 
    } catch (error: any) {
      console.error('Error guardando asistencia:', error);
    }
  }

  const calcularInasistencias = (alumnoId: string) => {
    const registros = historialMensual[alumnoId] || [];
    const ausentes = registros.filter(r => !r.presente).length;
    const tardanzas = registros.filter(r => r.presente && r.tardanza).length;
    return ausentes + Math.floor(tardanzas / 4);
  };

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-black mb-8 text-slate-800 text-center tracking-tight">Toma de Asistencia</h1>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Registro</label>
          <input 
            type="date" 
            value={fechaFiltro} 
            onChange={e => setFechaFiltro(e.target.value)} 
            className="w-full md:w-56 p-3 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-slate-50 font-bold text-slate-700 transition-all outline-none" 
          />
        </div>
        
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Curso</label>
          <select 
            value={cursoFiltro} 
            onChange={e => setCursoFiltro(e.target.value)} 
            className="w-full md:w-64 p-3 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white font-bold text-slate-700 transition-all outline-none"
          >
            <option value="Todos">Todos los Cursos</option>
            {cursosUnicos.map((curso, i) => (
              <option key={i} value={curso}>{curso}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTADO DE ALUMNOS */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Sincronizando datos con la nube...
          </div>
        ) : alumnosFiltrados.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold text-lg">No se encontraron alumnos para este criterio.</p>
          </div>
        ) : (
          alumnosFiltrados.map((alumno) => {
            const status = asistenciasDelDia[alumno.id];
            const inasistenciasMes = calcularInasistencias(alumno.id);
            
            return (
              <div key={alumno.id} className="bg-white hover:bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm transition-all flex flex-col md:flex-row items-center justify-between gap-4 group">
                {/* Info Alumno */}
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                  <div 
                    onClick={() => setAlumnoSeleccionado(alumno)}
                    className="cursor-pointer group-hover:translate-x-1 transition-transform"
                  >
                    <p className="font-black text-slate-800 text-lg md:text-xl leading-tight text-center md:text-left">
                      {alumno.apellido.toLowerCase()}, {alumno.nombre.toLowerCase()}
                    </p>
                    <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {alumno.curso}
                    </span>
                  </div>
                </div>

                {/* Badge Inasistencias */}
                <div className="flex flex-col items-center justify-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 w-full md:w-32">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Inasistencias</span>
                   <span className={`text-xl font-black ${inasistenciasMes > 10 ? 'text-red-600' : 'text-slate-800'}`}>
                    {inasistenciasMes}
                   </span>
                </div>
                
                {/* Botones de Acción */}
                <div className="flex gap-2 w-full md:w-auto h-12 md:h-14">
                  <button
                    onClick={() => handleMarcarAsistencia(alumno.id, 'P')}
                    className={`flex-1 md:w-28 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                      status?.presente && !status?.tardanza
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105' 
                        : 'bg-white border-2 border-emerald-100 text-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="md:hidden">P</span>
                    <span className="hidden md:inline">Presente</span>
                  </button>
                  
                  <button
                    onClick={() => handleMarcarAsistencia(alumno.id, 'T')}
                    className={`flex-1 md:w-28 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                      status?.presente && status?.tardanza
                        ? 'bg-amber-400 text-white shadow-lg shadow-amber-100 scale-105' 
                        : 'bg-white border-2 border-amber-100 text-amber-500 hover:bg-amber-50'
                    }`}
                  >
                    <span className="md:hidden">T</span>
                    <span className="hidden md:inline">Tardanza</span>
                  </button>

                  <button
                    onClick={() => handleMarcarAsistencia(alumno.id, 'A')}
                    className={`flex-1 md:w-28 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                      status?.presente === false 
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-100 scale-105' 
                        : 'bg-white border-2 border-rose-100 text-rose-500 hover:bg-rose-50'
                    }`}
                  >
                    <span className="md:hidden">A</span>
                    <span className="hidden md:inline">Ausente</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL HISTORIAL */}
      {alumnoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{alumnoSeleccionado.apellido}, {alumnoSeleccionado.nombre}</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Historial del Mes</p>
              </div>
              <button 
                onClick={() => setAlumnoSeleccionado(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {(historialMensual[alumnoSeleccionado.id] || []).sort((a,b) => b.fecha.localeCompare(a.fecha)).map((reg, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-600">{reg.fecha.split('-').reverse().join('/')}</span>
                  <div className="flex items-center gap-2">
                    {!reg.presente ? (
                      <span className="bg-rose-100 text-rose-600 text-[10px] font-black uppercase px-3 py-1 rounded-full">Ausente</span>
                    ) : reg.tardanza ? (
                      <span className="bg-amber-100 text-amber-600 text-[10px] font-black uppercase px-3 py-1 rounded-full">Tardanza</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase px-3 py-1 rounded-full">Presente</span>
                    )}
                  </div>
                </div>
              ))}
              {(!historialMensual[alumnoSeleccionado.id] || historialMensual[alumnoSeleccionado.id].length === 0) && (
                <p className="text-center py-10 text-slate-400 font-bold">Sin registros este mes.</p>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
               <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Presentes</p>
                    <p className="text-lg font-black text-emerald-600 text-center">
                      {(historialMensual[alumnoSeleccionado.id] || []).filter(r => r.presente && !r.tardanza).length}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tardanzas</p>
                    <p className="text-lg font-black text-amber-500">
                      {(historialMensual[alumnoSeleccionado.id] || []).filter(r => r.presente && r.tardanza).length}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Ausentes</p>
                    <p className="text-lg font-black text-rose-500">
                      {(historialMensual[alumnoSeleccionado.id] || []).filter(r => !r.presente).length}
                    </p>
                  </div>
               </div>
               
               <div className="bg-slate-800 text-white p-5 rounded-2xl flex justify-between items-center shadow-lg shadow-slate-200">
                  <span className="font-black uppercase tracking-widest text-xs">Inasistencias Totales</span>
                  <span className="text-3xl font-black">{calcularInasistencias(alumnoSeleccionado.id)}</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
