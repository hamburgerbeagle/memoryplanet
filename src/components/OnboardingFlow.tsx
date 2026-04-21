import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  onComplete: (nickname: string) => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [nickname, setNickname] = useState('');

  const handleConfirm = () => {
    if (!nickname.trim()) {
      toast.error('请留下你的称呼哦');
      return;
    }
    localStorage.setItem('local_user_nickname', nickname.trim());
    onComplete(nickname.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center pointer-events-auto">
      <div className="w-full max-w-[430px] h-full bg-[#05060f]/90 backdrop-blur-xl relative overflow-hidden flex flex-col justify-center px-8 text-center">
        <div className="atmosphere" />
        <div className="nebula opacity-30" />
        
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                来自 更新场造梦无限公司 的邀请
              </span>
              <h1 className="text-2xl md:text-3xl font-light tracking-[0.2em] text-white mb-8">
                在这里，星星会记住你的一切
              </h1>
              <div className="space-y-4 text-white/60 font-light leading-relaxed tracking-wide text-sm mb-12">
                <p>你可以写下难以忘怀的记忆，</p>
                <p>也可以投递天马行空的愿望。</p>
                <p>你留下的每一份心心念念，</p>
                <p>都会化作这片星海中闪闪发亮的星星</p>
                <p>让我们的记忆星星拥抱在一起。</p>
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full rounded-full bg-white text-black hover:bg-white/90 h-14 text-sm tracking-[0.4em] uppercase font-medium shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                进入记忆星球
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center w-full"
            >
              <h1 className="text-2xl font-light tracking-[0.2em] text-white mb-2">
                该怎么称呼你呢？
              </h1>
              <p className="text-xs text-white/30 tracking-[0.1em] mb-12">
                这将作为你在星群中的专属落款
              </p>
              
              <div className="w-full mb-12 relative group">
                <input
                  autoFocus
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入你的名字或昵称"
                  maxLength={10}
                  className="w-full bg-transparent border-0 border-b border-white/20 rounded-none focus:outline-none focus:border-white h-14 text-center text-xl text-white placeholder:text-white/10 transition-all font-light"
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-white transition-all duration-500 group-focus-within:w-full" />
              </div>

              <Button
                onClick={handleConfirm}
                className="w-full rounded-full bg-white text-black hover:bg-white/90 h-14 text-sm tracking-[0.4em] uppercase font-medium"
              >
                开启一段旅程
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingFlow;
