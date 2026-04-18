package model

import "time"

type UserDoc struct {
	UID       string    `firestore:"uid" json:"uid"`
	Name      string    `firestore:"name" json:"name"`
	Email     string    `firestore:"email" json:"email"`
	Role      string    `firestore:"role" json:"role"`
	CreatedAt time.Time `firestore:"createdAt" json:"createdAt"`
}

type AuthUser struct {
	UID   string `json:"uid"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}
