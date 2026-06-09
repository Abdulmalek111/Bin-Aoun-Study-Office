import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error bound by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#071B3B] text-white flex flex-col items-center justify-center p-6 text-center" style={{ direction: 'rtl' }}>
          <div className="max-w-md bg-[#0F294A] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="mx-auto w-16 h-16 bg-[#D4A63A]/10 text-[#D4A63A] rounded-2xl flex items-center justify-center">
              <AlertTriangle size={36} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-[#D4A63A]">عذراً، حدث خطأ غير متوقع</h1>
              <p className="text-sm text-slate-300 leading-relaxed font-bold">
                حدث خطأ أثناء تحميل حسابك، حاول تحديث الصفحة.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left font-mono text-[10px] bg-black/30 p-3 rounded-xl max-h-32 overflow-y-auto border border-white/5 text-rose-300">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-[#D4A63A] hover:bg-[#D4A63A]/90 text-[#071B3B] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#D4A63A]/10"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
              <span>إعادة تحميل الصفحة والتحقق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
