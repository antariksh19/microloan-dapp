import { FileQuestion, PlusCircle } from "lucide-react";

export default function EmptyState({ 
  title = "No Records Found", 
  description = "There are currently no active loans or requests matching this criteria.",
  actionText,
  onAction 
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-12 my-4 rounded-3xl border-2 border-dashed border-white/10 bg-slate-900/20 backdrop-blur-sm transition-all hover:bg-slate-900/40 hover:border-white/20 group">
      <div className="h-16 w-16 mb-4 rounded-full bg-slate-800/50 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500">
        <FileQuestion className="h-8 w-8 text-slate-500 group-hover:text-blue-400 transition-colors duration-300" />
      </div>
      
      <h3 className="text-lg font-bold text-slate-200 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-6 text-center max-w-sm">{description}</p>
      
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 text-sm font-medium text-slate-300 hover:text-white transition-all active:scale-95 shadow-lg"
        >
          <PlusCircle className="h-4 w-4" />
          {actionText}
        </button>
      )}
    </div>
  );
}