import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App.tsx";
import { BrowserRouter as Router } from "react-router-dom";
import { Auth0ProviderWithNavigate } from "./config/Auth0ProviderWithNavigate.tsx";
import { QueryClient, QueryClientProvider } from "react-query";
import { PechaAuthProvider } from "./config/AuthContext.tsx";
import {
  BackendFetch,
  DevTools,
  FormatSimple,
  Tolgee,
  TolgeeProvider,
} from "@tolgee/react";
import localeEn from "./i18n/en.json";
import localeBoIn from "./i18n/bo-IN.json";
import { LANGUAGE } from "./utils/constants.ts";
import { HelmetProvider } from "react-helmet-async";
import { UserbackProvider } from "./context/UserBackProvider.tsx";
import { CollectionColorProvider } from "./context/CollectionColorContext.tsx";
import { LanguagesProvider } from "./context/LanguagesContext.tsx";
import { TransliterationProvider } from "./context/TransliterationContext.tsx";
import { Toaster } from "@/components/ui/sonner";
import AppOpenBanner from "./components/layout/AppOpenBanner.tsx";
import { initClarity } from "./utils/clarity.ts";

const queryClient = new QueryClient();
const defaultLanguage = import.meta.env.VITE_DEFAULT_LANGUAGE || "en";

initClarity();

if (!localStorage.getItem(LANGUAGE)) {
  localStorage.setItem(LANGUAGE, defaultLanguage);
}

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  // replace with .use(FormatIcu()) for rendering plurals, formatted numbers, etc.
  .use(
    BackendFetch({
      prefix:
        "https://cdn.tolg.ee/300fa406912d362adee8a983f8f4682d/reactjs_json",
      fallbackOnFail: true,
    }),
  )
  .init({
    language: localStorage.getItem(LANGUAGE) || defaultLanguage,
    fallbackLanguage: "en",
    staticData: {
      en: async () => localeEn,
      "bo-IN": async () => localeBoIn,
    },
  });
createRoot(document.getElementById("root") as HTMLElement).render(
  <Router>
    <QueryClientProvider client={queryClient}>
      <TolgeeProvider tolgee={tolgee}>
        <Auth0ProviderWithNavigate>
          <PechaAuthProvider>
            <HelmetProvider>
              <UserbackProvider>
                <CollectionColorProvider>
                  <LanguagesProvider>
                    <TransliterationProvider>
                      <>
                        <App />
                        <Toaster />
                        {window?.location?.pathname === "/" && (
                          <AppOpenBanner />
                        )}
                      </>
                    </TransliterationProvider>
                  </LanguagesProvider>
                </CollectionColorProvider>
              </UserbackProvider>
            </HelmetProvider>
          </PechaAuthProvider>
        </Auth0ProviderWithNavigate>
      </TolgeeProvider>
    </QueryClientProvider>
  </Router>,
);
