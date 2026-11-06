import React, { createContext, useContext, useState, useEffect } from 'react';

interface MobileContextType {
  isMobileFrame: boolean;
  setIsMobileFrame: React.Dispatch<React.SetStateAction<boolean>>;
  isWindowNarrow: boolean;
  isMobile: boolean; // True if either inside mobile preview frame OR actual window < 768px
}

const MobileContext = createContext<MobileContextType>({
  isMobileFrame: false,
  setIsMobileFrame: () => {},
  isWindowNarrow: false,
  isMobile: false,
});

export const MobileProvider: React.FC<{
  children: React.ReactNode;
  isMobileFrame: boolean;
  setIsMobileFrame: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ children, isMobileFrame, setIsMobileFrame }) => {
  const [isWindowNarrow, setIsWindowNarrow] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkWidth = () => {
      setIsWindowNarrow(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const isMobile = isMobileFrame || isWindowNarrow;

  return (
    <MobileContext.Provider value={{ isMobileFrame, setIsMobileFrame, isWindowNarrow, isMobile }}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobileLayout = () => useContext(MobileContext);
