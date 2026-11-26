#include "rotcity_native_bridge.h"
#include <netdb.h>
#include <sys/socket.h>
#include <sys/select.h>
#include <unistd.h>
#include <cstring>
#include <chrono>

int rotcity_query_info(const char* host, uint16_t port, uint8_t* output, int capacity, int* ping_ms) {
    if (!host || !output || capacity < 16 || !port) return -1;
    addrinfo hints{}, *resolved = nullptr;
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_DGRAM;
    if (getaddrinfo(host, nullptr, &hints, &resolved) != 0 || !resolved) return -1;
    sockaddr_in address = *reinterpret_cast<sockaddr_in*>(resolved->ai_addr);
    freeaddrinfo(resolved);
    address.sin_port = htons(port);
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    if (fd < 0) return -1;
    uint8_t request[11] = {'S','A','M','P',0,0,0,0,static_cast<uint8_t>(port),static_cast<uint8_t>(port >> 8),'i'};
    std::memcpy(request + 4, &address.sin_addr.s_addr, 4);
    auto start = std::chrono::steady_clock::now();
    int result = -1;
    if (connect(fd, reinterpret_cast<sockaddr*>(&address), sizeof(address)) == 0 &&
        send(fd, request, sizeof(request), 0) == sizeof(request)) {
        fd_set readable;
        FD_ZERO(&readable);
        FD_SET(fd, &readable);
        timeval timeout{2, 0};
        if (select(fd + 1, &readable, nullptr, nullptr, &timeout) > 0) {
            int received = static_cast<int>(recv(fd, output, capacity, 0));
            if (received >= 16 && std::memcmp(output, request, sizeof(request)) == 0) {
                result = received;
                if (ping_ms) *ping_ms = static_cast<int>(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - start).count());
            }
        }
    }
    close(fd);
    return result;
}
