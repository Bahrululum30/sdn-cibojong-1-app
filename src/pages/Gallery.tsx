import React, { useState, useEffect } from 'react';
import { Camera, Calendar, Layers, Image as ImageIcon } from 'lucide-react';

export default function Gallery() {
  const [gallery, setGallery] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGallery(data.gallery);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const categories = ['Semua', 'Fasilitas', 'Kegiatan', 'Prestasi', 'Belajar'];

  const filteredGallery = activeCategory === 'Semua' 
    ? gallery 
    : gallery.filter(item => item.category === activeCategory);

  return (
    <div id="gallery-page" className="pt-24 min-h-screen bg-slate-50 text-slate-900">
      
      {/* Gallery Header Banner */}
      <section className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white py-12 px-4 shadow-md">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 text-center space-y-3">
          <Camera className="h-10 w-10 text-blue-300 mx-auto" />
          <h1 className="text-3.5xl sm:text-5xl font-extrabold tracking-tight">Galeri Kegiatan Sekolah</h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mx-auto">
            Dokumentasi digital visual mengenai jajaran sarana pembelajaran harian, ekstrakurikuler, dan catatan prestasi kejuaraan murid SDN Cibojong 1.
          </p>
        </div>
      </section>

      <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 py-12">
        
        {/* Category Tabs Selector bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold cursor-pointer border tracking-wider transition-all duration-205 ${ activeCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow shadow-blue-500/20' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 ' }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery grid matrix */}
        {filteredGallery.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto">
            <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-4 animate-bounce" />
            <p className="text-sm font-bold text-slate-800 mb-1">Belum ada foto</p>
            <p className="text-xs text-slate-500">Tidak ada item di kategori {activeCategory} saat ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredGallery.map((item) => (
              <div 
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow hover:shadow-lg border border-slate-200 transition-all group cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedImage(item.imageUrl)}
              >
                {/* Photo crop */}
                <div className="relative overflow-hidden aspect-video">
                  <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent z-10 transition-colors" />
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-blue-630 text-white font-mono text-[9px] font-bold uppercase rounded-md px-2 py-1 z-20 shadow">
                    {item.category}
                  </div>
                </div>

                {/* Annotation metadata Card info */}
                <div className="p-5 space-y-2">
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-mono font-bold flex items-center gap-1.5 flex-wrap">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>{item.date}</span>
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-blue-600 transition-colors">{item.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold line-clamp-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Expanded Modal Photo Preview overlay */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-screen relative overflow-hidden bg-slate-950 p-2 rounded-2xl border border-white/10">
            <button 
              className="absolute top-4 right-4 h-10 w-10 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center z-50 font-bold"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Expanded Preview"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] rounded-lg object-contain block mx-auto shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
