import React, { createContext, useContext, useState, useEffect } from 'react';

const ShopContext = createContext();

const DEFAULTS = {
  shopName: 'STN MOTORS',
  shopTagline: 'Tractors & Oils',
  shopPhone: '0771234567',
  shopAddress: 'Main Street, Sithankeny',
  logo: null // null means use default icon
};

export const ShopProvider = ({ children }) => {
  const [shopInfo, setShopInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('stn_shop_info');
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('stn_shop_info', JSON.stringify(shopInfo));
  }, [shopInfo]);

  const updateShopInfo = (updates) => {
    setShopInfo(prev => ({ ...prev, ...updates }));
  };

  const resetLogo = () => {
    setShopInfo(prev => ({ ...prev, logo: null }));
  };

  return (
    <ShopContext.Provider value={{ shopInfo, updateShopInfo, resetLogo }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within ShopProvider');
  return context;
};
