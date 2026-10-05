import "./App.css";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { AuthenticationGuard } from "./config/AuthenticationGuard.tsx";
import { useEffect, useState, Suspense, lazy } from "react";
import axiosInstance from "./config/axios-config.ts";
import {
  ACCESS_TOKEN,
  LANGUAGE,
  LOGGED_IN_VIA,
  REFRESH_TOKEN,
} from "./utils/constants.ts";
import { useAuth } from "./config/AuthContext.tsx";
import EditUserProfile from "./routes/edit-user-profile/EditUserProfile.tsx";
import UserProfile from "./routes/user-profile/UserProfile.tsx";
import { useAuth0 } from "@auth0/auth0-react";
import { setFontVariables } from "./config/commonConfigs.ts";
import Sheets from "./routes/sheets/Sheets.tsx";
import SheetChapters from "./routes/chapterV2/SheetChapters.tsx";
import { AuthLayout } from "./layouts/AuthLayout";
import { SidebarLayout } from "./layouts/SidebarLayout";
import { useTolgee } from "@tolgee/react";
import { changeLanguage } from "./routes/navbar/changeLanguage.ts";

const tokenRefreshIntervalMs =
  Number(import.meta.env.VITE_TOKEN_EXPIRY_TIME_SEC) || 0;
const Collections = lazy(() => import("./routes/collections/Collections.tsx"));
const UserLogin = lazy(() => import("./routes/user-login/UserLogin.tsx"));
const About = lazy(() => import("./routes/about/About.tsx"));
const UserRegistration = lazy(
  () => import("./routes/user-registration/UserRegistration.tsx"),
);
const CommunityPage = lazy(
  () => import("./routes/community/CommunityPage.tsx"),
);
const Texts = lazy(() => import("./routes/texts/Texts.tsx"));
const Works = lazy(() => import("./routes/works/Works.tsx"));
const ChaptersV2 = lazy(() => import("./routes/chapterV2/Chapters.tsx"));
const ResetPassword = lazy(
  () => import("./routes/reset-password/ResetPassword.tsx"),
);
const ForgotPassword = lazy(
  () => import("./routes/forgot-password/ForgotPassword.tsx"),
);
const SearchResultsPage = lazy(
  () => import("./routes/search/SearchResultsPage.tsx"),
);
const ChatLayout = lazy(() => import("./routes/chat/ChatLayout.tsx"));
const ChatThread = lazy(() => import("./routes/chat/ChatThread.tsx"));
const InitialChat = lazy(
  () =>
    import("./routes/chat/components/molecules/InitialChat/InitialChat.tsx"),
);
const Planviewer = lazy(() => import("./routes/planviewer/Planviewer.tsx"));
const Home = lazy(() => import("./routes/home/Home.tsx"));
const PrivacyPolicy = lazy(
  () => import("./routes/privacy-policy/PrivacyPolicy.tsx"),
);
const TermsOfService = lazy(
  () => import("./routes/terms-of-service/TermsOfService.tsx"),
);
const DeleteAccount = lazy(
  () => import("./routes/delete-account/DeleteAccount.tsx"),
);
const AppShare = lazy(() => import("./routes/app-share/AppShare.tsx"));
const OpenApp = lazy(() => import("./routes/app-open/OpenApp.tsx"));
const OpenReader = lazy(() => import("./routes/open-reader/OpenReader.tsx"));
const LiveEvents = lazy(() => import("./routes/live-events/LiveEvents.tsx"));
const LiveEventDetail = lazy(
  () => import("./routes/live-events/LiveEventDetail.tsx"),
);
const LiveRecitationPage = lazy(
  () => import("./routes/live-events/LiveRecitationPage.tsx"),
);
const GroupPage = lazy(() => import("./routes/groups/GroupPage.tsx"));
const GroupsPage = lazy(() => import("./routes/groups/GroupsPage.tsx"));
const VerseOfTheDayPage = lazy(
  () => import("./routes/verse-of-the-day/VerseOfTheDayPage.tsx"),
);

type Auth0UserType = {
  getAccessTokenSilently: (options?: {
    authorizationParams?: { audience?: string };
    cacheMode?: "on" | "off" | "cache-only";
  }) => Promise<string>;
  getIdTokenClaims: () => Promise<
    | ({ __raw?: string; exp?: number; email?: string } & Record<
        string,
        unknown
      >)
    | undefined
  >;
  isAuthenticated: boolean;
  logout: (options?: { logoutParams?: { returnTo: string } }) => Promise<void>;
};

function parseJwtHeader(token: string): { kid?: string } | null {
  try {
    const encoded = token.split(".")[0]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!encoded) return null;
    return JSON.parse(atob(encoded)) as { kid?: string };
  } catch {
    return null;
  }
}

type AuthUserType = {
  login: (token: string) => void;
  isLoggedIn: boolean;
  logout: () => void;
  setIsTokenReady: (ready: boolean) => void;
};
function App() {
  const navigate = useNavigate();
  const {
    login,
    isLoggedIn,
    logout: pechaLogout,
    setIsTokenReady,
  } = useAuth() as AuthUserType;
  const [intervalId, setIntervalId] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const { getAccessTokenSilently, getIdTokenClaims, isAuthenticated, logout } =
    useAuth0() as Auth0UserType;
  const { data: auth0Provider } = useQuery(
    ["auth0Provider"],
    async () => {
      const { data } = await axiosInstance.get("/api/v1/props");
      return data as { audience?: string };
    },
    {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
  const [searchParams] = useSearchParams();
  const tolgee = useTolgee(["language"]);
  const queryClient = useQueryClient();
  const [hasInitializedLanguage, setHasInitializedLanguage] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !auth0Provider?.audience) {
      setIsTokenReady(false);
      return;
    }

    let cancelled = false;

    const syncAccessToken = async () => {
      try {
        let token: string | undefined;

        try {
          const accessToken = await getAccessTokenSilently({
            authorizationParams: {
              audience: auth0Provider?.audience,
            },
            cacheMode: "off",
          });
          const header = parseJwtHeader(accessToken);
          if (header?.kid) {
            token = accessToken;
          }
        } catch {
          token = undefined;
        }

        if (!token) {
          const claims = await getIdTokenClaims();
          const idToken = claims?.__raw;
          if (!idToken || Date.now() >= (claims?.exp ?? 0) * 1000) {
            throw new Error("No valid Auth0 token available");
          }
          token = idToken;
        }

        if (!cancelled) {
          sessionStorage.setItem(ACCESS_TOKEN, token);
          setIsTokenReady(true);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setIsTokenReady(false);
        console.error("Error fetching access token:", error);
        localStorage.removeItem(LOGGED_IN_VIA);
        sessionStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        isLoggedIn && pechaLogout();
        await logout({
          logoutParams: {
            returnTo: window.location.origin + "/",
          },
        });
      }
    };

    syncAccessToken();
    const interval = setInterval(
      syncAccessToken,
      tokenRefreshIntervalMs || 60_000,
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, auth0Provider?.audience]);

  const loginMutation = useMutation(
    async (refreshToken: string) => {
      const response = await axiosInstance.post("/api/v1/auth/refresh-token", {
        token: refreshToken,
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        sessionStorage.setItem(ACCESS_TOKEN, data.access_token);
        login(data.access_token);
        if (!intervalId) {
          startTokenRefreshCounter();
        }
      },
      onError: () => {
        sessionStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(LOGGED_IN_VIA);
        localStorage.removeItem(REFRESH_TOKEN);
        navigate("/login");
      },
    },
  );

  const startTokenRefreshCounter = () => {
    const interval = setInterval(() => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN);
      if (refreshToken) {
        loginMutation.mutate(refreshToken);
      }
    }, tokenRefreshIntervalMs);
    setIntervalId(interval);
  };

  useEffect(() => {
    const loginMethod = localStorage.getItem(LOGGED_IN_VIA);
    if (loginMethod === "pecha") {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN);
      if (refreshToken) {
        loginMutation.mutate(refreshToken);
      }
    }

    setFontVariables(localStorage.getItem(LANGUAGE) || "en");
  }, []);

  // Handle language parameter on first load
  useEffect(() => {
    const langParam = searchParams.get("lang");
    if (langParam && !hasInitializedLanguage) {
      // Validate the language parameter against supported languages
      const supportedLanguages = ["en", "bo-IN", "zh-Hans-CN"];
      if (supportedLanguages.includes(langParam)) {
        changeLanguage(langParam, queryClient, tolgee);
        setHasInitializedLanguage(true);
      }
    }
  }, [searchParams, hasInitializedLanguage, queryClient, tolgee]);

  return (
    <Suspense>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/app/share" element={<AppShare />} />
          {/* App links the app did not open: send the phone to its store.
              /open/reader/:textId is more specific, so it still wins. */}
          <Route path="/open" element={<OpenApp />} />
          <Route path="/open/*" element={<OpenApp />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/delete-account" element={<DeleteAccount />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/register" element={<UserRegistration />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/ai"
            element={<AuthenticationGuard component={ChatLayout} />}
          >
            <Route path="new" element={<InitialChat />} />
            <Route path=":threadId" element={<ChatThread />} />
          </Route>
        </Route>

        {/* A stage of its own: the live text fills the screen, with no site
            chrome around it. */}
        <Route
          path="/live/:eventId/recitation"
          element={<LiveRecitationPage />}
        />

        {/* Full-height readers in the same shell, minus the footer: the page
            fills the space between the bars and scrolls inside it. */}
        <Route element={<SidebarLayout reader />}>
          <Route path="/sheets/:id" element={<Sheets />} />
          <Route path="/chapter" element={<ChaptersV2 />} />
          <Route path="/open/reader/:textId" element={<OpenReader />} />
          <Route
            path="/:username/:sheetSlugAndId"
            element={<SheetChapters />}
          />
        </Route>

        {/* App-style shell: sidebar navigation on the left, page on the right. */}
        <Route element={<SidebarLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/verse-of-the-day" element={<VerseOfTheDayPage />} />
          <Route path="/plans" element={<Planviewer />} />
          <Route path="/live" element={<LiveEvents />} />
          <Route path="/live/:eventId" element={<LiveEventDetail />} />
          <Route path="/groups" element={<GroupsPage />} />
          {/* /group/@{slug}, or /group/{id} from a page that only has the id. */}
          <Route path="/group/:handle" element={<GroupPage />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/about-us" element={<About />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route
            path="/profile"
            element={<AuthenticationGuard component={UserProfile} />}
          />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route
            path="/edit-profile"
            element={<AuthenticationGuard component={EditUserProfile} />}
          />
          <Route path="/note" element={<CommunityPage />} />
          <Route path="/texts/:id" element={<Texts />} />
          <Route path="/works/:id" element={<Works />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
