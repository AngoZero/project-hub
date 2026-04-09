import { useEffect, useState } from 'react';

interface SplashScreenProps {
  isLoading: boolean;
}

export function SplashScreen({ isLoading }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const exiting = !isLoading;

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`splash ${exiting ? 'splash--exiting' : ''}`}>
      <img src="/favicon.svg" alt="Project Hub" className="splash__logo" />
      <p className="splash__title">PROJECT HUB</p>
      <div className="splash__bar">
        <div className="splash__bar-fill" />
      </div>
    </div>
  );
}
