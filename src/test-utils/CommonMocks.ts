import { vi } from "vitest";
import { Tolgee } from "@tolgee/react";
import localeEn from "../i18n/en.json";
import "@testing-library/jest-dom";

export const mockAxios = () => {
  vi.mock("../config/axios-config.js", () => ({
    default: {
      get: vi.fn(() => Promise.resolve({ data: {} })),
      post: vi.fn(() => Promise.resolve({ data: "Success" })),
    },
  }));
};

export const mockUseAuth = () => {
  vi.mock("../config/AuthContext.jsx", () => ({
    useAuth: () => ({
      isLoggedIn: false,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  }));
};

export const mockUseAuth0 = () => {
  vi.mock("@auth0/auth0-react", () => ({
    useAuth0: () => ({
      isAuthenticated: false,
      logout: vi.fn(),
      loginWithRedirect: vi.fn(),
      user: null,
    }),
  }));
};

export const mockReactQuery = () => {
  vi.mock("react-query", async () => {
    const actual = await vi.importActual("react-query");
    const defaultUseMutation = (mutationFn: any, options: any) => {
      const mutate = async (args: any) => {
        try {
          const result = await mutationFn(args);
          if (options?.onSuccess) {
            options.onSuccess(result);
          }
          return result;
        } catch (error) {
          if (options?.onError) {
            options.onError(error);
          }
          throw error;
        }
      };
      return {
        mutate,
        mutateAsync: mutate,
      };
    };

    return {
      ...actual,
      // A bare vi.fn() hands back undefined, which every caller destructures.
      // Tests that care set their own return value; the rest get a query that
      // has simply resolved to nothing.
      useQuery: vi.fn(() => ({
        data: undefined,
        error: null,
        isLoading: false,
      })),
      useMutation: vi.fn(defaultUseMutation),
    };
  });
};

export const mockTolgee = Tolgee().init({
  language: "en",
  fallbackLanguage: "en",
  staticData: {
    en: localeEn,
  },
});

vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => children ?? null,
  HelmetProvider: ({ children }: { children: React.ReactNode }) =>
    children ?? null,
}));

window.alert = vi.fn();

// jsdom implements no matchMedia either, and the home page asks about the
// viewport and the reader's motion preference. A query that never matches gives
// every caller the plain, unanimated branch.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

// jsdom ships no ResizeObserver, and anything that measures itself on mount -
// the partner strip's marquee, for one - constructs one straight away.
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
};
