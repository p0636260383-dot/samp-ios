#ifndef ROTCITY_NATIVE_BRIDGE_H
#define ROTCITY_NATIVE_BRIDGE_H
#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    ROTCITY_STATE_DISCONNECTED = 0,
    ROTCITY_STATE_CONNECTING = 1,
    ROTCITY_STATE_AWAIT_JOIN = 2,
    ROTCITY_STATE_CONNECTED = 3
} rotcity_connection_state_t;

typedef enum {
    ROTCITY_EVENT_NONE = 0,
    ROTCITY_EVENT_STATE_CHANGED = 1,
    ROTCITY_EVENT_DUI_PACKET = 2,
    ROTCITY_EVENT_CHAT_MESSAGE = 3,
    ROTCITY_EVENT_SHOW_DIALOG = 4,
    ROTCITY_EVENT_DISCONNECTED = 5
} rotcity_event_type_t;

typedef struct {
    rotcity_event_type_t type;
    int32_t int_arg1;
    int32_t int_arg2;
    char title[256];
    char text[4096];
    char button1[64];
    char button2[64];
} rotcity_event_t;

const char* rotcity_native_version(void);
// Blocking, bounded UDP status query. Call on a background queue; returns bytes or -1.
int rotcity_query_info(const char* host, uint16_t port, uint8_t* output, int capacity, int* ping_ms);

void* rotcity_client_create(void);
void rotcity_client_destroy(void* client);
bool rotcity_client_connect(void* client, const char* host, uint16_t port, const char* nickname, const char* password);
void rotcity_client_disconnect(void* client);
void rotcity_client_poll(void* client);
rotcity_connection_state_t rotcity_client_state(void* client);
bool rotcity_client_pop_event(void* client, rotcity_event_t* out_event);

bool rotcity_client_send_chat(void* client, const uint8_t* bytes, int length);
bool rotcity_client_send_command(void* client, const uint8_t* bytes, int length);
bool rotcity_client_send_dialog_response(
    void* client,
    uint16_t dialog_id,
    uint8_t button_id,
    uint16_t list_item,
    const uint8_t* input,
    int input_len
);

// Helper for offline/unit verification of SA-MP 0.3.7 ClientJoin wire format.
int rotcity_build_client_join_payload(
    const char* nickname,
    uint32_t challenge,
    uint8_t* output,
    int capacity
);

#ifdef __cplusplus
}
#endif

#endif
