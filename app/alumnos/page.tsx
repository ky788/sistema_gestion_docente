"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [tps, setTps] = useState<any[]>([]); // Nuevo estado para TPs
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [curso, setCurso] = useState('');

  // Lógica para el mes actual
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesActualStr = primerDiaMes.toISOString().split('T')[0];
  const nombreMesActual = hoy.toLocaleString('es-ES', { month: 'long' });
  const [loading, setLoading] = useState(true);

  // Estado para filtrado por curso
  const [cursoFiltro, setCursoFiltro] = useState('Todos');

  // Estado para guardar el texto del input de "agregar nota" por cada alumno
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
        .order('creado_en', { ascending: false });

      if (error) throw error;
      if (data) setAlumnos(data);

      const { data: asisData } = await supabase.from('asistencia').select('*');
      if (asisData) setAsistencias(asisData);

      const { data: tpData } = await supabase
        .from('trabajos_practicos')
        .select('*')
        .eq('mes', mesActualStr);
      if (tpData) setTps(tpData);
    } catch (error) {
      console.error('Error obteniendo alumnos:', error);
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
      console.error('Error insertando alumno:', error);
      alert('Error al agregar el alumno. Revisa tus políticas RLS.');
    }
  }

  async function handleAgregarNota(id: string, notasActuales: number[]) {
    const notaTexto = nuevasNotas[id];
    if (!notaTexto) return;
    
    const notaNumero = parseInt(notaTexto, 10);
    if (isNaN(notaNumero)) {
      alert("Por favor ingresa un número válido");
      return;
    }

    if (notaNumero < 1 || notaNumero > 10) {
      alert("La nota debe ser un número entre 1 y 10");
      return;
    }

    // Agregamos la nueva nota al array actual de notas
    const notasActualizadas = [...(notasActuales || []), notaNumero];

    try {
      const { error } = await supabase
        .from('alumnos')
        .update({ notas: notasActualizadas })
        .eq('id', id);

      if (error) throw error;

      // Actualizamos el estado local para reflejar el cambio en la tabla
      setAlumnos(alumnos.map(al => al.id === id ? { ...al, notas: notasActualizadas } : al));
      
      // Limpiamos el input para que vuelva a estar vacío
      setNuevasNotas(prev => ({ ...prev, [id]: '' }));

    } catch (error) {
      console.error('Error actualizando nota:', error);
      alert('Error al actualizar la nota. Asegúrate de tener permisos de UPDATE en RLS.');
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Estás seguro de eliminar a este alumno?')) return;
    
    try {
      const { error } = await supabase
        .from('alumnos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAlumnos(alumnos.filter(al => al.id !== id));
    } catch (error) {
      console.error('Error eliminando alumno:', error);
      alert('Error al eliminar. Asegúrate de tener permisos de DELETE en RLS.');
    }
  }

  async function handleToggleTP(alumnoId: string, campo: 'tp1' | 'tp2', valorActual: boolean) {
    const nuevoValor = !valorActual;
    const registroActual = tps.find(t => t.alumno_id === alumnoId && t.mes === mesActualStr) || {};

    try {
      const { data, error } = await supabase
        .from('trabajos_practicos')
        .upsert({ 
          ...registroActual,
          alumno_id: alumnoId, 
          mes: mesActualStr, 
          [campo]: nuevoValor 
        }, { onConflict: 'alumno_id, mes' })
        .select();

      if (error) throw error;

      if (data) {
        setTps(prev => {
          const existe = prev.some(t => t.alumno_id === alumnoId && t.mes === mesActualStr);
          if (existe) {
            return prev.map(t => (t.alumno_id === alumnoId && t.mes === mesActualStr) ? data[0] : t);
          } else {
            return [...prev, data[0]];
          }
        });
      }
    } catch (error) {
      console.error('Error actualizando TP:', error);
      alert('Error al actualizar el Trabajo Práctico. Asegúrate de haber creado la tabla "trabajos_practicos" en Supabase.');
    }
  }

  // Obtener lista de cursos únicos para el select
  const cursosUnicos = Array.from(new Set(alumnos.map((a) => a.curso)));

  // Filtrar alumnos según el curso seleccionado
  const alumnosFiltrados = cursoFiltro === 'Todos' ? alumnos : alumnos.filter((a) => a.curso === cursoFiltro);

  function handleExportarCSV() {
    if (alumnosFiltrados.length === 0) {
      alert("No hay alumnos para exportar.");
      return;
    }

    const cabeceras = ["Nombre", "Apellido", "Curso", "Notas", "Promedio"];
    
    const filas = alumnosFiltrados.map(alumno => {
      const notasAgrupadas = alumno.notas && alumno.notas.length > 0 ? `"${alumno.notas.join(' - ')}"` : '"Sin notas"';
      
      let promedio = '"Sin promedio"';
      if (alumno.notas && alumno.notas.length > 0) {
        promedio = (alumno.notas.reduce((a: number, b: number) => a + b, 0) / alumno.notas.length).toFixed(1);
      }

      return [
        `"${alumno.nombre}"`, 
        `"${alumno.apellido}"`, 
        `"${alumno.curso}"`, 
        notasAgrupadas, 
        promedio
      ].join(",");
    });

    const contenidoCSV = [cabeceras.join(","), ...filas].join("\n");
    const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.setAttribute("download", `Alumnos_${cursoFiltro === 'Todos' ? 'Todos' : cursoFiltro}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Gestión de Alumnos</h1>

      {/* Tarjeta de Formulario */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Agregar Nuevo Alumno</h2>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Curso"
            value={curso}
            onChange={(e) => setCurso(e.target.value)}
            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
          >
            Agregar
          </button>
        </form>
      </div>

      {/* Lista / Tabla de Alumnos */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-700">Lista de Alumnos</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="curso-filtro" className="text-sm font-medium text-gray-600 whitespace-nowrap">Filtrar por Curso:</label>
              <select
                id="curso-filtro"
                value={cursoFiltro}
                onChange={(e) => setCursoFiltro(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="Todos">Todos</option>
                {cursosUnicos.map((curso, idx) => (
                  <option key={idx} value={curso}>{curso}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExportarCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium whitespace-nowrap shadow-sm"
              title="Exportar tabla actual"
            >
              Exportar a Excel (CSV)
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <p className="text-gray-500 animate-pulse">Cargando...</p>
          </div>
        ) : alumnosFiltrados.length === 0 ? (
          <p className="text-gray-500 p-4 text-center">No hay alumnos para mostrar en este curso.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Nombre</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Apellido</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center bg-blue-50/50">TPs ({nombreMesActual})</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Curso</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center">Asistencia</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Notas Actuales</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Promedio</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs">Agregar Nota</th>
                  <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alumnosFiltrados.map((alumno) => (
                  <tr key={alumno.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-4 text-gray-800 font-medium">{alumno.nombre}</td>
                    <td className="py-4 px-4 text-gray-800">{alumno.apellido}</td>
                    <td className="py-4 px-4 text-center align-middle bg-blue-50/30">
                      {(() => {
                        const tpInfo = tps.find(t => t.alumno_id === alumno.id && t.mes === mesActualStr) || { tp1: false, tp2: false };
                        return (
                          <div className="flex flex-col items-center justify-center gap-1.5 min-w-[6rem]">
                            <button 
                              onClick={() => handleToggleTP(alumno.id, 'tp1', tpInfo.tp1)}
                              className={`text-[10px] w-full font-bold px-2 py-1 rounded transition border shadow-sm ${tpInfo.tp1 ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                            >
                              TP 1: {tpInfo.tp1 ? '✔' : '✖'}
                            </button>
                            <button 
                              onClick={() => handleToggleTP(alumno.id, 'tp2', tpInfo.tp2)}
                              className={`text-[10px] w-full font-bold px-2 py-1 rounded transition border shadow-sm ${tpInfo.tp2 ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                            >
                              TP 2: {tpInfo.tp2 ? '✔' : '✖'}
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-center">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
                        {alumno.curso}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm whitespace-nowrap text-center">
                      <div className="flex flex-col">
                        <span className="text-green-600 font-medium">Pres: {asistencias.filter(a => a.alumno_id === alumno.id && a.presente === true).length}</span>
                        <span className="text-red-500 font-medium">Aus: {asistencias.filter(a => a.alumno_id === alumno.id && a.presente === false).length}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-800 font-semibold text-sm">
                      {alumno.notas && alumno.notas.length > 0
                        ? alumno.notas.join(' - ')
                        : <span className="text-gray-400 italic font-normal">Sin notas</span>}
                    </td>
                    <td className="py-4 px-4 text-blue-700 font-bold text-sm">
                      {alumno.notas && alumno.notas.length > 0
                        ? (alumno.notas.reduce((a: number, b: number) => a + b, 0) / alumno.notas.length).toFixed(1)
                        : <span className="text-gray-400 italic font-normal">Sin promedio</span>}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="Ej: 8"
                          value={nuevasNotas[alumno.id] || ''}
                          onChange={(e) => setNuevasNotas({ ...nuevasNotas, [alumno.id]: e.target.value })}
                          min="1"
                          max="10"
                          className="w-20 p-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        />
                        <button
                          onClick={() => handleAgregarNota(alumno.id, alumno.notas)}
                          disabled={!nuevasNotas[alumno.id]}
                          className="bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded hover:bg-green-700 transition text-sm font-medium"
                        >
                          Guardar Nota
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleEliminar(alumno.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition"
                        title="Eliminar alumno"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
