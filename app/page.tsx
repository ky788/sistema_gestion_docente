"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { 
  UsersIcon, 
  CheckBadgeIcon, 
  BookOpenIcon, 
  AcademicCapIcon,
  BellIcon,
  ChartBarIcon,
  ArrowUpRightIcon
} from '@heroicons/react/24/outline';

const ACCESOS_RAPIDOS = [
  { nombre: 'Alumnos', href: '/alumnos', icono: UsersIcon, color: 'text-purple-500', bg: 'bg-purple-50' },
  { nombre: 'Asistencia', href: '/asistencia', icono: CheckBadgeIcon, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { nombre: 'Trabajos', href: '/trabajos', icono: BookOpenIcon, color: 'text-amber-500', bg: 'bg-amber-50' },
  { nombre: 'Calificaciones', href: '/calificaciones', icono: AcademicCapIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    asistenciaHoy: 0,
    alertaRendimiento: 0,
    faltanCerrar: 0,
    tpProgreso: { tp1: 0, tp2: 0, tp3: 0 }
  });
  const [alertas, setAlertas] = useState<any[]>([]);

  const fechaHoy = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const todayISO = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const diaActual = new Date().getDate();
      const semanaIdx = diaActual <= 7 ? 1 : diaActual <= 14 ? 2 : diaActual <= 21 ? 3 : 4;

      // 1. Alumnos totales
      const { count: totalAlumnos } = await supabase.from('alumnos').select('*', { count: 'exact', head: true });
      const total = totalAlumnos || 1; // Evitar división por cero

      // 2. Asistencia hoy
      const { data: asisHoy } = await supabase.from('asistencia').select('*').eq('fecha', todayISO).eq('presente', true);
      const presentes = asisHoy?.length || 0;
      const pctAsistencia = Math.round((presentes / total) * 100);

      // 3. Trabajos / Alertas / Progreso
      const { data: trabajosData } = await supabase.from('trabajos_practicos').select('*').eq('mes', startOfMonth);
      
      const bajoRendimiento = trabajosData?.filter(t => t.evaluaciones?.nota_final_mes && t.evaluaciones.nota_final_mes < 4).length || 0;
      const cerrados = trabajosData?.filter(t => t.evaluaciones?.nota_final_mes !== undefined && t.evaluaciones.nota_final_mes !== null).length || 0;
      const faltanCerrar = total - cerrados;

      // Progreso TPs de la semana
      let entregasTP1 = 0;
      let entregasTP2 = 0;
      let entregasTP3 = 0;

      trabajosData?.forEach(t => {
        const evalSem = t.evaluaciones?.[`semana${semanaIdx}`];
        if (evalSem) {
          if (evalSem.tp1 !== undefined && evalSem.tp1 !== null) entregasTP1++;
          if (evalSem.tp2 !== undefined && evalSem.tp2 !== null) entregasTP2++;
          if (evalSem.tp3 !== undefined && evalSem.tp3 !== null) entregasTP3++;
        }
      });

      setStats({
        asistenciaHoy: pctAsistencia,
        alertaRendimiento: bajoRendimiento,
        faltanCerrar: faltanCerrar,
        tpProgreso: {
          tp1: Math.round((entregasTP1 / total) * 100),
          tp2: Math.round((entregasTP2 / total) * 100),
          tp3: Math.round((entregasTP3 / total) * 100),
        }
      });

      // Crear alertas dinámicas
      const nuevasAlertas = [];
      if (bajoRendimiento > 0) {
        nuevasAlertas.push({ id: 1, mensaje: `${bajoRendimiento} alumnos con rendimiento bajo este mes`, tipo: 'urgente' });
      }
      if (faltanCerrar > 0) {
        nuevasAlertas.push({ id: 2, mensaje: `Faltan cerrar ${faltanCerrar} notas finales de este mes`, tipo: 'aviso' });
      }
      if (pctAsistencia < 75) {
        nuevasAlertas.push({ id: 3, mensaje: `Alerta: Asistencia baja hoy (${pctAsistencia}%)`, tipo: 'urgente' });
      } else {
        nuevasAlertas.push({ id: 4, mensaje: `Cierre de mes programado para los próximos días`, tipo: 'info' });
      }
      
      setAlertas(nuevasAlertas);

    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const SkeletonWidget = () => (
    <div className="bg-[#0a1128] rounded-[2.5rem] p-8 shadow-2xl animate-pulse">
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-3">
          <div className="h-2 w-24 bg-white/10 rounded-full"></div>
          <div className="h-6 w-32 bg-white/20 rounded-full"></div>
        </div>
        <div className="w-12 h-12 bg-white/10 rounded-2xl"></div>
      </div>
      <div className="flex justify-center py-6">
        <div className="w-32 h-32 rounded-full border-8 border-white/5 flex items-center justify-center">
           <div className="w-20 h-4 bg-white/10 rounded-full"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans p-4 md:p-8 lg:p-12">
      {/* HEADER / HERO SECTION */}
      <header className="mb-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            ¡Hola, César! <span className="text-slate-400 font-medium">Bienvenido a EduTech.</span>
          </h1>
          <p className="text-lg md:text-xl font-bold text-slate-400">
            Hoy es <span className="text-slate-900">{fechaFormateada}</span>
          </p>
        </div>
      </header>

      {/* SHORTCUTS BAR */}
      <section className="mb-12">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block ml-2">Accesos Rápidos</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ACCESOS_RAPIDOS.map((item) => (
            <Link 
              key={item.nombre} 
              href={item.href}
              className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className={`${item.bg} ${item.color} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                <item.icono className="w-6 h-6" />
              </div>
              <span className="font-black text-slate-700 text-sm">{item.nombre}</span>
              <ArrowUpRightIcon className="w-4 h-4 ml-auto text-slate-300 group-hover:text-slate-900 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* GRID DE WIDGETS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {loading ? (
          <>
            <SkeletonWidget />
            <SkeletonWidget />
            <SkeletonWidget />
          </>
        ) : (
          <>
            {/* WIDGET 1: ASISTENCIA (DONUT) */}
            <div className="bg-[#0a1128] rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden group">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white mb-1 uppercase text-xs opacity-60">Asistencia Diaria</h3>
                  <p className="text-2xl font-black text-emerald-400">{stats.asistenciaHoy}% <span className="text-xs text-white/40 ml-1 font-bold">PROMEDIO HOY</span></p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div className="flex justify-center items-center py-6">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-white/10"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className="text-emerald-400 transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - stats.asistenciaHoy / 100)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="40"
                      cx="50"
                      cy="50"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black">{stats.asistenciaHoy}<span className="text-sm font-bold opacity-50">%</span></span>
                    <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">General</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2 opacity-50">
                <span className="flex-shrink-0 px-3 py-1 bg-white/5 rounded-full text-[10px] font-black border border-white/10 italic">Carga real</span>
                <span className="flex-shrink-0 px-3 py-1 bg-white/5 rounded-full text-[10px] font-black border border-white/10 italic">Actualizado ahora</span>
              </div>
            </div>

            {/* WIDGET 2: ALERTAS DINÁMICAS */}
            <div className="bg-[#0a1128] rounded-[2.5rem] p-8 shadow-2xl text-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white mb-1 uppercase text-xs opacity-60">Alertas de Calificaciones</h3>
                  <p className={`text-sm font-bold ${alertas.some(a => a.tipo === 'urgente') ? 'text-rose-400' : 'text-amber-400'}`}>
                    {alertas.length > 0 ? 'Notificaciones activas' : 'Sin alertas hoy'}
                  </p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl relative">
                  <BellIcon className="w-6 h-6 text-white" />
                  {alertas.length > 0 && <div className="absolute top-2 right-2 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#0a1128]"></div>}
                </div>
              </div>

              <div className="space-y-4">
                {alertas.map(alerta => (
                  <div key={alerta.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-4 items-center group/card hover:bg-white/10 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${alerta.tipo === 'urgente' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : alerta.tipo === 'aviso' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    <p className="text-xs font-bold text-white/80 group-hover/card:text-white transition-colors leading-tight">
                      {alerta.mensaje}
                    </p>
                  </div>
                ))}
                {alertas.length === 0 && (
                  <p className="text-center py-10 text-white/20 text-xs font-bold italic">Todo al día por ahora.</p>
                )}
              </div>
            </div>

            {/* WIDGET 3: ÚLTIMOS TRABAJOS (TIEMPO REAL) */}
            <div className="bg-[#0a1128] rounded-[2.5rem] p-8 shadow-2xl text-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white mb-1 uppercase text-xs opacity-60">Resumen de TPs</h3>
                  <p className="text-sm font-bold text-blue-400">Semana actual</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                  <BookOpenIcon className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="text-white/60">Trabajo Práctico 1</span>
                    <span className="text-emerald-400">{stats.tpProgreso.tp1}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 transition-all duration-1000 ease-out" style={{ width: `${stats.tpProgreso.tp1}%` }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="text-white/60">Trabajo Práctico 2</span>
                    <span className="text-blue-400">{stats.tpProgreso.tp2}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 transition-all duration-1000 ease-out" style={{ width: `${stats.tpProgreso.tp2}%` }}></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="text-white/60">TP 3 / Evaluaciones</span>
                    <span className="text-amber-400">{stats.tpProgreso.tp3}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-1000 ease-out" style={{ width: `${stats.tpProgreso.tp3}%` }}></div>
                  </div>
                </div>
              </div>
              <Link href="/trabajos" className="block text-center mt-8 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                Ver detalle por curso →
              </Link>
            </div>
          </>
        )}

      </section>

      {/* FOOTER */}
      <footer className="mt-20 py-10 border-t border-slate-100 flex flex-col items-center gap-2">
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Sistema de Gestión Docente v2.0</p>
        <p className="text-[10px] font-bold text-slate-400">Conectado a Supabase Realtime</p>
      </footer>
    </div>
  );
}
