package main

import (
	"context"
	"log"

	"portfolio-go-firebase/backend/internal/config"
	httpHandler "portfolio-go-firebase/backend/internal/handler/http"
	"portfolio-go-firebase/backend/internal/repository"
	"portfolio-go-firebase/backend/internal/service"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()

	log.Printf("startup config: %s", cfg.StartupSummary())

	if err := cfg.ValidateCritical(); err != nil {
		log.Fatal(err)
	}

	for _, warning := range httpHandler.StaticAssetWarnings(cfg) {
		log.Printf("startup warning: %s", warning)
	}

	log.Printf("initializing firebase")
	authClient, firestoreClient, err := config.InitFirebase(ctx, cfg)
	if err != nil {
		log.Fatalf("failed to initialize firebase (project_id=%q credentials_path=%q): %v", cfg.ProjectID, cfg.CredentialsPath, err)
	}
	defer firestoreClient.Close()
	log.Printf("firebase initialized successfully")

	userRepo := repository.NewUserRepository(firestoreClient)
	messageRepo := repository.NewMessageRepository(firestoreClient)
	appService := service.NewAppService(authClient, userRepo, messageRepo)

	router := httpHandler.NewRouter(cfg, appService)
	server := httpHandler.Server(cfg, router)

	log.Printf("server listening on :%s", cfg.Port)
	log.Fatal(server.ListenAndServe())
}
