import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  ChevronLeft, ChevronRight, Clock, Flame, Rocket, BookOpen, 
  Info, Mountain, Compass, Users, AlertCircle, Star, Target,
  Plane, Palmtree, Globe, Map, Luggage, MapPin,
  Unlock, Eye, UserCheck, X, ExternalLink, Image as ImageIcon,
  QrCode, Type, AlignLeft, AlertTriangle
} from 'lucide-react';

import { createRoot } from 'react-dom/client';

// --- КОНФИГУРАЦИЯ FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCt2PZpHwvp3CCLUsuJgeZAyjrz3vdz7_A",
  authDomain: "calendar-705b1.firebaseapp.com",
  projectId: "calendar-705b1",
  storageBucket: "calendar-705b1.firebasestorage.app",
  messagingSenderId: "843340531031",
  appId: "1:843340531031:web:bd890f353f60a3677b6a12",
  measurementId: "G-P430KBW898"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = 'learning-agenda-production'; 

const BackgroundGraphics = () => (
  <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden opacity-[0.04] select-none">
    <Plane size={320} className="absolute -top-10 -right-20 text-slate-900" />
    <Palmtree size={480} className="absolute -bottom-20 -left-20 text-slate-900" />
    <Globe size={200} className="absolute top-1/4 left-10 text-slate-900" />
  </div>
);

const EventIcon = ({ name, size = 16, className = "" }) => {
  const icons = {
    flame: Flame, rocket: Rocket, 'book-open': BookOpen, info: Info,
    mountain: Mountain, compass: Compass, users: Users, 'alert-circle': AlertCircle,
    star: Star, target: Target, clock: Clock, plane: Plane,
    palmtree: Palmtree, luggage: Luggage, map: Map, mappin: MapPin
  };
  const IconComponent = icons[name] || Info;
  return <IconComponent size={size} className={`${className} transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12`} />;
};

function App() {
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [headerTitle, setHeaderTitle] = useState("ДАЙДЖЕСТ ОБУЧАЮЩИХ МЕРОПРИЯТИЙ");
  const [legend, setLegend] = useState({
    urgent: { label: "Срочные новости", desc: "Обязательное присутствие" },
    product: { label: "Новый продукт", desc: "Обучение от контрагентов" },
    standard: { label: "Общее обучение", desc: "Вебинары по желанию" }
  });
  const [events, setEvents] = useState({});
  const [ownerId, setOwnerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [imgError, setImgError] = useState(false);
  
  // Секретный механизм для восстановления доступа
  const [clickCount, setClickCount] = useState(0);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  const isAdmin = !ownerId || (user && user.uid === ownerId) || isEmergencyMode;

  const types = {
    standard: "from-indigo-900 to-violet-700",
    urgent: "from-orange-500 to-red-600",
    product: "from-emerald-600 to-cyan-700"
  };

  const availableIcons = [
    'info', 'star', 'rocket', 'plane', 'palmtree', 'luggage', 'map', 'mappin',
    'flame', 'book-open', 'mountain', 'compass', 'users', 'alert-circle', 'target'
  ];

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Ошибка входа:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'settings', APP_ID);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.headerTitle) setHeaderTitle(String(data.headerTitle));
        if (data.legend) setLegend(data.legend);
        if (data.events) setEvents(data.events);
        if (data.ownerId) setOwnerId(String(data.ownerId));
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Ошибка Firestore:", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const saveData = async (updates, forceNewOwner = false) => {
    if (!user || (!isAdmin && !forceNewOwner)) return;
    try {
      const docRef = doc(db, 'settings', APP_ID);
      const dataToSave = {
        headerTitle: updates.headerTitle !== undefined ? updates.headerTitle : headerTitle,
        legend: updates.legend !== undefined ? updates.legend : legend,
        events: updates.events !== undefined ? updates.events : events,
        ownerId: forceNewOwner ? user.uid : (ownerId || user.uid),
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, dataToSave, { merge: true });
      if (forceNewOwner || !ownerId) {
        setOwnerId(user.uid);
        setIsEmergencyMode(false);
      }
    } catch (e) {
      console.error("Ошибка сохранения:", e);
    }
  };

  const handleHeaderClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 5) {
      setIsEmergencyMode(true);
      setClickCount(0);
    } else {
      setClickCount(newCount);
      // Сброс счетчика через 2 секунды бездействия
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate]);

  const monthNames = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];
  const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

  const updateEvent = (dayKey, field, value) => {
    if (!isAdmin) return;
    const newEvents = { 
      ...events, 
      [dayKey]: { 
        ...(events[dayKey] || { type: 'standard', icon: 'info', title: '', time: '', description: '', linkUrl: '', imageUrl: '', qrUrl: '', qrLabel: '' }), 
        [field]: value 
      } 
    };
    if (field === 'imageUrl') setImgError(false);
    setEvents(newEvents);
    saveData({ events: newEvents });
  };

  const updateLegend = (type, field, value) => {
    if (!isAdmin) return;
    const newLegend = { ...legend, [type]: { ...legend[type], [field]: value } };
    setLegend(newLegend);
    saveData({ legend: newLegend });
  };

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
    </div>
  );

  const selectedEvent = selectedDayKey ? events[selectedDayKey] : null;

  return (
    <div className="relative min-h-screen bg-slate-50 p-3 sm:p-8 font-sans text-slate-900 overflow-x-hidden">
      <BackgroundGraphics />
      {selectedDayKey && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] md:hidden" onClick={() => setSelectedDayKey(null)} />
      )}

      {/* Сайдбар деталей */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out flex flex-col ${selectedDayKey ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedDayKey && (
          <>
            <div className="flex items-center justify-between p-5 md:p-6 border-b">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Событие</span>
                <span className="text-xl font-black text-slate-800 uppercase">
                  {selectedDayKey.split('-')[2]} {monthNames[parseInt(selectedDayKey.split('-')[1])-1]}
                </span>
              </div>
              <button onClick={() => { setSelectedDayKey(null); setImgError(false); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-8">
              <div className="relative">
                {selectedEvent?.imageUrl && !imgError ? (
                  <img src={selectedEvent.imageUrl} alt="Event" className="rounded-2xl md:rounded-3xl w-full aspect-video object-cover shadow-lg border" referrerPolicy="no-referrer" onError={() => setImgError(true)} />
                ) : (
                  (isAdmin || imgError) && (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50">
                      {imgError ? <AlertTriangle size={32} className="text-amber-500" /> : <ImageIcon size={32} />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{imgError ? "Ошибка картинки" : "Нет изображения"}</span>
                    </div>
                  )
                )}
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Название</div>
                  {isAdmin ? (
                    <input value={selectedEvent?.title || ''} onChange={(e) => updateEvent(selectedDayKey, 'title', e.target.value)} placeholder="Введите название..." className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
                  ) : (
                    <div className="text-xl font-black text-slate-800 leading-tight uppercase tracking-tight">{selectedEvent?.title || 'Без названия'}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><Clock size={12}/> Время</div>
                  {isAdmin ? (
                    <input value={selectedEvent?.time || ''} onChange={(e) => updateEvent(selectedDayKey, 'time', e.target.value)} placeholder="00:00 - 00:00" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
                  ) : (
                    <div className="text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl inline-block">{selectedEvent?.time || '— : —'}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><AlignLeft size={12}/> Описание</div>
                  {isAdmin ? (
                    <textarea 
                      value={selectedEvent?.description || ''} 
                      onChange={(e) => updateEvent(selectedDayKey, 'description', e.target.value)} 
                      placeholder="Добавьте подробности мероприятия..." 
                      rows={4}
                      className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 resize-none" 
                    />
                  ) : (
                    <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl">{selectedEvent?.description || 'Описание отсутствует.'}</div>
                  )}
                </div>

                {selectedEvent?.linkUrl && (
                  <div className="pt-2">
                    <a href={selectedEvent.linkUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full p-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
                      <ExternalLink size={20} /> Подключиться
                    </a>
                  </div>
                )}

                {isAdmin && (
                  <div className="p-5 md:p-6 bg-indigo-50/50 rounded-2xl md:rounded-3xl space-y-4 border border-indigo-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Настройки админа</div>
                    <input value={selectedEvent?.imageUrl || ''} onChange={(e) => updateEvent(selectedDayKey, 'imageUrl', e.target.value)} placeholder="URL картинки..." className="w-full bg-white border border-indigo-100 rounded-xl p-3 text-[11px]" />
                    <input value={selectedEvent?.linkUrl || ''} onChange={(e) => updateEvent(selectedDayKey, 'linkUrl', e.target.value)} placeholder="URL ссылки..." className="w-full bg-white border border-indigo-100 rounded-xl p-3 text-[11px]" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={selectedEvent?.qrUrl || ''} onChange={(e) => updateEvent(selectedDayKey, 'qrUrl', e.target.value)} placeholder="Ссылка QR..." className="w-full bg-white border border-indigo-100 rounded-xl p-3 text-[11px]" />
                      <input value={selectedEvent?.qrLabel || ''} onChange={(e) => updateEvent(selectedDayKey, 'qrLabel', e.target.value)} placeholder="Подпись QR..." className="w-full bg-white border border-indigo-100 rounded-xl p-3 text-[11px]" />
                    </div>
                  </div>
                )}

                {selectedEvent?.qrUrl && (
                  <div className="flex flex-col items-center gap-4 py-6 border-t">
                    {selectedEvent.qrLabel && <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest border">{selectedEvent.qrLabel}</div>}
                    <div className="p-4 bg-white rounded-2xl shadow-lg border">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(selectedEvent.qrUrl)}`} alt="QR" className="w-32 h-32 md:w-40 md:h-40" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><QrCode size={14}/> Сканировать</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={`max-w-[1440px] mx-auto transition-all duration-500 ${selectedDayKey ? 'md:mr-[450px] opacity-50 blur-[2px]' : ''}`}>
        <header className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-grow cursor-pointer" onClick={handleHeaderClick}>
              {isAdmin ? (
                <input value={headerTitle} onChange={(e) => { setHeaderTitle(e.target.value); saveData({ headerTitle: e.target.value }); }} className="bg-transparent border-none text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight focus:ring-0 p-0 w-full" />
              ) : (
                <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight">{headerTitle}</h1>
              )}
            </div>
            <div className="flex items-center gap-3">
              {((!ownerId && isAdmin) || isEmergencyMode) && (
                <button 
                  onClick={() => saveData({}, true)} 
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-amber-500 text-white shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  <UserCheck size={14} /> {isEmergencyMode ? "Вернуть доступ" : "Закрепить"}
                </button>
              )}
              <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border shadow-sm ${isAdmin ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {isAdmin ? <Unlock size={14} className="inline mr-1 text-indigo-400" /> : <Eye size={14} className="inline mr-1" />}
                <span>{isAdmin ? "Редактор" : "Просмотр"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-6 justify-between">
            <div className="flex items-center gap-4 md:gap-6 bg-slate-900 text-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl min-w-[280px]">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="hover:text-indigo-400 transition-colors"><ChevronLeft size={28}/></button>
              <div className="text-center flex-grow">
                <div className="text-xl md:text-2xl font-black uppercase tracking-[0.2em]">{monthNames[currentDate.getMonth()]}</div>
                <div className="text-[10px] opacity-30 font-bold tracking-[0.5em] mt-1">{currentDate.getFullYear()}</div>
              </div>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="hover:text-indigo-400 transition-colors"><ChevronRight size={28}/></button>
            </div>

            <div className="flex flex-wrap gap-4 items-start">
              {Object.entries(legend).map(([key, data]) => (
                <div key={key} className="flex flex-col gap-1.5 p-3.5 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm min-w-[160px]">
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${types[key]}`} />
                    {isAdmin ? (
                      <input 
                        value={String(data.label || '')} 
                        onChange={(e) => updateLegend(key, 'label', e.target.value)} 
                        className="bg-transparent border-none text-[10px] font-black text-slate-800 p-0 focus:ring-0 uppercase tracking-tight w-full" 
                        placeholder="Название..."
                      />
                    ) : (
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{String(data.label || '')}</span>
                    )}
                  </div>
                  {isAdmin ? (
                    <textarea 
                      value={String(data.desc || '')} 
                      onChange={(e) => updateLegend(key, 'desc', e.target.value)} 
                      rows={2}
                      className="bg-transparent border-none text-[9px] text-slate-500 font-medium p-0 focus:ring-0 resize-none leading-tight w-full"
                      placeholder="Описание..."
                    />
                  ) : (
                    <span className="text-[9px] text-slate-500 font-medium leading-tight">{String(data.desc || '')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className="grid grid-cols-7 border-b bg-slate-50/50">
            {weekDays.map(d => <div key={d} className="py-4 md:py-5 text-center text-[9px] md:text-[11px] font-black text-slate-400 tracking-[0.3em]">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calendarGrid.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="min-h-[80px] sm:min-h-[120px] md:min-h-[180px] bg-slate-50/10 border-r border-b border-slate-50"></div>;
              const dayKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${day}`;
              const event = events[dayKey];
              const filled = event && (event.title || event.time);
              return (
                <div key={dayKey} onClick={() => { setSelectedDayKey(dayKey); setImgError(false); }} className={`min-h-[80px] sm:min-h-[120px] md:min-h-[180px] p-2 md:p-6 border-r border-b border-slate-50 transition-all cursor-pointer relative group flex flex-col ${filled ? `bg-gradient-to-br ${types[event.type || 'standard']} text-white shadow-inner` : 'hover:bg-indigo-50/30'}`}>
                  
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <div className={`text-base md:text-2xl font-black leading-none ${filled ? 'opacity-30' : 'text-slate-200 group-hover:text-indigo-200'}`}>{day}</div>
                    
                    {isAdmin && (
                      <div className="hidden group-hover:flex items-center gap-1 bg-white/10 p-1 rounded-lg backdrop-blur" onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={event?.icon || 'info'} 
                          onChange={(e) => updateEvent(dayKey, 'icon', e.target.value)}
                          className="bg-transparent border-none text-[8px] font-bold uppercase appearance-none cursor-pointer focus:ring-0 p-0 text-white"
                        >
                          {availableIcons.map(icon => <option key={icon} value={icon} className="text-slate-900">{icon}</option>)}
                        </select>
                        <div className="flex gap-1 border-l border-white/20 pl-1">
                          {Object.keys(types).map(t => (
                            <button 
                              key={t} 
                              onClick={() => updateEvent(dayKey, 'type', t)} 
                              className={`w-2 h-2 rounded-full border border-white/20 ${types[t].split(' ')[0].replace('from-', 'bg-')}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-grow text-[7px] md:text-[11px] font-bold leading-tight line-clamp-2 md:line-clamp-3 uppercase tracking-tight">
                    {event?.title}
                  </div>

                  <div className="mt-1 md:mt-4 pt-1 md:pt-3 border-t border-white/10 flex items-center gap-1 md:gap-2">
                    <EventIcon name="clock" size={10} className={filled ? "opacity-40" : "text-slate-300"} />
                    <span className={`text-[8px] md:text-[10px] font-black tracking-wider ${filled ? 'opacity-70' : 'text-slate-400'}`}>
                      {event?.time || '— : —'}
                    </span>
                  </div>

                  {filled && event.icon && (
                    <div className="absolute bottom-2 md:bottom-6 right-2 md:right-6 opacity-10">
                      <EventIcon name={event.icon} size={64} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
