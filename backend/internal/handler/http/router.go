package http

import (
	"encoding/json"
	"fmt"
	stdhttp "net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"portfolio-go-firebase/backend/internal/config"
	"portfolio-go-firebase/backend/internal/model"
	"portfolio-go-firebase/backend/internal/service"
)

var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)
)

func init() {
	prometheus.MustRegister(httpRequestsTotal)
	prometheus.MustRegister(httpRequestDuration)
}

type Handler struct {
	service   *service.AppService
	staticDir string
	resumePDF string
}

func NewRouter(cfg config.Config, appService *service.AppService) stdhttp.Handler {
	h := &Handler{
		service:   appService,
		staticDir: cfg.StaticDir,
		resumePDF: cfg.ResumePath,
	}

	mux := stdhttp.NewServeMux()

	mux.HandleFunc("/api/bootstrap-user", instrumentHandler("/api/bootstrap-user", h.bootstrapUser))
	mux.HandleFunc("/api/me", instrumentHandler("/api/me", h.me))
	mux.HandleFunc("/api/messages", instrumentHandler("/api/messages", h.messages))
	mux.HandleFunc("/api/admin/messages", instrumentHandler("/api/admin/messages", h.adminMessages))
	mux.HandleFunc("/api/admin/reply", instrumentHandler("/api/admin/reply", h.adminReply))

	mux.HandleFunc("/healthz", func(w stdhttp.ResponseWriter, _ *stdhttp.Request) {
		w.WriteHeader(stdhttp.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mux.Handle("/metrics", promhttp.Handler())
	mux.Handle("/metrics/", promhttp.Handler())
	mux.HandleFunc("/Resume.pdf", func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		stdhttp.ServeFile(w, r, h.resumePDF)
	})

	mux.Handle("/auth", noCache(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		stdhttp.ServeFile(w, r, filepath.Join(h.staticDir, "auth.html"))
	})))
	mux.Handle("/auth/ru", noCache(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		stdhttp.ServeFile(w, r, filepath.Join(h.staticDir, "auth_ru.html"))
	})))
	mux.Handle("/dashboard", noCache(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		stdhttp.ServeFile(w, r, filepath.Join(h.staticDir, "dashboard.html"))
	})))
	mux.Handle("/dashboard/ru", noCache(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		stdhttp.ServeFile(w, r, filepath.Join(h.staticDir, "dashboard_ru.html"))
	})))
	mux.Handle("/admin", noCache(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		stdhttp.ServeFile(w, r, filepath.Join(h.staticDir, "admin.html"))
	})))

	fileServer := stdhttp.FileServer(stdhttp.Dir(h.staticDir))
	mux.Handle("/", stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			stdhttp.ServeFile(w, r, filepath.Join(h.staticDir, "index.html"))
			return
		}
		fileServer.ServeHTTP(w, r)
	}))
	mux.Handle("/ru", stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		if r.URL.Path == "/ru" || r.URL.Path == "/index_ru.html" {
			stdhttp.ServeFile(w, r, filepath.Join(h.staticDir, "index_ru.html"))
			return
		}
		fileServer.ServeHTTP(w, r)
	}))

	return withCORS(cfg, mux)
}

func Server(cfg config.Config, handler stdhttp.Handler) *stdhttp.Server {
	return &stdhttp.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
	}
}

func (h *Handler) bootstrapUser(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		writeJSON(w, stdhttp.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := h.service.VerifyRequest(requestAdapter{r})
	if err != nil {
		writeJSON(w, stdhttp.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	var payload model.BootstrapPayload
	_ = decodeJSON(r, &payload)

	userDoc, exists, err := h.service.BootstrapUser(user, payload)
	if err != nil {
		writeJSON(w, stdhttp.StatusInternalServerError, map[string]string{"error": "failed to create user"})
		return
	}
	if exists {
		writeJSON(w, stdhttp.StatusOK, map[string]string{"status": "exists"})
		return
	}

	writeJSON(w, stdhttp.StatusOK, userDoc)
}

func (h *Handler) me(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		writeJSON(w, stdhttp.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := h.service.VerifyRequest(requestAdapter{r})
	if err != nil {
		writeJSON(w, stdhttp.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, stdhttp.StatusOK, user)
}

func (h *Handler) messages(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	user, err := h.service.VerifyRequest(requestAdapter{r})
	if err != nil {
		writeJSON(w, stdhttp.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	switch r.Method {
	case stdhttp.MethodPost:
		var payload model.CreateMessagePayload
		if err := decodeJSON(r, &payload); err != nil {
			writeJSON(w, stdhttp.StatusBadRequest, map[string]string{"error": "bad payload"})
			return
		}

		message, err := h.service.CreateMessage(user, payload)
		if err != nil {
			writeServiceError(w, err, "failed to save message")
			return
		}

		writeJSON(w, stdhttp.StatusCreated, message)
	case stdhttp.MethodGet:
		messages, err := h.service.ListUserMessages(user)
		if err != nil {
			writeJSON(w, stdhttp.StatusInternalServerError, map[string]string{"error": "failed to fetch messages"})
			return
		}

		writeJSON(w, stdhttp.StatusOK, messages)
	default:
		writeJSON(w, stdhttp.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (h *Handler) adminMessages(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		writeJSON(w, stdhttp.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := h.service.VerifyRequest(requestAdapter{r})
	if err != nil {
		writeJSON(w, stdhttp.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	messages, err := h.service.ListAdminMessages(user)
	if err != nil {
		writeServiceError(w, err, "failed to fetch messages")
		return
	}

	writeJSON(w, stdhttp.StatusOK, messages)
}

func (h *Handler) adminReply(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		writeJSON(w, stdhttp.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := h.service.VerifyRequest(requestAdapter{r})
	if err != nil {
		writeJSON(w, stdhttp.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	var payload model.ReplyPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeJSON(w, stdhttp.StatusBadRequest, map[string]string{"error": "bad payload"})
		return
	}

	if err := h.service.SaveAdminReply(user, payload); err != nil {
		writeServiceError(w, err, "failed to save reply")
		return
	}

	writeJSON(w, stdhttp.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w stdhttp.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func decodeJSON(r *stdhttp.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

func writeServiceError(w stdhttp.ResponseWriter, err error, fallback string) {
	var requestErr service.RequestError
	if ok := asRequestError(err, &requestErr); ok {
		writeJSON(w, requestErr.Status, map[string]string{"error": requestErr.Message})
		return
	}
	writeJSON(w, stdhttp.StatusInternalServerError, map[string]string{"error": fallback})
}

func asRequestError(err error, target *service.RequestError) bool {
	requestErr, ok := err.(service.RequestError)
	if !ok {
		return false
	}
	*target = requestErr
	return true
}

type requestAdapter struct {
	request *stdhttp.Request
}

func (r requestAdapter) AuthorizationHeader() string {
	return r.request.Header.Get("Authorization")
}

type responseWriter struct {
	stdhttp.ResponseWriter
	statusCode int
}

func newResponseWriter(w stdhttp.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: stdhttp.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func instrumentHandler(endpoint string, next stdhttp.HandlerFunc) stdhttp.HandlerFunc {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		start := time.Now()
		rw := newResponseWriter(w)

		next.ServeHTTP(rw, r)

		duration := time.Since(start).Seconds()
		status := fmt.Sprintf("%d", rw.statusCode)

		httpRequestsTotal.WithLabelValues(r.Method, endpoint, status).Inc()
		httpRequestDuration.WithLabelValues(r.Method, endpoint).Observe(duration)
	}
}

func noCache(next stdhttp.Handler) stdhttp.Handler {
	return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		next.ServeHTTP(w, r)
	})
}

func EnsurePaths(cfg config.Config) error {
	if _, err := os.Stat(cfg.StaticDir); err != nil {
		return fmt.Errorf("static dir not found: %w", err)
	}
	if _, err := os.Stat(cfg.ResumePath); err != nil {
		return fmt.Errorf("resume file not found: %w", err)
	}
	return nil
}
