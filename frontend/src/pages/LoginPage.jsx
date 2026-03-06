import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogleCredential } from "../services/authService";

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

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const buttonRef = useRef(null);

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
            try {
              setError("");
              const user = await loginWithGoogleCredential(response.credential);
              onLogin?.(user);
              navigate(user.role === "admin" ? "/admin" : "/");
            } catch (err) {
              setError(err.response?.data?.message || "Google login failed");
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
      <div ref={buttonRef} />
    </section>
  );
};

export default LoginPage;
