package config

import (
	"context"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	auth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type Config struct {
	Port            string
	StaticDir       string
	ResumePath      string
	CredentialsPath string
	ProjectID       string
	AllowedOrigins  []string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{
		Port:            port,
		StaticDir:       envOrDefault("STATIC_DIR", "frontend/public"),
		ResumePath:      envOrDefault("RESUME_PATH", "docs/Resume.pdf"),
		CredentialsPath: credentialsPath(),
		ProjectID:       os.Getenv("FIREBASE_PROJECT_ID"),
		AllowedOrigins:  csvEnv("CORS_ALLOWED_ORIGINS"),
	}
}

func InitFirebase(ctx context.Context, cfg Config) (*auth.Client, *firestore.Client, error) {
	opt := option.WithCredentialsFile(cfg.CredentialsPath)
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: cfg.ProjectID}, opt)
	if err != nil {
		return nil, nil, err
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, nil, err
	}

	fs, err := app.Firestore(ctx)
	if err != nil {
		return nil, nil, err
	}

	return authClient, fs, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func csvEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	return origins
}

func credentialsPath() string {
	if path := os.Getenv("FIREBASE_CREDENTIALS_PATH"); path != "" {
		return path
	}

	renderPath := "/etc/secrets/serviceAccountKey.json"
	if _, err := os.Stat(renderPath); err == nil {
		return renderPath
	}

	swarmSecretPath := "/run/secrets/serviceAccountKey.json"
	if _, err := os.Stat(swarmSecretPath); err == nil {
		return swarmSecretPath
	}

	return "firebase/serviceAccountKey.json"
}
