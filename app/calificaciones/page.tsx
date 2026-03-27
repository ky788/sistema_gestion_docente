"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function CalificacionesPage() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  const [nuevasNotas, setNuevasNotas] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAlumnos();
  }, []);

  async function fetchAlumnos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('apellido', { ascending: true });

      if (error) throw error;
      if (data) setAlumnos(data);
    } catch (error) {
      console.error('Error obteniendo alumnos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAgregarNota(id: string, notasActuales: number[]) {
    const notaTexto = nuevasNotas[id];
    if (!notaTexto) return;
    const notaNumero = parseInt(notaTexto, 10);
    if (isNaN(notaNumero) || notaNumero < 1 || notaNumero > 10) return;
    
    const notasActualizadas = [...(notasActuales || []), notaNumero];
    try {
      const { error } = await supabase.from('alumnos').update({ notas: notasActualizadas }).eq('id', id);
      if (error) throw error;
      
      setAlumnos(alumnos.map(al => al.id === id ? { ...al, notas: notasActualizadas } : al));
      setNuevasNotas(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      console.error('Error guardando nota:', error);
    }
  }

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Registro de Calificaciones</h1>
          <p className="text-gray-500 mt-2">Gestiona las notas y promedios de tus alumnos.</p>
        </div>
        
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Curso</label>
          <select
            value={cursoFiltro}
            onChange={(e) => setCursoFiltro(e.target.value)}
            className="p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700 shadow-sm"
          >
            <option value="Todos">Todos los Cursos</option>
            {cursosUnicos.map((curso, idx) => (
              <option key={idx} value={curso}>{curso}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-medium flex flex-col items-center gap-4">
             <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
             Cargando planilla de notas...
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest w-1/4">Alumno</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Curso</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest">Historial de Notas</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Promedio</th>
                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Nueva Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {alumnosFiltrados.map((alumno) => {
                    const promedio = alumno.notas?.length > 0 
                      ? (alumno.notas.reduce((a: any, b: any) => a + b, 0) / alumno.notas.length).toFixed(1)
                      : null;

                    return (
                      <tr key={alumno.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="font-bold text-gray-800">{alumno.apellido}, {alumno.nombre}</p>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-lg font-bold tracking-wider uppercase">{alumno.curso}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {alumno.notas?.length > 0 ? (
                              alumno.notas.map((nota: number, i: number) => (
                                <span key={i} className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${nota >= 7 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {nota}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-300 italic text-sm">Sin calificaciones aún</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {promedio ? (
                            <div className="flex flex-col items-center">
                              <span className={`text-xl font-black ${parseFloat(promedio) >= 7 ? 'text-green-600' : 'text-amber-600'}`}>
                                {promedio}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-gray-400">Promedio</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 items-center justify-center max-w-[140px] mx-auto">
                            <input 
                              type="number" 
                              min="1" 
                              max="10" 
                              placeholder="-" 
                              value={nuevasNotas[alumno.id] || ''} 
                              onChange={(e) => setNuevasNotas({ ...nuevasNotas, [alumno.id]: e.target.value })} 
                              className="w-12 h-10 border border-gray-200 rounded-xl text-center font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 shadow-sm" 
                            />
                            <button 
                              onClick={() => handleAgregarNota(alumno.id, alumno.notas)} 
                              disabled={!nuevasNotas[alumno.id]} 
                              className="bg-blue-600 text-white w-10 h-10 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center shadow-md disabled:bg-gray-200 disabled:shadow-none"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50/50">
              {alumnosFiltrados.map((alumno) => {
                const promedio = alumno.notas?.length > 0 
                  ? (alumno.notas.reduce((a: any, b: any) => a + b, 0) / alumno.notas.length).toFixed(1)
                  : null;

                return (
                  <div key={alumno.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg leading-tight">{alumno.nombre} {alumno.apellido}</p>
                        <span className="inline-block mt-2 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">
                          {alumno.curso}
                        </span>
                      </div>
                      
                      {promedio && (
                        <div className="flex flex-col items-end">
                          <span className={`text-2xl font-black ${parseFloat(promedio) >= 7 ? 'text-green-600' : 'text-amber-600'}`}>
                            {promedio}
                          </span>
                          <span className="text-[8px] uppercase font-bold text-gray-400 -mt-1 tracking-tighter">Promedio</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Historial de Notas</label>
                      <div className="flex flex-wrap gap-1.5">
                        {alumno.notas?.length > 0 ? (
                          alumno.notas.map((nota: number, i: number) => (
                            <span key={i} className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm ${nota >= 7 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                              {nota}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300 italic text-xs">Sin notas registradas</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
                      <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        placeholder="Nota" 
                        value={nuevasNotas[alumno.id] || ''} 
                        onChange={(e) => setNuevasNotas({ ...nuevasNotas, [alumno.id]: e.target.value })} 
                        className="flex-1 h-12 border border-gray-200 rounded-xl text-center font-bold text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 shadow-sm text-lg" 
                      />
                      <button 
                        onClick={() => handleAgregarNota(alumno.id, alumno.notas)} 
                        disabled={!nuevasNotas[alumno.id]} 
                        className="bg-blue-600 text-white flex-1 h-12 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center shadow-lg shadow-blue-100 disabled:bg-gray-300 disabled:shadow-none"
                      >
                        Cargar Nota
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
