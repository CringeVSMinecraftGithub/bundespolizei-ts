
import React from 'react';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const DataModal: React.FC<DataModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon = '📄', 
  children, 
  footer,
  maxWidth = 'max-w-4xl'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`w-full ${maxWidth} bg-[#0f172a] border border-white/10 rounded-[40px] shadow-[0_0_150px_rgba(0,0,0,0.9)] flex flex-col animate-in zoom-in duration-300 overflow-hidden max-h-[90vh]`}>
        
        {/* Modal Header */}
        <div className="h-20 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 md:px-10 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
              {icon}
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">{title}</h2>
              {subtitle && (
                <p className="text-blue-500 text-[9px] font-black uppercase tracking-[0.3em] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all text-xl hover:rotate-90"
          >
            ✕
          </button>
        </div>
        
        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-[#0a0c10]">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="p-6 md:p-8 border-t border-white/10 bg-black/40 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataModal;
