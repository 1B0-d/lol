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

	if err := httpHandler.EnsurePaths(cfg); err != nil {
		log.Fatal(err)
	}

	authClient, firestoreClient, err := config.InitFirebase(ctx, cfg)
	if err != nil {
		log.Fatalf("failed to initialize firebase: %v", err)
	}
	defer firestoreClient.Close()

	userRepo := repository.NewUserRepository(firestoreClient)
	messageRepo := repository.NewMessageRepository(firestoreClient)
	appService := service.NewAppService(authClient, userRepo, messageRepo)

	router := httpHandler.NewRouter(cfg, appService)
	server := httpHandler.Server(cfg, router)

	log.Printf("server running on http://localhost:%s", cfg.Port)
	log.Fatal(server.ListenAndServe())
}
