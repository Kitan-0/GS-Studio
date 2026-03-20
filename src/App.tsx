import { useState, useRef, useEffect, type ReactNode } from 'react';
import { 
  Box, 
  Camera, 
  Cpu, 
  Database, 
  FileCode, 
  FolderOpen, 
  Play, 
  Settings, 
  Layers,
  Upload,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as SPLAT from 'gsplat';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
    )}
  >
    <Icon size={18} className={cn("transition-transform group-hover:scale-110", active && "text-emerald-400")} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const Card = ({ children, title, icon: Icon, className }: { children: ReactNode, title?: string, icon?: any, className?: string }) => (
  <div className={cn("bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden", className)}>
    {(title || Icon) && (
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/30 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-emerald-400" />}
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</h3>
      </div>
    )}
    <div className="p-4">
      {children}
    </div>
  </div>
);

const ParameterInput = ({ label, value, onChange, type = "number", step = "1", description }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {description && (
        <div className="group relative">
          <Info size={12} className="text-zinc-600 cursor-help" />
          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-zinc-800 text-[10px] text-zinc-300 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-zinc-700">
            {description}
          </div>
        </div>
      )}
    </div>
    <input
      type={type}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
    />
  </div>
);

// --- Splat Viewer Component ---

const SplatViewer = ({ sourceUrl }: { sourceUrl: string | null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !sourceUrl) return;

    let renderer: any;
    let scene: any;
    let camera: any;
    let controls: any;
    let frameId: number;

    const init = async () => {
      setIsLoading(true);
      setError(null);
      setLoadProgress(0);
      
      try {
        if (!SPLAT) {
          throw new Error("SPLAT 渲染引擎未正确初始化。");
        }

        renderer = new (SPLAT as any).WebGLRenderer(canvasRef.current!);
        scene = new (SPLAT as any).Scene();
        camera = new (SPLAT as any).Camera();
        controls = new (SPLAT as any).OrbitControls(camera, canvasRef.current!);

        await (SPLAT as any).Loader.LoadAsync(sourceUrl, scene, (progress: number) => {
          setLoadProgress(Math.round(progress * 100));
        });

        setIsLoading(false);
        console.log("3D GS 模型加载成功:", sourceUrl);

        const handleResize = () => {
          if (!containerRef.current) return;
          const { width, height } = containerRef.current.getBoundingClientRect();
          renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        const animate = () => {
          controls.update();
          renderer.render(scene, camera);
          frameId = requestAnimationFrame(animate);
        };

        animate();
      } catch (err) {
        console.error("3D GS 加载失败:", err);
        setError(`无法加载 3D GS 数据。错误详情: ${err instanceof Error ? err.message : String(err)}`);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      // Cleanup logic
    };
  }, [sourceUrl]);

  if (!sourceUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-6 max-w-md p-8 border border-zinc-800 rounded-2xl bg-zinc-900/30">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <FolderOpen size={40} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-200">未选择可视化数据</h3>
            <p className="text-sm text-zinc-500 mt-2">请选择 3D GS 训练生成的输出文件（.splat 或 .ply）。</p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <label className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer">
              <Upload size={18} />
              选择本地文件
              <input 
                type="file" 
                className="hidden" 
                accept=".splat,.ply"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    (window as any).handleFileSelect(url);
                  }
                }}
              />
            </label>
            <button 
              onClick={() => (window as any).handleFileSelect("https://huggingface.co/datasets/kevinjycui/gsplat.js/resolve/main/bonsai-7k.splat")}
              className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-3 rounded-xl font-bold text-sm transition-all"
            >
              <Box size={18} />
              加载示例模型 (Bonsai)
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-600">支持标准 3D GS 导出的 .ply 点云或压缩后的 .splat 文件</p>
            <p className="text-[10px] text-zinc-700 italic">提示：如果加载失败，请确保 PLY 文件包含 Gaussian Splatting 所需的属性（如 opacity, scale, rotation 等）。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-mono text-zinc-400 animate-pulse">正在加载神经渲染器...</p>
              <p className="text-[10px] font-mono text-emerald-500">{loadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 z-20 p-6">
          <div className="max-w-md text-center space-y-4">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h3 className="text-xl font-bold text-zinc-200">可视化错误</h3>
            <p className="text-sm text-zinc-500">{error}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => (window as any).handleFileSelect(null)}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-lg text-sm font-bold transition-colors"
              >
                重新选择文件
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-bold transition-colors"
              >
                重载应用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay UI */}
      {!isLoading && !error && (
        <>
          <div className="absolute top-6 left-6 space-y-4">
            <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Camera size={16} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">视口控制</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold">
                  轨道模式
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 rounded-lg text-[10px] font-bold transition-colors">
                  飞行模式
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => (window as any).handleFileSelect(null)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg text-[10px] transition-colors"
                >
                  <RotateCcw size={12} /> 重置
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg text-[10px] transition-colors">
                  <Maximize2 size={12} /> 全屏
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 right-6">
            <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[220px]">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">高斯点数</span>
                  <span className="text-xs font-mono font-bold text-zinc-200">1,240,892</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">渲染耗时</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">6.4ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">显存占用</span>
                  <span className="text-xs font-mono font-bold text-zinc-200">142 MB</span>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase">实时预览</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'data' | 'training' | 'visualize' | 'settings'>('data');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [visualizeSource, setVisualizeSource] = useState<string | null>(null);

  // Expose setter for SplatViewer's internal input
  useEffect(() => {
    (window as any).handleFileSelect = (url: string) => {
      setVisualizeSource(url);
    };
  }, []);

  // Mock Training Logic
  useEffect(() => {
    let interval: any;
    if (isTraining) {
      interval = setInterval(() => {
        setTrainingProgress(prev => {
          if (prev >= 100) {
            setIsTraining(false);
            return 100;
          }
          return prev + 0.2;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-emerald-500/30">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Layers className="text-zinc-950" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">PCPGS Studio <span className="text-[10px] font-mono text-emerald-500 ml-1 px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">v1.0.4</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
            <div className={cn("w-2 h-2 rounded-full", isTraining ? "bg-emerald-500 animate-pulse" : "bg-zinc-600")} />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              {isTraining ? `正在训练: ${trainingProgress.toFixed(1)}%` : "系统空闲"}
            </span>
          </div>
          <button className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col gap-2 bg-zinc-950">
          <SidebarItem 
            icon={Database} 
            label="数据集管理" 
            active={activeTab === 'data'} 
            onClick={() => setActiveTab('data')} 
          />
          <SidebarItem 
            icon={Cpu} 
            label="训练配置" 
            active={activeTab === 'training'} 
            onClick={() => setActiveTab('training')} 
          />
          <SidebarItem 
            icon={Eye} 
            label="3D 可视化" 
            active={activeTab === 'visualize'} 
            onClick={() => setActiveTab('visualize')} 
          />
          <div className="mt-auto pt-4 border-t border-zinc-800">
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">显存占用</span>
                <span className="text-[10px] font-mono text-emerald-400">4.2 / 12 GB</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[35%]" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-zinc-950/50">
          <AnimatePresence mode="wait">
            {activeTab === 'data' && (
              <motion.div 
                key="data"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 max-w-5xl mx-auto space-y-6 h-full overflow-y-auto"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">数据集管理</h2>
                  </div>
                  <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                    <FolderOpen size={16} />
                    导入工作区
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card title="输入数据结构" icon={FileCode} className="md:col-span-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 group hover:border-zinc-700 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-900 rounded text-zinc-400"><FolderOpen size={16} /></div>
                          <div>
                            <p className="text-sm font-medium">sparse/0/</p>
                            <p className="text-[10px] text-zinc-500">包含 cameras.txt, images.txt, points3D.ply</p>
                          </div>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 group hover:border-zinc-700 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-900 rounded text-zinc-400"><FolderOpen size={16} /></div>
                          <div>
                            <p className="text-sm font-medium">images/</p>
                            <p className="text-[10px] text-zinc-500">输入图像</p>
                          </div>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-dashed border-zinc-700 group hover:border-zinc-600 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-900 rounded text-zinc-500"><Upload size={16} /></div>
                          <div>
                            <p className="text-sm font-medium text-zinc-500">添加自定义遮罩 (可选)</p>
                            <p className="text-[10px] text-zinc-600">将 .png 遮罩文件拖放到此处</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card title="统计信息" icon={Box}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">总图像数</span>
                        <span className="text-sm font-mono font-bold">995</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">稀疏点数</span>
                        <span className="text-sm font-mono font-bold">29,140,240</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">相机数量</span>
                        <span className="text-sm font-mono font-bold">2 (针孔)</span>
                      </div>
                      <div className="pt-4 border-t border-zinc-800">
                        <div className="flex items-center gap-2 text-emerald-500 mb-2">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">准备就绪</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 leading-relaxed">
                          数据集已通过验证。相机参数与图像分辨率一致。
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'training' && (
              <motion.div 
                key="training"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 max-w-5xl mx-auto space-y-6 h-full overflow-y-auto"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">训练配置</h2>
                  </div>
                  <button 
                    onClick={() => setIsTraining(!isTraining)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg",
                      isTraining 
                        ? "bg-zinc-800 text-zinc-400 cursor-not-allowed" 
                        : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20"
                    )}
                  >
                    {isTraining ? <AlertCircle size={16} /> : <Play size={16} />}
                    {isTraining ? "正在优化..." : "开始优化"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card title="优化计划" icon={Settings}>
                    <div className="space-y-4">
                      <ParameterInput label="迭代次数" value="30000" />
                      <ParameterInput label="不透明度重置间隔" value="3000" />
                      <ParameterInput label="SH 阶数" value="3" />
                      <ParameterInput label="致密化间隔" value="100" />
                    </div>
                  </Card>

                  <Card title="学习率" icon={Layers}>
                    <div className="space-y-4">
                      <ParameterInput label="位置 LR" value="0.00016" step="0.00001" />
                      <ParameterInput label="特征 LR" value="0.0025" step="0.0001" />
                      <ParameterInput label="不透明度 LR" value="0.05" step="0.01" />
                      <ParameterInput label="缩放 LR" value="0.005" step="0.001" />
                      <ParameterInput label="旋转 LR" value="0.001" step="0.001" />
                    </div>
                  </Card>

                  <Card title="高级参数" icon={FileCode} className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                      <ParameterInput label="体素大小" value="0.05" step="0.01" />
                      <ParameterInput label="几何复杂度权重" value="0.6" step="0.1" />
                      <ParameterInput label="纹理丰富度权重" value="0.4" step="0.1" />
                      <ParameterInput label="点云距离约束阈值" value="0.03" step="0.01" />
                      <ParameterInput label="克隆梯度阈值" value="0.0002" step="0.0001" />
                      <ParameterInput label="分裂梯度阈值" value="0.0002" step="0.0001" />
                      <ParameterInput label="分裂平均尺度比例阈值" value="1.5" step="0.1" />
                      <ParameterInput label="克隆平均尺度比例阈值" value="0.8" step="0.1" />
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'visualize' && (
              <motion.div 
                key="visualize"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <SplatViewer sourceUrl={visualizeSource} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
