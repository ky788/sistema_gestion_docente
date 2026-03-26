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
  
  // 5. Estado para el Modal (Ficha del Alumno)
  const [alumnoModal, setAlumnoModal] = useState<any | null>(null);
  const [evalOral, setEvalOral] = useState({ nota: '', fecha: '' });
  const [evalEscrita, setEvalEscrita] = useState({ nota: '', fecha: '' });
  const [evalCarpeta, setEvalCarpeta] = useState({ nota: '', fecha: '' });
  const [mensajePadres, setMensajePadres] = useState('');

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

  const handleOpenModal = (alumno: any) => {
    setAlumnoModal(alumno);
    setEvalOral({ nota: '', fecha: '' }); 
    setEvalEscrita({ nota: '', fecha: '' });
    setEvalCarpeta({ nota: '', fecha: '' });
    setMensajePadres('');
  };

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
                    <td className="py-4 px-4">
                      <button 
                        onClick={() => handleOpenModal(alumno)}
                        className="text-blue-600 font-semibold hover:text-blue-800 transition-colors text-left"
                      >
                        {alumno.nombre} {alumno.apellido}
                      </button>
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

      {/* MODAL: FICHA DEL ALUMNO REFINADA */}
      {alumnoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-300">
            
            {/* Header del Modal - Más compacto */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-6 text-white relative flex-shrink-0">
              <button 
                onClick={() => setAlumnoModal(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Ficha del Alumno</h2>
                  <p className="text-blue-100 text-sm opacity-90">{alumnoModal.nombre} {alumnoModal.apellido} • <span className="font-semibold">{alumnoModal.curso}</span></p>
                </div>
              </div>
            </div>

            {/* Contenido con Scroll Interno Suave */}
            <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/30 custom-scrollbar">
              
              {/* SECCIONES DE EVALUACIÓN - DISTRIBUCIÓN HORIZONTAL */}
              <div className="flex flex-col gap-4">
                
                {/* Evaluación Oral */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 md:w-1/4">
                    <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-700 text-sm">Oral</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                      <input type="date" value={evalOral.fecha} onChange={(e) => setEvalOral({...evalOral, fecha: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nota</label>
                      <input type="number" placeholder="1-10" min="1" max="10" value={evalOral.nota} onChange={(e) => setEvalOral({...evalOral, nota: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs" />
                    </div>
                  </div>
                </div>

                {/* Evaluación Escrita */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 md:w-1/4">
                    <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-700 text-sm">Escrita</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                      <input type="date" value={evalEscrita.fecha} onChange={(e) => setEvalEscrita({...evalEscrita, fecha: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nota</label>
                      <input type="number" placeholder="1-10" min="1" max="10" value={evalEscrita.nota} onChange={(e) => setEvalEscrita({...evalEscrita, nota: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs" />
                    </div>
                  </div>
                </div>

                {/* Carpeta */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 md:w-1/4">
                    <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="font-bold text-gray-700 text-sm">Carpeta</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Fecha</label>
                      <input type="date" value={evalCarpeta.fecha} onChange={(e) => setEvalCarpeta({...evalCarpeta, fecha: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nota</label>
                      <input type="number" placeholder="1-10" min="1" max="10" value={evalCarpeta.nota} onChange={(e) => setEvalCarpeta({...evalCarpeta, nota: e.target.value})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs" />
                    </div>
                  </div>
                </div>

              </div>

              {/* CUADRO DE COMUNICADO - Más ajustado */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-600 flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Mensaje para los padres
                </label>
                <textarea 
                  rows={3} 
                  value={mensajePadres}
                  onChange={(e) => setMensajePadres(e.target.value)}
                  placeholder="Resumen del desempeño..."
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs resize-none placeholder:text-gray-300"
                />
              </div>

              {/* Botón de Envío Compacto */}
              <button 
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-base group"
                onClick={() => alert(`Enviando notificación para ${alumnoModal.nombre}`)}
              >
                <svg className="w-5 h-5 transition-transform group-hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Notificar por correo
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end flex-shrink-0">
              <button 
                onClick={() => setAlumnoModal(null)}
                className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
