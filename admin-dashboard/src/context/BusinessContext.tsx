import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { businessesApi, type Business } from '../api/businesses';

interface BusinessContextType {
  businesses: Business[];
  currentBusinessId: string | null;
  currentBusiness: Business | null;
  setCurrentBusinessId: (id: string | null) => void;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(
    () => localStorage.getItem('currentBusinessId'),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data } = await businessesApi.list({ limit: 100 });
        const list = Array.isArray(data) ? data : (data as unknown as { data: Business[] }).data || [];
        setBusinesses(list);

        const stored = localStorage.getItem('currentBusinessId');
        if (stored && list.some((b: Business) => b.id === stored)) {
          setCurrentBusinessIdState(stored);
        } else if (list.length > 0) {
          setCurrentBusinessIdState(list[0].id);
          localStorage.setItem('currentBusinessId', list[0].id);
        }
      } catch {
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  const setCurrentBusinessId = useCallback((id: string | null) => {
    setCurrentBusinessIdState(id);
    if (id) {
      localStorage.setItem('currentBusinessId', id);
    } else {
      localStorage.removeItem('currentBusinessId');
    }
  }, []);

  const currentBusiness = businesses.find((b) => b.id === currentBusinessId) || null;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        currentBusinessId,
        currentBusiness,
        setCurrentBusinessId,
        loading,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
