package http

import (
	stdhttp "net/http"
	"strings"

	"portfolio-go-firebase/backend/internal/config"
)

func withCORS(cfg config.Config, next stdhttp.Handler) stdhttp.Handler {
	return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		origin := strings.TrimSpace(r.Header.Get("Origin"))
		allowedOrigin, allowed := resolveAllowedOrigin(origin, cfg.AllowedOrigins)

		if allowed {
			headers := w.Header()
			headers.Set("Access-Control-Allow-Origin", allowedOrigin)
			headers.Add("Vary", "Origin")
			headers.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			headers.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			headers.Set("Access-Control-Max-Age", "600")
		}

		if r.Method == stdhttp.MethodOptions {
			if !allowed && origin != "" {
				w.WriteHeader(stdhttp.StatusForbidden)
				return
			}
			w.WriteHeader(stdhttp.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func resolveAllowedOrigin(origin string, allowedOrigins []string) (string, bool) {
	if origin == "" {
		return "", false
	}

	if len(allowedOrigins) == 0 {
		return origin, true
	}

	for _, allowedOrigin := range allowedOrigins {
		if strings.EqualFold(origin, allowedOrigin) {
			return origin, true
		}
	}

	return "", false
}
