package model

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
