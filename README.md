# WhatsApp Web Client

This project is a WhatsApp Web client built using the `whatsapp-web.js` library and Express.js. It allows for interaction with WhatsApp through a web server, enabling functionalities like sending messages, reading messages from specific chats, and managing authentication via QR codes or session credentials.

## Features

- **Authentication**: Automatically persists session data using LocalAuth.
- **QR Code Login**: Generates and displays a QR code for logging into WhatsApp.
- **Message Management**: Send and read messages from specific chats.
- **Webhook**: Set up a webhook to listen for incoming messages.
- **Session Management**: Load and dump credentials for WhatsApp Web sessions.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/get-npm)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/michavardy/whatsapp_web_server.git
cd whatsapp_web_server
```

## Install dependencies

```bash
npm install
```

## Usage

```bash
npm start
```

- Open your browser and navigate to http://localhost:3000.

- Follow the instructions to scan the QR code displayed in the console or use the /load-credentials endpoint to load session credentials.

## API Endpoints

1. Test Endpoint
    - GET /test
    - Returns a simple message to verify the server is running.

2. Health Check Endpoint
    - GET /health-check
    - Returns the status of the WhatsApp client.
    - Response: { "status": "good" } if the client is ready, { "status": "bad" } if not.

3. Dump Credentials
    - GET /dump-credentials
    - Dumps the current session credentials from the session directory.
    - Response: A JSON object containing the session files and their contents.

4. Load Credentials
    - POST /load-credentials
    - Loads session credentials into the WhatsApp client from the request body.
    - Request Body:
    ```json
    {
      "credentials": {
        "file1": "content of file1",
        "file2": "content of file2"
      }
    }
    ```
    - Response: `{ "success": "Credentials loaded successfully" }` on success.

6. Read Messages
    - POST /read_messages
    - Reads messages from a specific chat.
    - Request Body:
    ```json
    {
    "target_name": <Chat Name>,
    "date_range": {
      "startDate": "2024-10-12T00:00:00Z",
      "endDate": "2024-10-12T23:59:59Z"
    }
    }
    ```
    - Response: Array of messages or an error message.

7. Write Message
    - POST /write_message
    - Sends a message to a specific chat.
    - Request Body:
    ```json
    {
      "target_name": <Chat Name>,
      "message": <Your message here>
    }
    ```
    - Response: `{ "success": "Message sent" }` on success.

8. Webhook
    - POST /web_hook
    - Sets up a webhook to listen for messages in a specified chat.
    - Request Body:
    ```json
    {
      "target_name": "Chat Name"
    }
    ```
    - Response: `{ "success": "Webhook set for Chat Name" }` on success.