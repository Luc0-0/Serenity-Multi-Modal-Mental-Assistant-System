import React, { createContext, useState, useCallback } from 'react';

export const ConversationRefreshContext = createContext();

export const ConversationRefreshProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const contextValue = {
    refreshTrigger,
    triggerRefresh,
  };

  return (
    <ConversationRefreshContext.Provider value={contextValue}>
      {children}
    </ConversationRefreshContext.Provider>
  );
};

export const useConversationRefresh = () => {
  const context = React.useContext(ConversationRefreshContext);
  if (!context) {
    throw new Error('useConversationRefresh must be used within ConversationRefreshProvider');
  }
  return context;
};

export default ConversationRefreshProvider;
