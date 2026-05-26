FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o api cmd/api/main.go

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/api /usr/local/bin/api
COPY --from=builder /app/internal/db/migrations /etc/dashboard/migrations
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api"]