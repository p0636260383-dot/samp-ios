#ifndef ROTCITY_NATIVE_BRIDGE_H
#define ROTCITY_NATIVE_BRIDGE_H
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

const char* rotcity_native_version(void);
// Blocking, bounded UDP status query. Call on a background queue; returns bytes or -1.
int rotcity_query_info(const char* host, uint16_t port, uint8_t* output, int capacity, int* ping_ms);

#ifdef __cplusplus
}
#endif

#endif
