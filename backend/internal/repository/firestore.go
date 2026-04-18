package repository

import (
	"context"
	"sort"
	"time"

	"cloud.google.com/go/firestore"

	"portfolio-go-firebase/backend/internal/model"
)

type UserRepository struct {
	client *firestore.Client
}

type MessageRepository struct {
	client *firestore.Client
}

func NewUserRepository(client *firestore.Client) *UserRepository {
	return &UserRepository{client: client}
}

func NewMessageRepository(client *firestore.Client) *MessageRepository {
	return &MessageRepository{client: client}
}

func (r *UserRepository) GetByID(ctx context.Context, uid string) (*model.UserDoc, error) {
	doc, err := r.client.Collection("users").Doc(uid).Get(ctx)
	if err != nil || !doc.Exists() {
		return nil, err
	}

	var user model.UserDoc
	if err := doc.DataTo(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) Exists(ctx context.Context, uid string) (bool, error) {
	doc, err := r.client.Collection("users").Doc(uid).Get(ctx)
	if err != nil {
		return false, err
	}
	return doc.Exists(), nil
}

func (r *UserRepository) Create(ctx context.Context, user model.UserDoc) error {
	_, err := r.client.Collection("users").Doc(user.UID).Set(ctx, user)
	return err
}

func (r *MessageRepository) Create(ctx context.Context, msg model.MessageDoc) (*model.MessageDoc, error) {
	ref, _, err := r.client.Collection("messages").Add(ctx, msg)
	if err != nil {
		return nil, err
	}

	msg.ID = ref.ID
	return &msg, nil
}

func (r *MessageRepository) ListByUser(ctx context.Context, uid string) ([]model.MessageDoc, error) {
	iter := r.client.Collection("messages").Where("userId", "==", uid).Documents(ctx)
	return collectMessages(iter)
}

func (r *MessageRepository) ListAll(ctx context.Context) ([]model.MessageDoc, error) {
	iter := r.client.Collection("messages").Documents(ctx)
	return collectMessages(iter)
}

func (r *MessageRepository) SaveReply(ctx context.Context, id, reply string) error {
	now := time.Now()
	_, err := r.client.Collection("messages").Doc(id).Set(ctx, map[string]any{
		"reply":      reply,
		"status":     "answered",
		"answeredAt": now,
	}, firestore.MergeAll)
	return err
}

func collectMessages(iter *firestore.DocumentIterator) ([]model.MessageDoc, error) {
	docs, err := iter.GetAll()
	if err != nil {
		return nil, err
	}

	messages := make([]model.MessageDoc, 0, len(docs))
	for _, doc := range docs {
		var msg model.MessageDoc
		if err := doc.DataTo(&msg); err == nil {
			msg.ID = doc.Ref.ID
			messages = append(messages, msg)
		}
	}

	sort.Slice(messages, func(i, j int) bool {
		return messages[i].CreatedAt.After(messages[j].CreatedAt)
	})

	return messages, nil
}
