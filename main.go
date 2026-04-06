package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	auth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type App struct {
	authClient *auth.Client
	fs         *firestore.Client
}

type UserDoc struct {
	UID       string    `firestore:"uid" json:"uid"`
	Name      string    `firestore:"name" json:"name"`
	Email     string    `firestore:"email" json:"email"`
	Role      string    `firestore:"role" json:"role"`
	CreatedAt time.Time `firestore:"createdAt" json:"createdAt"`
}

type MessageDoc struct {
	ID         string     `json:"id"`
	UserID     string     `firestore:"userId" json:"userId"`
	UserEmail  string     `firestore:"userEmail" json:"userEmail"`
	Subject    string     `firestore:"subject" json:"subject"`
	Text       string     `firestore:"text" json:"text"`
	Reply      string     `firestore:"reply" json:"reply"`
	Status     string     `firestore:"status" json:"status"`
	CreatedAt  time.Time  `firestore:"createdAt" json:"createdAt"`
	AnsweredAt *time.Time `firestore:"answeredAt" json:"answeredAt,omitempty"`
}

type AuthUser struct {
	UID   string `json:"uid"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type BootstrapPayload struct {
	Name string `json:"name"`
}

type CreateMessagePayload struct {
	Subject string `json:"subject"`
	Text    string `json:"text"`
}

type ReplyPayload struct {
	ID    string `json:"id"`
	Reply string `json:"reply"`
}

func noCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		next.ServeHTTP(w, r)
	})
}
func main() {
	ctx := context.Background()

	opt := option.WithCredentialsFile("firebase/serviceAccountKey.json")
	conf := &firebase.Config{
		ProjectID: os.Getenv("FIREBASE_PROJECT_ID"),
	}

	app, err := firebase.NewApp(ctx, conf, opt)
	if err != nil {
		log.Fatal(err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatal(err)
	}

	fs, err := app.Firestore(ctx)
	if err != nil {
		log.Fatal(err)
	}
	defer fs.Close()

	a := &App{
		authClient: authClient,
		fs:         fs,
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/bootstrap-user", a.bootstrapUserHandler)
	mux.HandleFunc("/api/me", a.meHandler)
	mux.HandleFunc("/api/messages", a.messagesHandler)
	mux.HandleFunc("/api/admin/messages", a.adminMessagesHandler)
	mux.HandleFunc("/api/admin/reply", a.adminReplyHandler)

	mux.Handle("/auth.html", noCache(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "public/auth.html")
	})))

	mux.Handle("/dashboard.html", noCache(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "public/dashboard.html")
	})))

	mux.Handle("/admin.html", noCache(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "public/admin.html")
	})))

	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			http.ServeFile(w, r, "public/index.html")
			return
		}
		http.FileServer(http.Dir("public")).ServeHTTP(w, r)
	}))

	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
	}
	mux.HandleFunc("/Resume.pdf", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./Resume.pdf")
	})
	fmt.Println("Server running at http://localhost:8080")
	log.Fatal(server.ListenAndServe())
}

func (a *App) verifyRequest(r *http.Request) (*AuthUser, error) {
	ctx := context.Background()

	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, fmt.Errorf("missing bearer token")
	}

	idToken := strings.TrimPrefix(authHeader, "Bearer ")
	token, err := a.authClient.VerifyIDToken(ctx, idToken)
	if err != nil {
		return nil, fmt.Errorf("invalid token")
	}

	name := ""
	if v, ok := token.Claims["name"].(string); ok {
		name = v
	}

	role := "user"
	doc, err := a.fs.Collection("users").Doc(token.UID).Get(ctx)
	if err == nil && doc.Exists() {
		var userDoc UserDoc
		if err := doc.DataTo(&userDoc); err == nil && userDoc.Role != "" {
			role = userDoc.Role
			if userDoc.Name != "" {
				name = userDoc.Name
			}
		}
	}

	return &AuthUser{
		UID:   token.UID,
		Email: token.Claims["email"].(string),
		Name:  name,
		Role:  role,
	}, nil
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func decodeJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

func (a *App) bootstrapUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := a.verifyRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	var payload BootstrapPayload
	_ = decodeJSON(r, &payload)

	ctx := context.Background()
	ref := a.fs.Collection("users").Doc(user.UID)

	doc, err := ref.Get(ctx)
	if err == nil && doc.Exists() {
		writeJSON(w, http.StatusOK, map[string]string{"status": "exists"})
		return
	}

	name := strings.TrimSpace(payload.Name)
	if name == "" {
		name = user.Name
	}
	if name == "" {
		name = "User"
	}

	userDoc := UserDoc{
		UID:       user.UID,
		Name:      name,
		Email:     user.Email,
		Role:      "user",
		CreatedAt: time.Now(),
	}

	_, err = ref.Set(ctx, userDoc)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create user"})
		return
	}

	writeJSON(w, http.StatusOK, userDoc)
}

func (a *App) meHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := a.verifyRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (a *App) messagesHandler(w http.ResponseWriter, r *http.Request) {
	user, err := a.verifyRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	ctx := context.Background()

	switch r.Method {
	case http.MethodPost:
		var payload CreateMessagePayload
		if err := decodeJSON(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad payload"})
			return
		}

		subject := strings.TrimSpace(payload.Subject)
		text := strings.TrimSpace(payload.Text)

		if subject == "" || text == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "subject and text are required"})
			return
		}

		msg := MessageDoc{
			UserID:    user.UID,
			UserEmail: user.Email,
			Subject:   subject,
			Text:      text,
			Reply:     "",
			Status:    "pending",
			CreatedAt: time.Now(),
		}

		ref, _, err := a.fs.Collection("messages").Add(ctx, msg)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to save message"})
			return
		}

		msg.ID = ref.ID
		writeJSON(w, http.StatusCreated, msg)

	case http.MethodGet:
		iter := a.fs.Collection("messages").Where("userId", "==", user.UID).Documents(ctx)
		docs, err := iter.GetAll()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch messages"})
			return
		}

		var messages []MessageDoc
		for _, doc := range docs {
			var m MessageDoc
			if err := doc.DataTo(&m); err == nil {
				m.ID = doc.Ref.ID
				messages = append(messages, m)
			}
		}

		sort.Slice(messages, func(i, j int) bool {
			return messages[i].CreatedAt.After(messages[j].CreatedAt)
		})

		writeJSON(w, http.StatusOK, messages)

	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (a *App) adminMessagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := a.verifyRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	if user.Role != "admin" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin only"})
		return
	}

	ctx := context.Background()
	iter := a.fs.Collection("messages").Documents(ctx)
	docs, err := iter.GetAll()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch messages"})
		return
	}

	var messages []MessageDoc
	for _, doc := range docs {
		var m MessageDoc
		if err := doc.DataTo(&m); err == nil {
			m.ID = doc.Ref.ID
			messages = append(messages, m)
		}
	}

	sort.Slice(messages, func(i, j int) bool {
		return messages[i].CreatedAt.After(messages[j].CreatedAt)
	})

	writeJSON(w, http.StatusOK, messages)
}

func (a *App) adminReplyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	user, err := a.verifyRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	if user.Role != "admin" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin only"})
		return
	}

	var payload ReplyPayload
	if err := decodeJSON(r, &payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bad payload"})
		return
	}

	reply := strings.TrimSpace(payload.Reply)
	if payload.ID == "" || reply == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id and reply are required"})
		return
	}

	now := time.Now()
	_, err = a.fs.Collection("messages").Doc(payload.ID).Set(context.Background(), map[string]any{
		"reply":      reply,
		"status":     "answered",
		"answeredAt": now,
	}, firestore.MergeAll)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to save reply"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
