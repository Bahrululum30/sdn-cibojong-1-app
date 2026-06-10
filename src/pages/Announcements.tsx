import React, { useState, useEffect } from 'react';
import { Megaphone, Search, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnnouncements(data.announcements);
          // Auto expand the first announcement for immediate glance
          if (data.announcements.length > 0) {
            setExpandedId(data.announcements[0].id);
          }
        }
      })
      .catch(err => console.error(err));
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const filteredAnnouncements = announcements.filter((ann) => 
    ann.title.toLowerCase().includes(search.toLowerCase()) ||
    ann.content.toLowerCase().includes(search.toLowerCase()) ||
    ann.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div id="announcements-page" className="pt-24 min-h-screen bg-slate-50 text-slate-900">
      
      {/* Page Header */}
      <section className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white py-12 px-4 shadow-md">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 text-center space-y-3">
          <Megaphone className="h-10 w-10 text-blue-300 mx-auto animate-pulse" />
          <h1 className="text-3.5xl sm:text-5xl font-extrabold tracking-tight">Pemberitahuan & Pengumuman</h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mx-auto">
            Media informasi resmi panitia SPMB dan dewan guru mengenai jadwal belajar mengajar, administrasi, agenda, dan verifikasi faktual.
          </p>
        </div>
      </section>

      <div className="max-w-5xl xl:max-w-6xl mx-auto px-6 lg:px-10 py-12">
        
        {/* Search Bar */}
        <div className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-450" />
            <input
              type="text"
              placeholder="Cari pengumuman..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Announcements List */}
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-800 mb-1">Pengumuman tidak ditemukan</p>
            <p className="text-xs text-slate-500">Silakan coba kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((ann) => {
              const isExpanded = expandedId === ann.id;
              return (
                <div 
                  key={ann.id}
                  id={`ann-item-${ann.id}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow shadow-slate-100 overflow-hidden hover:border-blue-400 transition-all duration-300"
                >
                  {/* Clickable Header bar */}
                  <div 
                    onClick={() => toggleExpand(ann.id)}
                    className="p-5 flex justify-between items-center cursor-pointer select-none gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase border ${ ann.category === 'SPMB' ? 'bg-blue-100 text-blue-800 border-blue-200 ' : ann.category === 'Akademik' ? 'bg-rose-100 text-rose-800 border-rose-200 ' : 'bg-slate-150 text-slate-800 border-slate-250 ' }`}>
                          {ann.category}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-600 font-mono font-bold flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <span>{ann.date}</span>
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                        {ann.title}
                      </h3>
                    </div>

                    <div className="text-slate-500">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>

                  {/* Expandable Content Area */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-3 border-t border-slate-200 text-xs sm:text-sm text-slate-700 space-y-4 leading-relaxed animate-fade-in font-medium">
                      <p className="whitespace-pre-wrap">{ann.content}</p>
                      
                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4 text-blue-500" />
                          <span>Diterbitkan Oleh: {ann.author}</span>
                        </span>
                        <span>Resmi SDN Cibojong 1</span>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
