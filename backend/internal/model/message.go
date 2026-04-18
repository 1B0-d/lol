package model

import "time"

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
