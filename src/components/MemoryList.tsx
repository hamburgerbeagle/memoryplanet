import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { fetchMemories, MemoryRecord } from '../services/airtable';

interface MemoryListProps {
  onBack: () => void;
}

const MemoryList: React.FC<MemoryListProps> = ({ onBack }) => {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<MemoryRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'memory' | 'wish' | 'mine'>('memory');

  const load = async () => {
    setLoading(true);
    const userId = localStorage.getItem('local_user_uuid');
    
    let params: { userId?: string, category?: string } = {};
    if (activeTab === 'mine') {
      params.userId = userId || 'none';
    } else if (activeTab === 'wish') {
      params.category = 'Wish';
    } else {
      params.category = 'Memory';
    }

    const { records } = await fetchMemories(params);
    setMemories(records);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeTab]);

  const renderStatusBadge = (memory: MemoryRecord) => (
    memory.isApproved ? (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[8px] text-emerald-400 tracking-[0.2em] uppercase font-medium">已点亮</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <span className="text-[8px] text-orange-400 tracking-[0.2em] uppercase font-medium">审核中</span>
      </div>
    )
  );

  const renderDetailOverlay = (memory: MemoryRecord) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-[120] flex justify-center bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 28, scale: 0.98 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="memory-archive-background relative h-screen w-full max-w-[430px] overflow-y-auto overflow-x-hidden custom-scrollbar px-6 py-10 pb-16"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="mb-8 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedDetail(null)}
            className="rounded-full bg-white/10 px-5 text-white/70 hover:bg-white/20 hover:text-white tracking-[0.2em] uppercase text-[10px]"
          >
            <ArrowLeft className="w-3 h-3 mr-2" />
            返回档案库
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDetail(null)}
            className="rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white h-10 w-10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className={`glass relative rounded-[30px] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.5)] ${memory.category === 'Wish' ? 'border-[#a78bfa]/25 bg-[#a78bfa]/10' : 'border-[#ffd700]/20 bg-white/[0.07]'}`}>
          <div className="mb-7 flex justify-between items-start gap-4">
            <div>
              <span className={`text-[10px] tracking-[0.3em] uppercase font-mono ${memory.category === 'Wish' ? 'text-[#a78bfa]' : 'text-[#ffd700]'}`}>
                {memory.category === 'Wish' ? 'Wish' : 'Archive'} No. #{memory.id.slice(-6).toUpperCase()}
              </span>
              <div className={`w-12 h-[1px] mt-2 ${memory.category === 'Wish' ? 'bg-[#a78bfa]/30' : 'bg-[#ffd700]/30'}`} />
            </div>

            {activeTab === 'mine' && (
              <div className="shrink-0">
                {renderStatusBadge(memory)}
              </div>
            )}
          </div>

          <p className="text-white/90 font-light leading-relaxed text-lg italic whitespace-pre-wrap break-words">
            {memory.textContent}
          </p>

          <div className="mt-10 pt-6 border-t border-white/10 border-dashed flex justify-between items-start gap-4">
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] text-white/20 tracking-[0.2em] uppercase">Timestamp</span>
              <span className="text-[10px] text-white/40 tracking-widest break-words">
                {memory.timestamp ? new Date(memory.timestamp).toLocaleString('zh-CN') : 'Pending'}
              </span>
            </div>
            <div className="text-right min-w-0">
              <span className="text-[8px] text-white/20 tracking-[0.2em] uppercase">Origin</span>
              <span className="block text-[10px] text-white/60 tracking-widest font-medium italic break-words">
                {memory.userNickname || '匿名星星'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="memory-archive-background absolute inset-0 z-50 overflow-y-auto overflow-x-hidden custom-scrollbar"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="relative z-10 w-full max-w-full px-6 py-12 pb-24 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10 gap-6">
          <div className="w-full">
            <h1 className="text-2xl font-extralight tracking-[0.5em] text-white uppercase mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              记忆档案库
            </h1>
            
            {/* Tab Switcher - Segmented Control (3 Tabs) */}
            <div className="mt-8 mb-4 flex justify-center">
              <div className="bg-white/5 p-1 rounded-full border border-white/10 flex gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('memory')}
                  className={`px-4 md:px-6 py-2 rounded-full text-[10px] tracking-[0.2em] transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'memory' 
                    ? 'bg-white text-black font-medium' 
                    : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  记忆星群
                </button>
                <button
                  onClick={() => setActiveTab('wish')}
                  className={`px-4 md:px-6 py-2 rounded-full text-[10px] tracking-[0.2em] transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'wish' 
                    ? 'bg-[#a78bfa] text-white font-medium shadow-[0_0_15px_rgba(167,139,250,0.4)]' 
                    : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  愿望池
                </button>
                <button
                  onClick={() => setActiveTab('mine')}
                  className={`px-4 md:px-6 py-2 rounded-full text-[10px] tracking-[0.2em] transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'mine' 
                    ? 'bg-white text-black font-medium' 
                    : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  我的存档
                </button>
              </div>
            </div>
            
            <p className="text-white/20 text-[8px] tracking-[0.2em] uppercase">
              {activeTab === 'memory' ? 'Collective Memory Archive' : activeTab === 'wish' ? 'Universal Wish Pool' : 'Personal Memory Archive'}
            </p>
          </div>
          
          <Button 
            onClick={onBack}
            variant="outline"
            className="rounded-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white hover:text-[#05060f] transition-all tracking-[0.3em] uppercase text-[10px] px-8 h-11 shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
          >
            <ArrowLeft className="w-3 h-3 mr-2" />
            返回星球
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase">正在同步星辰数据...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              {memories.map((memory, index) => {
                return (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="cursor-pointer overflow-visible"
                >
                  <Card
                    onClick={() => setSelectedDetail(memory)}
                    className={`glass p-6 rounded-[25px] border-white/5 hover:border-white/20 transition-all duration-500 group relative overflow-hidden flex flex-col animate-breathe receipt-edge ${memory.category === 'Wish' ? 'bg-[#a78bfa]/5' : ''}`}
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-[0.03] pointer-events-none" />
                    
                    {/* Category Icon for Wish */}
                    {memory.category === 'Wish' && (
                      <div className="absolute top-4 left-6 z-20">
                         <span className="text-[8px] text-[#a78bfa] font-bold tracking-widest uppercase">✦ WISH ✦</span>
                      </div>
                    )}

                    {/* Status Badge for "Mine" tab */}
                    {activeTab === 'mine' && (
                      <div className="absolute top-4 right-4 z-20">
                        {renderStatusBadge(memory)}
                      </div>
                    )}
                    
                    <div className="relative z-10 flex flex-col">
                      <div className="flex justify-between items-center mb-5 mt-2">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-white/20 tracking-[0.2em] uppercase font-mono">Archive No.</span>
                          <span className="text-[10px] text-[#ffd700] tracking-widest font-mono">#{memory.id.slice(-6).toUpperCase()}</span>
                        </div>
                        <div className={`text-right ${activeTab === 'mine' ? 'pr-20' : ''}`}> {/* Add padding if status badge exists */}
                          <span className="text-[8px] text-white/20 tracking-[0.2em] uppercase font-mono">Date</span>
                          <div className="text-[9px] text-white/40 tracking-widest font-mono">
                            {memory.timestamp ? new Date(memory.timestamp).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            }) : 'Pending'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className={`w-full h-px mb-4 border-dashed border-t ${memory.category === 'Wish' ? 'border-[#a78bfa]/30' : 'border-white/10'}`} />
                        <p className="text-white/90 font-light leading-relaxed text-sm italic line-clamp-4 overflow-hidden">
                          {memory.textContent}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] tracking-[0.2em] transition-all uppercase font-medium ${memory.category === 'Wish' ? 'text-[#a78bfa] group-hover:text-white' : 'text-[#ffd700] group-hover:text-white'}`}>
                          点击查看详情 &gt;
                        </span>
                        <div className="flex gap-0.5 h-2 opacity-10">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className={`${memory.category === 'Wish' ? 'bg-[#a78bfa]' : 'bg-white'} w-[2px]`} style={{ height: `${Math.random() * 100}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && memories.length === 0 && (
          <div className="text-center py-32 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            </div>
            <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase max-w-[200px]">
              {activeTab === 'memory' ? '目前尚无星辰点亮' : activeTab === 'wish' ? '愿望池还在等待第一颗流波' : '这里空空如也，去发射你的第一颗记忆或愿望吧'}
            </p>
          </div>
        )}
        
        {/* Footer Info */}
        {!loading && memories.length > 0 && (
          <div className="mt-16 text-center">
            <p className="text-white/10 text-[10px] tracking-[0.5em] uppercase">
              End of Archive | 记忆流转不息
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedDetail && renderDetailOverlay(selectedDetail)}
      </AnimatePresence>

    </motion.div>
  );
};

export default MemoryList;
