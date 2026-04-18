package config

import (
	"context"
	"fmt"
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

func (c Config) ValidateCritical() error {
	var issues []string

	if strings.TrimSpace(c.ProjectID) == "" {
		issues = append(issues, "FIREBASE_PROJECT_ID is not set")
	}

	if strings.TrimSpace(c.CredentialsPath) == "" {
		issues = append(issues, "FIREBASE_CREDENTIALS_PATH resolved to an empty path")
	} else {
		info, err := os.Stat(c.CredentialsPath)
		if err != nil {
			issues = append(issues, fmt.Sprintf("firebase credentials file not found at %q: %v", c.CredentialsPath, err))
		} else if info.IsDir() {
			issues = append(issues, fmt.Sprintf("firebase credentials path %q points to a directory, not a JSON file", c.CredentialsPath))
		}
	}

	if len(issues) == 0 {
		return nil
	}

	return fmt.Errorf("startup configuration is invalid:\n- %s", strings.Join(issues, "\n- "))
}

func (c Config) StartupSummary() string {
	return fmt.Sprintf(
		"port=%s project_id=%q credentials_path=%q static_dir=%q resume_path=%q cors_allowed_origins=%d",
		c.Port,
		c.ProjectID,
		c.CredentialsPath,
		c.StaticDir,
		c.ResumePath,
		len(c.AllowedOrigins),
	)
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
