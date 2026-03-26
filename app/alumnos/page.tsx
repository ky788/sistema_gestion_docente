"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

// 1. Configuración de meses del ciclo lectivo
const MESES = [
  { nombre: 'Marzo', valor: '2026-03-01' },
  { nombre: 'Abril', valor: '2026-04-01' },
  { nombre: 'Mayo', valor: '2026-05-01' },
  { nombre: 'Junio', valor: '2026-06-01' },
  { nombre: 'Julio', valor: '2026-07-01' },
  { nombre: 'Agosto', valor: '2026-08-01' },
  { nombre: 'Septiembre', valor: '2026-09-01' },
  { nombre: 'Octubre', valor: '2026-10-01' },
  { nombre: 'Noviembre', valor: '2026-11-01' },
  { nombre: 'Diciembre', valor: '2026-12-01' },
];

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [tps, setTps] = useState<any[]>([]);
  
  // 2. Estado para el mes seleccionado
  const [mesSeleccionado, setMesSeleccionado] = useState(MESES[0].valor);
  
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [curso, setCurso] = useState('');
  const [loading, setLoading] = useState(true);
  const [cursoFiltro, setCursoFiltro] = useState('Todos');
  const [nuevasNotas, setNuevasNotas] = useState<Record<string, string>>({});

  const nombreMesSeleccionado = MESES.find(m => m.valor === mesSeleccionado)?.nombre || 'Mes';

  // 3. Efecto para recargar datos al cambiar de mes
  useEffect(() => {
    fetchAlumnos();
  }, [mesSeleccionado]);

  async function fetchAlumnos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) throw error;
      if (data) setAlumnos(data);

      const { data: asisData } = await supabase.from('asistencia').select('*');
      if (asisData) setAsistencias(asisData);

      // 4. Consulta de TPs filtrada por mes
      const { data: tpData } = await supabase
        .from('trabajos_practicos')
        .select('*')
        .eq('mes', mesSeleccionado);
      if (tpData) setTps(tpData);
    } catch (error) {
      console.error('Error obteniendo datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .insert([{ nombre, apellido, curso, notas: [] }])
        .select();

      if (error) throw error;
      if (data) {
        setAlumnos([data[0], ...alumnos]);
        setNombre('');
        setApellido('');
        setCurso('');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleToggleTP(alumnoId: string, campo: 'tp1' | 'tp2', valorActual: boolean) {
    const nuevoValor = !valorActual;
    const registroActual = tps.find(t => t.alumno_id === alumnoId && t.mes === mesSeleccionado) || {};

    try {
      const { data, error } = await supabase
        .from('trabajos_practicos')
        .upsert({ 
          ...registroActual,
          alumno_id: alumnoId, 
          mes: mesSeleccionado, 
          [campo]: nuevoValor 
        }, { onConflict: 'alumno_id, mes' })
        .select();

      if (error) throw error;

      if (data) {
        setTps(prev => {
          const existe = prev.some(t => t.alumno_id === alumnoId && t.mes === mesSeleccionado);
          if (existe) {
            return prev.map(t => (t.alumno_id === alumnoId && t.mes === mesSeleccionado) ? data[0] : t);
          } else {
            return [...prev, data[0]];
          }
        });
      }
    } catch (error) {
      console.error('Error actualizando TP:', error);
    }
  }

  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

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
      console.error('Error:', error);
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar alumno?')) return;
    try {
      const { error } = await supabase.from('alumnos').delete().eq('id', id);
      if (error) throw error;
      setAlumnos(alumnos.filter(al => al.id !== id));
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Gestión de Alumnos</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Agregar Nuevo Alumno</h2>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <input type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <input type="text" placeholder="Curso" value={curso} onChange={(e) => setCurso(e.target.value)} className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition">Agregar</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-700">Lista de Alumnos</h2>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* SELECTOR DE MESES */}
            <div className="flex items-center gap-2">
              <label htmlFor="mes-filtro" className="text-sm font-medium text-gray-600">Mes:</label>
              <select
                id="mes-filtro"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                {MESES.map((m) => (
                  <option key={m.valor} value={m.valor}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="curso-filtro" className="text-sm font-medium text-gray-600">Curso:</label>
              <select
                id="curso-filtro"
                value={cursoFiltro}
                onChange={(e) => setCursoFiltro(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="Todos">Todos</option>
                {cursosUnicos.map((curso, idx) => (
                  <option key={idx} value={curso}>{curso}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8 text-gray-500 animate-pulse">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Alumno</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center bg-blue-50/50">TPs ({nombreMesSeleccionado})</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Curso</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center">Asistencia</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Notas</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Promedio</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Agregar Nota</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alumnosFiltrados.map((alumno) => (
                  <tr key={alumno.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4 text-gray-800 font-medium">
                      {alumno.nombre} {alumno.apellido}
                    </td>
                    <td className="py-4 px-4 text-center align-middle bg-blue-50/30">
                      {(() => {
                        const tpInfo = tps.find(t => t.alumno_id === alumno.id && t.mes === mesSeleccionado) || { tp1: false, tp2: false };
                        return (
                          <div className="flex flex-col items-center gap-1.5">
                            <button onClick={() => handleToggleTP(alumno.id, 'tp1', tpInfo.tp1)} className={`text-[10px] w-full font-bold px-2 py-1 rounded border shadow-sm ${tpInfo.tp1 ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                              TP 1: {tpInfo.tp1 ? '✔' : '✖'}
                            </button>
                            <button onClick={() => handleToggleTP(alumno.id, 'tp2', tpInfo.tp2)} className={`text-[10px] w-full font-bold px-2 py-1 rounded border shadow-sm ${tpInfo.tp2 ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                              TP 2: {tpInfo.tp2 ? '✔' : '✖'}
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">{alumno.curso}</span>
                    </td>
                    <td className="py-4 px-4 text-sm whitespace-nowrap text-center">
                      <div className="flex flex-col">
                        <span className="text-green-600">Pres: {asistencias.filter(a => a.alumno_id === alumno.id && a.presente === true).length}</span>
                        <span className="text-red-500">Aus: {asistencias.filter(a => a.alumno_id === alumno.id && a.presente === false).length}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-800 font-semibold text-sm">
                      {alumno.notas?.length > 0 ? alumno.notas.join(' - ') : <span className="text-gray-400 italic">S/N</span>}
                    </td>
                    <td className="py-4 px-4 text-blue-700 font-bold text-sm">
                      {alumno.notas?.length > 0 ? (alumno.notas.reduce((a: any, b: any) => a + b, 0) / alumno.notas.length).toFixed(1) : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2 items-center">
                        <input type="number" placeholder="Nota" value={nuevasNotas[alumno.id] || ''} onChange={(e) => setNuevasNotas({ ...nuevasNotas, [alumno.id]: e.target.value })} className="w-16 p-1.5 border border-gray-300 rounded text-sm" />
                        <button onClick={() => handleAgregarNota(alumno.id, alumno.notas)} disabled={!nuevasNotas[alumno.id]} className="bg-green-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-green-700">Guardar</button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => handleEliminar(alumno.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
