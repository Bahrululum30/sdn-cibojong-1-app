import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, GraduationCap } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      Swal.fire({
          icon: 'warning',
          text: 'Harap lengkapi semua kolom sapaan.',
          confirmButtonColor: '#2563EB'
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Pesan Terkirim!',
          text: data.message,
          confirmButtonColor: '#2563EB'
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        Swal.fire({
          icon: 'error',
          text: 'Gagal mengirim pesan.',
          confirmButtonColor: '#2563EB'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        text: 'Kesalahan jaringan. Harap ulangi beberapa saat lagi.',
        confirmButtonColor: '#2563EB'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="contact-page" className="pt-24 min-h-screen bg-slate-50 text-slate-900">
      
      {/* Page Header */}
      <section className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white py-12 px-4 shadow-md">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 text-center space-y-3">
          <Mail className="h-10 w-10 text-blue-300 mx-auto" />
          <h1 className="text-3.5xl sm:text-5xl font-extrabold tracking-tight">Hubungi Sekretariat</h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mx-auto">
            Ada pertanyaan perihal SPMB atau program belajar mengajar kami? Jajaran tata usaha siap melayani sapaan bapak/ibu sekalian.
          </p>
        </div>
      </section>

      <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Frame: Details and Maps */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                KONTAK RESMI
              </span>
              <h2 className="text-2.5xl font-extrabold text-slate-900 tracking-tight leading-snug">
                Saluran Koordinasi Terbuka
              </h2>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-semibold">
                Silakan datang langsung ke lokasi sekretariat sekolah kami pada hari dan jam kerja di bawah, atau hubungi telepon WhatsApp harian.
              </p>
            </div>

            {/* Quick specifications */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="flex gap-4">
                <div className="h-10 w-10 bg-white border border-slate-205 shadow-sm rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-0.5">Alamat Jalan Resmi</h4>
                  <p className="text-xs text-slate-650 leading-normal font-semibold">Jl. Palka Km. 35, Kadubeureum, Kec. Padarincang, Kabupaten Serang, Banten.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 mb-0.5">Narahubung & WhatsApp Resmi</h4>
                  <div className="space-y-2">
                    <a
                      href="https://wa.me/6287710206067"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col sm:flex-row sm:items-center text-xs text-blue-600 hover:text-blue-800 font-semibold gap-1 hover:underline group"
                    >
                      <span className="text-slate-700">Humas & SPMB:</span>
                      <span className="flex items-center gap-1">
                        Izmayati Hermana 
                        <span className="font-mono font-bold bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors inline-block">+62 877-1020-6067</span>
                      </span>
                    </a>
                    <a
                      href="https://wa.me/6283873508737"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col sm:flex-row sm:items-center text-xs text-blue-600 hover:text-blue-800 font-semibold gap-1 hover:underline group"
                    >
                      <span className="text-slate-700">Kesiswaan & Akademik:</span>
                      <span className="flex items-center gap-1">
                        Nurul Uyun 
                        <span className="font-mono font-bold bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors inline-block">+62 838-7350-8737</span>
                      </span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 bg-white border border-slate-205 shadow-sm rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-0.5">Surat Elektronik (Email)</h4>
                  <p className="text-xs text-slate-650 font-mono font-bold">sdn.cibojong1@gmail.com</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 bg-white border border-slate-205 shadow-sm rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-0.5">Jam Kerja Sekretariat</h4>
                  <p className="text-xs text-slate-650 leading-normal font-semibold">Senin s/d Sabtu // Pukul 07:30 - 13:00 WIB</p>
                </div>
              </div>
            </div>

             {/* Google map widget */}
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-lg h-56 relative animate-fade-in">
                <iframe
                  title="Google Maps Location SDN Cibojong 1"
                  src="https://maps.google.com/maps?q=SDN%20Cibojong%201%20Kadubeureum%20Padarincang%20Serang&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                ></iframe>
              </div>
              <a 
                href="https://maps.app.goo.gl/NUhjFS2ZUss9uoD77" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-200 cursor-pointer text-xs"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Buka Petunjuk Google Maps Ke Sekolah</span>
              </a>
            </div>
          </div>

          {/* Right Frame: Form Input */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <MessageSquare className="text-blue-600 h-5 w-5" />
                <span>Kirim Pesan Langsung</span>
              </h3>
              <p className="text-xs text-slate-600 font-semibold">Pertanyaan Anda akan diteruskan menuju dashboard tata usaha kami.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.55">
                  <label className="font-extrabold text-slate-800">Nama Lengkap Anda *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Pak Herman"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 text-slate-800 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1.55">
                  <label className="font-extrabold text-slate-800">Alamat E-mail Anda *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="nama@domain.com"
                    className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 text-slate-800 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.55 select-none">
                <label className="font-extrabold text-slate-800">Subjek Hubungan *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Contoh: Pertanyaan Batas Pendaftaran Online"
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 text-slate-800 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.55">
                <label className="font-extrabold text-slate-800">Detail Isi Pesan Anda *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tulis apa saja yang ingin Anda tanyakan atau sampaikan secara terperinci..."
                  rows={5}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-slate-50 text-slate-800 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow shadow-blue-500/10 disabled:bg-slate-300"
                >
                  <span>Kirim Pesan</span>
                  <Send className="h-4 w-4" />
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>

    </div>
  );
}
