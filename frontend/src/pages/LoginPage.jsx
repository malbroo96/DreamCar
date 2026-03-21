import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogleCredential, setStoredUser } from "../services/authService";
import { updateMyProfile } from "../services/userService";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

const reverseGeocodeLocation = async (latitude, longitude) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
  );

  if (!response.ok) {
    throw new Error("Failed to resolve current location");
  }

  const data = await response.json();
  const address = data?.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    "";
  const state = address.state || address.state_district || "";

  return [city, state].filter(Boolean).join(", ").trim();
};

const requestCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const location = await reverseGeocodeLocation(coords.latitude, coords.longitude);
          resolve(location);
        } catch (error) {
          reject(error);
        }
      },
      (error) => reject(error),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });

const toStoredUser = (user) => ({
  id: user.googleId || user.id,
  name: user.name,
  username: user.username,
  googleName: user.googleName,
  email: user.email,
  picture: user.picture,
  role: user.role,
  bio: user.bio,
  phone: user.phone,
  location: user.location,
});

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const buttonRef = useRef(null);
  const authInFlightRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const setupGoogle = async () => {
      try {
        if (!clientId) {
          throw new Error("VITE_GOOGLE_CLIENT_ID is missing");
        }

        await loadGoogleScript();
        if (!mounted || !buttonRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (authInFlightRef.current) return;
            try {
              authInFlightRef.current = true;
              if (mounted) setAuthenticating(true);
              setError("");
              setLocationMessage("");
              let user = await loginWithGoogleCredential(response.credential);

              if (!user.location?.trim()) {
                try {
                  const location = await requestCurrentLocation();
                  if (location) {
                    const updatedUser = await updateMyProfile({ location });
                    user = toStoredUser(updatedUser);
                    setStoredUser(user);
                    setLocationMessage(`Location added: ${location}`);
                  }
                } catch {
                  setLocationMessage("Location permission skipped. You can add it later in your profile.");
                }
              }

              onLogin?.(user);
              navigate(user.role === "admin" ? "/admin" : "/");
            } catch (err) {
              setError(err.response?.data?.message || "Google login failed");
            } finally {
              authInFlightRef.current = false;
              if (mounted) setAuthenticating(false);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 280,
        });
      } catch (err) {
        setError(err.message || "Failed to initialize Google login");
      }
    };

    setupGoogle();
    return () => {
      mounted = false;
    };
  }, [navigate, onLogin]);

  return (
    <section>
      <h1>Sign in</h1>
      <p>Use your Google account to access admin features.</p>
      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}
      {locationMessage ? <p style={{ color: "#2f855a" }}>{locationMessage}</p> : null}
      <div style={{ opacity: authenticating ? 0.6 : 1, pointerEvents: authenticating ? "none" : "auto" }}>
        <div ref={buttonRef} />
      </div>
      {authenticating ? <p>Signing you in...</p> : null}
    </section>
  );
};

export default LoginPage;
