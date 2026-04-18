package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	auth "firebase.google.com/go/v4/auth"

	"portfolio-go-firebase/backend/internal/model"
	"portfolio-go-firebase/backend/internal/repository"
)

type AppService struct {
	authClient *auth.Client
	users      *repository.UserRepository
	messages   *repository.MessageRepository
}

func NewAppService(authClient *auth.Client, users *repository.UserRepository, messages *repository.MessageRepository) *AppService {
	return &AppService{
		authClient: authClient,
		users:      users,
		messages:   messages,
	}
}

func (s *AppService) VerifyRequest(r AuthorizationHeaderProvider) (*model.AuthUser, error) {
	ctx := context.Background()

	authHeader := r.AuthorizationHeader()
	if !strings.HasPrefix(authHeader, "Bearer ") {
		log.Printf("verify request failed: missing bearer token")
		return nil, fmt.Errorf("missing bearer token")
	}

	idToken := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := s.authClient.VerifyIDToken(ctx, idToken)
	if err != nil {
		log.Printf("verify request failed: verify id token: %v", err)
		return nil, fmt.Errorf("invalid token")
	}

	name := stringClaim(token.Claims, "name")
	role := "user"

	userDoc, err := s.users.GetByID(ctx, token.UID)
	if err == nil && userDoc != nil {
		if userDoc.Role != "" {
			role = userDoc.Role
		}
		if userDoc.Name != "" {
			name = userDoc.Name
		}
	}

	return &model.AuthUser{
		UID:   token.UID,
		Email: stringClaim(token.Claims, "email"),
		Name:  name,
		Role:  role,
	}, nil
}

func (s *AppService) BootstrapUser(user *model.AuthUser, payload model.BootstrapPayload) (*model.UserDoc, bool, error) {
	ctx := context.Background()

	exists, err := s.users.Exists(ctx, user.UID)
	if err == nil && exists {
		return nil, true, nil
	}

	name := strings.TrimSpace(payload.Name)
	if name == "" {
		name = user.Name
	}
	if name == "" {
		name = "User"
	}

	userDoc := model.UserDoc{
		UID:       user.UID,
		Name:      name,
		Email:     user.Email,
		Role:      "user",
		CreatedAt: time.Now(),
	}

	if err := s.users.Create(ctx, userDoc); err != nil {
		return nil, false, err
	}

	return &userDoc, false, nil
}

func (s *AppService) CreateMessage(user *model.AuthUser, payload model.CreateMessagePayload) (*model.MessageDoc, error) {
	subject := strings.TrimSpace(payload.Subject)
	text := strings.TrimSpace(payload.Text)
	if subject == "" || text == "" {
		return nil, ErrBadRequest("subject and text are required")
	}

	msg := model.MessageDoc{
		UserID:    user.UID,
		UserEmail: user.Email,
		Subject:   subject,
		Text:      text,
		Reply:     "",
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	return s.messages.Create(context.Background(), msg)
}

func (s *AppService) ListUserMessages(user *model.AuthUser) ([]model.MessageDoc, error) {
	return s.messages.ListByUser(context.Background(), user.UID)
}

func (s *AppService) ListAdminMessages(user *model.AuthUser) ([]model.MessageDoc, error) {
	if user.Role != "admin" {
		return nil, ErrForbidden("admin only")
	}
	return s.messages.ListAll(context.Background())
}

func (s *AppService) SaveAdminReply(user *model.AuthUser, payload model.ReplyPayload) error {
	if user.Role != "admin" {
		return ErrForbidden("admin only")
	}

	reply := strings.TrimSpace(payload.Reply)
	if payload.ID == "" || reply == "" {
		return ErrBadRequest("id and reply are required")
	}

	return s.messages.SaveReply(context.Background(), payload.ID, reply)
}

type AuthorizationHeaderProvider interface {
	AuthorizationHeader() string
}

type RequestError struct {
	Message string
	Status  int
}

func (e RequestError) Error() string {
	return e.Message
}

func ErrBadRequest(message string) error {
	return RequestError{Message: message, Status: 400}
}

func ErrForbidden(message string) error {
	return RequestError{Message: message, Status: 403}
}

func stringClaim(claims map[string]any, key string) string {
	value, _ := claims[key].(string)
	return value
}
