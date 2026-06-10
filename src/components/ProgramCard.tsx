import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Calendar, Award, Shield, User, HelpCircle } from 'lucide-react';

export interface ProgramData {
  title: string;
  description: string;
  image: string;
  icon: React.ComponentType<any>;
  category: 'Ekstrakurikuler' | 'Pembiasaan';
  schedule: string;
  benefits: string[];
  equipment: string;
  coach: string;
  bgColor: string;
  accentColor: string;
  borderColor: string;
  shadowColor: string;
}

interface ProgramCardProps {
  program: ProgramData;
  index: number;
}

export default function ProgramCard({ program, index }: ProgramCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  
  const IconComponent = program.icon;

  // Custom mild 3D tilt/parallax hover effect on the entire card
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Limits rotation angle to max 5 degrees for subtlety, maintaining standard school professionalism
    setRotateX(-y / 40);
    setRotateY(x / 40);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  // Card stagger entry animations
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 40 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        stiffness: 70,
        damping: 15,
        delay: index * 0.08
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: isOpen ? "all 0.4s ease-out" : "transform 0.1s ease-out, shadow 0.3s ease",
        transformStyle: "preserve-3d"
      }}
      className={`group bg-white rounded-3xl border border-slate-200/65 ${program.borderColor} hover:border-transparent ${program.shadowColor} shadow-[0_4px_20px_-4px_rgba(148,163,184,0.12)] hover:shadow-[0_20px_40px_-15px_rgba(156,163,175,0.22)] (0,0,0,0.5)] overflow-hidden transition-all duration-300 flex flex-col h-full relative`}
      id={`program-card-${index}`}
    >
      {/* Category Ribbon */}
      <span className={`absolute top-4 left-4 z-20 px-3 py-1 text-[10px] font-bold text-white rounded-full tracking-wider uppercase shadow-sm ${ program.category === 'Ekstrakurikuler' ? 'bg-blue-600/90 backdrop-blur-sm' : 'bg-orange-600/90 backdrop-blur-sm' }`}>
        {program.category}
      </span>

      {/* Image Thumbnail Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-50 border-b border-slate-100">
        <img 
          src={program.image} 
          alt={program.title} 
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* Soft overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent opacity-60 pointer-events-none" />
      </div>

      {/* Overlapping Floating Icon */}
      <div className="relative h-0">
        <motion.div 
          animate={{ y: [0, -3, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.3
          }}
          className={`absolute -top-7 left-6 z-10 h-14 w-14 rounded-2xl border-4 border-white ${program.bgColor} ${program.accentColor} flex items-center justify-center shadow-md shadow-slate-300/40 select-none`}
        >
          <IconComponent className="h-6 w-6" />
        </motion.div>
      </div>

      {/* Content Body */}
      <div className="p-6 pt-10 flex-grow flex flex-col justify-between">
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-slate-900 transition-colors tracking-tight">
            {program.title}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {program.description}
          </p>
        </div>

        {/* Detailed expand/collapse Accordion Section */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ 
                height: "auto", 
                opacity: 1, 
                marginTop: 18,
                transition: { 
                  height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.25, delay: 0.05 }
                }
              }}
              exit={{ 
                height: 0, 
                opacity: 0, 
                marginTop: 0,
                transition: { 
                  height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.15 }
                }
              }}
              className="overflow-hidden border-t border-dashed border-slate-100 pt-4"
            >
              <div className="space-y-3.5 text-xs">
                {/* Schedule info */}
                <div className="flex gap-2.5 items-start">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Jadwal Pelaksanaan:</span>
                    <span className="text-slate-500">{program.schedule}</span>
                  </div>
                </div>

                {/* Benefits / Manfaat list */}
                <div className="flex gap-2.5 items-start">
                  <Award className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Manfaat / Target:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-500 mt-0.5Type mr-2">
                      {program.benefits.map((benefit, bIdx) => (
                        <li key={bIdx}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Equipment required */}
                <div className="flex gap-2.5 items-start">
                  <Shield className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Seragam &amp; Perlengkapan:</span>
                    <span className="text-slate-500">{program.equipment}</span>
                  </div>
                </div>

                {/* Instructor / Coach */}
                <div className="flex gap-2.5 items-start">
                  <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Koordinator / Pembimbing:</span>
                    <span className="text-slate-500">{program.coach}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accordion Expand Trigger Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-100/60 flex items-center justify-between">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer ${ isOpen ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 ' : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white shadow-sm hover:shadow-md' }`}
          >
            <span>{isOpen ? 'Tutup Detail' : 'Lihat Detail'}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="shrink-0"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
