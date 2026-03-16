import l, { useCallback as o, useRef as s, useState as r } from "react";
import { G as API } from './index-CMyf1SnD.js';
import f from "./storage-constants.js";
import u from "./storage.js";
import { isBiometricAvailable, enableBiometric } from "./biometric.js";
import e from "react/jsx-runtime";

export function LoginPage({ onSuccess: c }) {
  const [showFaceIdPrompt, setShowFaceIdPrompt] = r(false);
  const v = s(null);
  const [username, setUsername] = r("");
  const [password, setPassword] = r("");
  const [error, setError] = r("");

  const acceptEnableFaceId = async () => {
    setShowFaceIdPrompt(false);
    u.set(f.TASK_RTL_ENABLED + "_bio_prompted", "true");
    try {
      await enableBiometric({ token: u.get(f.AUTH_TOKEN), username: u.get(f.AUTH_USER) });
    } catch {}
    c(u.get(f.AUTH_TOKEN), u.get(f.AUTH_USER), u.get(f.AUTH_ROLE));
  };

  const declineEnableFaceId = () => {
    setShowFaceIdPrompt(false);
    u.set(f.TASK_RTL_ENABLED + "_bio_prompted", "true");
    c(u.get(f.AUTH_TOKEN), u.get(f.AUTH_USER), u.get(f.AUTH_ROLE));
  };

  const onLogin = o(
    async (e2) => {
      e2.preventDefault();
      setError("");
      try {
        const t = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        }).then((res) => res.json());
        if (t.error) {
          setError(t.error);
          return;
        }
        u.set(f.AUTH_TOKEN, t.token);
        u.set(f.AUTH_USER, username);
        u.set(f.AUTH_ROLE, t.role);
        try {
          const avail = await isBiometricAvailable();
          if (avail) {
            const alreadyPrompted = u.get(f.TASK_RTL_ENABLED + "_bio_prompted") === "true";
            if (!alreadyPrompted) {
              setShowFaceIdPrompt(true);
            } else {
              await enableBiometric({ token: t.token, username: username });
            }
          }
        } catch {
          /* ignore biometric errors */
        }
        c(t.token, username, t.role);
      } catch (e3) {
        setError("Login failed");
      }
    },
    [username, password, c]
  );

  const onBiometricSignin = o(
    async () => {
      try {
        const res = await enableBiometric();
        if (!res.token || !res.username) {
          setError("Biometric sign-in failed");
          return;
        }
        const refreshOk = await (async () => {
          try {
            const resp = await fetch(`${API}/auth/refresh`, {
              headers: { Authorization: `Bearer ${res.token}` }
            });
            if (!resp.ok) return false;
            const data = await resp.json().catch(() => ({}));
            if (data && data.token) {
              u.set(f.AUTH_TOKEN, data.token);
            }
            return true;
          } catch {
            return false;
          }
        })();
        u.set(f.AUTH_TOKEN, u.get(f.AUTH_TOKEN) || res.token);
        u.set(f.AUTH_USER, res.username);
        u.set(f.AUTH_ROLE, res.role || "");
        c(u.get(f.AUTH_TOKEN), u.get(f.AUTH_USER), u.get(f.AUTH_ROLE));
      } catch {
        setError("Biometric sign-in error");
      }
    },
    [c]
  );

  return e.jsxs(e.Fragment, {
    children: [
      showFaceIdPrompt &&
        e.jsxs("div", {
          style: {
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          },
          children: [
            e.jsxs("div", {
              style: {
                background: "white",
                padding: "24px",
                borderRadius: "12px",
                maxWidth: "360px",
                width: "90%"
              },
              children: [
                e.jsx("h3", { style: { marginTop: 0 }, children: "Enable Face ID sign-in?" }),
                e.jsx("p", {
                  style: { color: "#555" },
                  children: "Use Face ID to sign in without a password on this device."
                }),
                e.jsxs("div", {
                  style: { display: "flex", gap: "8px", justifyContent: "flex-end" },
                  children: [
                    e.jsx("button", {
                      onClick: declineEnableFaceId,
                      style: {
                        padding: "10px 16px",
                        background: "transparent",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        cursor: "pointer"
                      },
                      children: "Not now"
                    }),
                    e.jsx("button", {
                      onClick: acceptEnableFaceId,
                      style: {
                        padding: "10px 16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      },
                      children: "Enable"
                    })
                  ]
                })
              ]
            })
          ]
        }),
      e.jsxs("div", {
        className: "login-container",
        children: [
          e.jsx("h2", { children: "Sign In" }),
          e.jsx(
            "form",
            {
              onSubmit: onLogin,
              children: e.jsxs("div", {
                children: [
                  e.jsx("input", {
                    type: "text",
                    placeholder: "Username",
                    value: username,
                    onChange: (e2) => setUsername(e2.target.value),
                    ref: v
                  }),
                  e.jsx("input", {
                    type: "password",
                    placeholder: "Password",
                    value: password,
                    onChange: (e2) => setPassword(e2.target.value)
                  }),
                  error && e.jsx("div", { className: "error", children: error }),
                  e.jsx(
                    "button",
                    {
                      type: "submit",
                      children: "Sign In"
                    }
                  )
                ]
              })
            }
          ),
          e.jsx(
            "button",
            {
              onClick: onBiometricSignin,
              className: "biometric-button",
              children: "Sign In with Face ID"
            }
          )
        ]
      })
    ]
  });
}
