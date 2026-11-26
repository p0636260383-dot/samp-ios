#include "netgame.h"
#include "rotcity_native_bridge.h"

#include "BitStream.h"
#include "PacketEnumerations.h"
#include "PacketPriority.h"
#include "RakNetworkFactory.h"
#include "SAMPRPC.h"
#include "StringCompressor.h"

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <cstring>
#include <deque>
#include <mutex>
#include <string>
#include <unordered_map>

// Defined in vendor/raknet/SAMP/samp_auth.cpp
extern void gen_auth_key(char* buf, char* auth_in);

namespace {

constexpr const char* kAuthBS = "E02262CF28BC542486C558D4BE9EFB716592AFAF8B";
constexpr const char* kSampVersion = "0.3.7";
constexpr int kNetgameVersion = 4057;
constexpr size_t kMaxQueuedEvents = 256;

static void CopyBounded(char* dst, size_t dstSize, const char* src, size_t srcLen) {
    if (!dst || dstSize == 0) return;
    if (!src || srcLen == 0) {
        dst[0] = '\0';
        return;
    }
    const size_t n = std::min(dstSize - 1, srcLen);
    std::memcpy(dst, src, n);
    dst[n] = '\0';
}

static unsigned char GetPacketID(const Packet* p) {
    if (!p || !p->data || p->length == 0) return 255;
    if (static_cast<unsigned char>(p->data[0]) == ID_TIMESTAMP && p->length > sizeof(unsigned char) + sizeof(unsigned long)) {
        return static_cast<unsigned char>(p->data[sizeof(unsigned char) + sizeof(unsigned long)]);
    }
    return static_cast<unsigned char>(p->data[0]);
}

class SampSession;
std::mutex g_registryMutex;
std::unordered_map<void*, SampSession*> g_sessionByRak;
SampSession* g_latestSession = nullptr;

class SampSession {
public:
    SampSession() {
        StringCompressor::AddReference();
        rakClient_ = RakNetworkFactory::GetRakClientInterface();
        std::lock_guard<std::mutex> lk(g_registryMutex);
        if (rakClient_) {
            g_sessionByRak[rakClient_] = this;
        }
        g_latestSession = this;
    }

    ~SampSession() {
        Disconnect();
        {
            std::lock_guard<std::mutex> lk(g_registryMutex);
            if (rakClient_) {
                g_sessionByRak.erase(rakClient_);
            }
            if (g_latestSession == this) {
                g_latestSession = nullptr;
            }
        }
        if (rakClient_) {
            UnregisterRPCs();
            RakNetworkFactory::DestroyRakClientInterface(rakClient_);
            rakClient_ = nullptr;
        }
        StringCompressor::RemoveReference();
    }

    bool Connect(const char* host, uint16_t port, const char* nickname, const char* password) {
        if (!rakClient_ || !host || !nickname || !port) return false;
        Disconnect();

        nickname_ = nickname;
        password_ = password ? password : "";
        hostName_ = "SA-MP";

        RegisterRPCs();
        rakClient_->SetPassword(password_.empty() ? nullptr : password_.c_str());

        SetState(ROTCITY_STATE_CONNECTING, "Connecting...");
        const bool ok = rakClient_->Connect(host, port, 0, 0, 5);
        if (!ok) {
            SetState(ROTCITY_STATE_DISCONNECTED, "Failed to start RakNet connection.");
        }
        return ok;
    }

    void Disconnect() {
        if (!rakClient_) return;
        const auto prev = state_.load();
        if (prev != ROTCITY_STATE_DISCONNECTED) {
            rakClient_->Disconnect(200);
            UnregisterRPCs();
            SetState(ROTCITY_STATE_DISCONNECTED, "Disconnected");
        }
    }

    void Poll() {
        if (!rakClient_) return;
        Packet* pkt = nullptr;
        while ((pkt = rakClient_->Receive()) != nullptr) {
            const unsigned char packetId = GetPacketID(pkt);
            switch (packetId) {
                case ID_AUTH_KEY:
                    HandleAuthKey(pkt);
                    break;
                case ID_CONNECTION_REQUEST_ACCEPTED:
                    HandleConnectionAccepted(pkt);
                    break;
                case ID_CONNECTION_ATTEMPT_FAILED:
                    PushDisconnect("The server didn't respond.");
                    break;
                case ID_NO_FREE_INCOMING_CONNECTIONS:
                    PushDisconnect("The server is full.");
                    break;
                case ID_DISCONNECTION_NOTIFICATION:
                    PushDuiPacket("reset");
                    PushDisconnect("Server closed the connection.");
                    break;
                case ID_CONNECTION_LOST:
                    PushDuiPacket("reset");
                    PushDisconnect("Lost connection to the server.");
                    break;
                case ID_CONNECTION_BANNED:
                    PushDisconnect("You are banned from this server.");
                    break;
                case ID_INVALID_PASSWORD:
                    PushDisconnect("Invalid server password.");
                    break;
                case ID_FAILED_INITIALIZE_ENCRIPTION:
                    PushDisconnect("Failed to initialize encryption.");
                    break;
                default:
                    break;
            }
            rakClient_->DeallocatePacket(pkt);
        }
    }

    rotcity_connection_state_t State() const {
        return state_.load();
    }

    bool PopEvent(rotcity_event_t* outEvent) {
        if (!outEvent) return false;
        std::lock_guard<std::mutex> lk(eventsMutex_);
        if (events_.empty()) return false;
        *outEvent = events_.front();
        events_.pop_front();
        return true;
    }

    bool SendChat(const uint8_t* bytes, int length) {
        if (!rakClient_ || state_.load() != ROTCITY_STATE_CONNECTED || !bytes || length <= 0 || length > 255) {
            return false;
        }
        RakNet::BitStream bs;
        const uint8_t len = static_cast<uint8_t>(length);
        bs.Write(len);
        bs.Write(reinterpret_cast<const char*>(bytes), len);
        return rakClient_->RPC(&RPC_Chat, &bs, HIGH_PRIORITY, RELIABLE, 0, false, UNASSIGNED_NETWORK_ID, nullptr);
    }

    bool SendCommand(const uint8_t* bytes, int length) {
        if (!rakClient_ || state_.load() != ROTCITY_STATE_CONNECTED || !bytes || length <= 0) {
            return false;
        }
        RakNet::BitStream bs;
        const int32_t len = static_cast<int32_t>(length);
        bs.Write(len);
        bs.Write(reinterpret_cast<const char*>(bytes), len);
        const bool isDweb = length >= 6 && std::memcmp(bytes, "/dweb ", 6) == 0;
        const PacketReliability reliability = isDweb ? RELIABLE_ORDERED : RELIABLE;
        return rakClient_->RPC(&RPC_ServerCommand, &bs, HIGH_PRIORITY, reliability, 0, false, UNASSIGNED_NETWORK_ID, nullptr);
    }

    bool SendDialogResponse(uint16_t dialogId, uint8_t buttonId, uint16_t listItem, const uint8_t* input, int inputLen) {
        if (!rakClient_ || state_.load() != ROTCITY_STATE_CONNECTED) {
            return false;
        }
        const uint8_t len = static_cast<uint8_t>(std::clamp(inputLen, 0, 255));
        RakNet::BitStream bs;
        bs.Write(dialogId);
        bs.Write(buttonId);
        bs.Write(listItem);
        bs.Write(len);
        if (len > 0 && input) {
            bs.Write(reinterpret_cast<const char*>(input), len);
        }
        return rakClient_->RPC(&RPC_DialogResponse, &bs, HIGH_PRIORITY, RELIABLE_ORDERED, 0, false, UNASSIGNED_NETWORK_ID, nullptr);
    }

    static SampSession* FromRPC(RPCParameters* params) {
        std::lock_guard<std::mutex> lk(g_registryMutex);
        if (params && params->recipient) {
            auto it = g_sessionByRak.find(params->recipient);
            if (it != g_sessionByRak.end()) return it->second;
        }
        return g_latestSession;
    }

    void OnInitGame(RPCParameters* rpcParams) {
        if (!rpcParams || !rpcParams->input) return;
        RakNet::BitStream bs(rpcParams->input, (rpcParams->numberOfBitsOfData / 8) + 1, false);
        bool bDummy = false;
        float fDummy = 0.0f;
        int32_t iDummy = 0;
        uint8_t byteDummy = 0;
        uint16_t myPlayerId = 0;

        bs.ReadCompressed(bDummy); // bZoneNames
        bs.ReadCompressed(bDummy); // bUseCJWalk
        bs.ReadCompressed(bDummy); // bAllowWeapons
        bs.ReadCompressed(bDummy); // bLimitGlobalChatRadius
        bs.Read(fDummy);           // fGlobalChatRadius
        bs.ReadCompressed(bDummy); // bStuntBonus
        bs.Read(fDummy);           // fNameTagDrawDistance
        bs.ReadCompressed(bDummy); // bDisableInteriorEnterExits
        bs.ReadCompressed(bDummy); // bNameTagLOS
        bs.ReadCompressed(bDummy); // bManualVehicleEngineAndLight
        bs.Read(iDummy);           // iSpawnsAvailable
        bs.Read(myPlayerId);       // MyPlayerID
        bs.ReadCompressed(bDummy); // bShowNameTags
        bs.Read(iDummy);           // iShowPlayerMarkers
        bs.Read(byteDummy);        // byteWorldTime_Hour
        bs.Read(byteDummy);        // byteWeather
        bs.Read(fDummy);           // fGravity
        bs.ReadCompressed(bDummy); // bLanMode
        bs.Read(iDummy);           // iDeathDropMoney
        bs.ReadCompressed(bDummy); // bInstagib
        bs.Read(iDummy);           // iNetModeNormalOnFootSendRate
        bs.Read(iDummy);           // iNetModeNormalInCarSendRate
        bs.Read(iDummy);           // iNetModeFiringSendRate
        bs.Read(iDummy);           // iNetModeSendMultiplier
        bs.Read(iDummy);           // iLagCompensation

        uint8_t hostLen = 0;
        char hostBuf[256] = {0};
        if (bs.Read(hostLen) && hostLen > 0) {
            bs.Read(hostBuf, hostLen);
            hostBuf[hostLen] = '\0';
            hostName_ = hostBuf;
        }

        localPlayerId_ = myPlayerId;
        SetState(ROTCITY_STATE_CONNECTED, hostName_.c_str());
    }

    void OnConnectionRejected(RPCParameters* rpcParams) {
        if (!rpcParams || !rpcParams->input) return;
        RakNet::BitStream bs(rpcParams->input, (rpcParams->numberOfBitsOfData / 8) + 1, false);
        uint8_t reason = 0;
        bs.Read(reason);
        const char* message = "Connection rejected.";
        switch (reason) {
            case 1: message = "CONNECTION REJECTED: Incorrect Version."; break;
            case 2: message = "CONNECTION REJECTED: Unacceptable NickName."; break;
            case 3: message = "CONNECTION REJECTED: Bad mod version."; break;
            case 4: message = "CONNECTION REJECTED: Unable to allocate a player slot."; break;
            default: break;
        }
        PushDisconnect(message);
        if (rakClient_) rakClient_->Disconnect(200);
    }

    void OnClientMessage(RPCParameters* rpcParams) {
        if (!rpcParams || !rpcParams->input) return;
        RakNet::BitStream bs(rpcParams->input, (rpcParams->numberOfBitsOfData / 8) + 1, false);
        uint32_t dwColor = 0;
        uint32_t dwStrLen = 0;
        if (!bs.Read(dwColor) || !bs.Read(dwStrLen)) return;
        if (dwStrLen == 0 || dwStrLen >= 4096) return;

        char szMsg[4096] = {0};
        bs.Read(szMsg, dwStrLen);
        szMsg[dwStrLen] = '\0';

        if (std::strncmp(szMsg, "@DUI@", 5) == 0) {
            PushDuiPacket(szMsg + 5);
            return;
        }

        rotcity_event_t ev{};
        ev.type = ROTCITY_EVENT_CHAT_MESSAGE;
        ev.int_arg1 = static_cast<int32_t>(dwColor);
        ev.int_arg2 = -1;
        CopyBounded(ev.text, sizeof(ev.text), szMsg, dwStrLen);
        PushEvent(ev);
    }

    void OnChat(RPCParameters* rpcParams) {
        if (!rpcParams || !rpcParams->input) return;
        RakNet::BitStream bs(rpcParams->input, (rpcParams->numberOfBitsOfData / 8) + 1, false);
        uint16_t playerId = 0;
        uint8_t byteMsgLen = 0;
        if (!bs.Read(playerId) || !bs.Read(byteMsgLen)) return;
        char szMsg[256] = {0};
        if (byteMsgLen > 0) {
            bs.Read(szMsg, byteMsgLen);
            szMsg[byteMsgLen] = '\0';
        }
        rotcity_event_t ev{};
        ev.type = ROTCITY_EVENT_CHAT_MESSAGE;
        ev.int_arg1 = static_cast<int32_t>(0xFFFFFFFF);
        ev.int_arg2 = static_cast<int32_t>(playerId);
        CopyBounded(ev.text, sizeof(ev.text), szMsg, byteMsgLen);
        PushEvent(ev);
    }

    void OnShowDialog(RPCParameters* rpcParams) {
        if (!rpcParams || !rpcParams->input) return;
        RakNet::BitStream bs(rpcParams->input, (rpcParams->numberOfBitsOfData / 8) + 1, false);
        uint16_t wDialogID = 0;
        uint8_t byteDialogStyle = 0;
        uint8_t byteLen = 0;
        char szTitle[257] = {0};
        char szButton1[257] = {0};
        char szButton2[257] = {0};
        char szMessage[4097] = {0};

        if (!bs.Read(wDialogID) || !bs.Read(byteDialogStyle)) return;
        if (bs.Read(byteLen) && byteLen > 0) bs.Read(szTitle, byteLen);
        if (bs.Read(byteLen) && byteLen > 0) bs.Read(szButton1, byteLen);
        if (bs.Read(byteLen) && byteLen > 0) bs.Read(szButton2, byteLen);
        stringCompressor->DecodeString(szMessage, 4096, &bs);

        if (wDialogID == 65000 && std::strcmp(szTitle, "@DUI@") == 0) {
            PushDuiPacket(szMessage);
            return;
        }

        rotcity_event_t ev{};
        ev.type = ROTCITY_EVENT_SHOW_DIALOG;
        ev.int_arg1 = static_cast<int32_t>(wDialogID);
        ev.int_arg2 = static_cast<int32_t>(byteDialogStyle);
        CopyBounded(ev.title, sizeof(ev.title), szTitle, std::strlen(szTitle));
        CopyBounded(ev.text, sizeof(ev.text), szMessage, std::strlen(szMessage));
        CopyBounded(ev.button1, sizeof(ev.button1), szButton1, std::strlen(szButton1));
        CopyBounded(ev.button2, sizeof(ev.button2), szButton2, std::strlen(szButton2));
        PushEvent(ev);
    }

private:
    static void RpcInitGame(RPCParameters* p) { if (auto* s = FromRPC(p)) s->OnInitGame(p); }
    static void RpcConnectionRejected(RPCParameters* p) { if (auto* s = FromRPC(p)) s->OnConnectionRejected(p); }
    static void RpcClientMessage(RPCParameters* p) { if (auto* s = FromRPC(p)) s->OnClientMessage(p); }
    static void RpcChat(RPCParameters* p) { if (auto* s = FromRPC(p)) s->OnChat(p); }
    static void RpcShowDialog(RPCParameters* p) { if (auto* s = FromRPC(p)) s->OnShowDialog(p); }

    void RegisterRPCs() {
        if (rpcsRegistered_ || !rakClient_) return;
        rakClient_->RegisterAsRemoteProcedureCall(&RPC_InitGame, RpcInitGame);
        rakClient_->RegisterAsRemoteProcedureCall(&RPC_ConnectionRejected, RpcConnectionRejected);
        rakClient_->RegisterAsRemoteProcedureCall(&RPC_ClientMessage, RpcClientMessage);
        rakClient_->RegisterAsRemoteProcedureCall(&RPC_Chat, RpcChat);
        rakClient_->RegisterAsRemoteProcedureCall(&RPC_DialogBox, RpcShowDialog);
        rpcsRegistered_ = true;
    }

    void UnregisterRPCs() {
        if (!rpcsRegistered_ || !rakClient_) return;
        rakClient_->UnregisterAsRemoteProcedureCall(&RPC_InitGame);
        rakClient_->UnregisterAsRemoteProcedureCall(&RPC_ConnectionRejected);
        rakClient_->UnregisterAsRemoteProcedureCall(&RPC_ClientMessage);
        rakClient_->UnregisterAsRemoteProcedureCall(&RPC_Chat);
        rakClient_->UnregisterAsRemoteProcedureCall(&RPC_DialogBox);
        rpcsRegistered_ = false;
    }

    void HandleAuthKey(Packet* pkt) {
        if (state_.load() < ROTCITY_STATE_CONNECTING || state_.load() > ROTCITY_STATE_AWAIT_JOIN) return;
        RakNet::BitStream bsAuth(pkt->data, pkt->length, false);
        uint8_t byteAuthLen = 0;
        char szAuth[260] = {0};
        char szAuthKey[269] = {0};

        bsAuth.IgnoreBits(8);
        if (!bsAuth.Read(byteAuthLen)) return;
        bsAuth.Read(szAuth, byteAuthLen);
        szAuth[byteAuthLen] = '\0';

        gen_auth_key(szAuthKey, szAuth);
        const uint8_t keyLen = static_cast<uint8_t>(std::strlen(szAuthKey));

        RakNet::BitStream bsKey;
        bsKey.Write(static_cast<uint8_t>(ID_AUTH_KEY));
        bsKey.Write(keyLen);
        bsKey.Write(szAuthKey, keyLen);
        rakClient_->Send(&bsKey, SYSTEM_PRIORITY, RELIABLE, 0);
    }

    void HandleConnectionAccepted(Packet* pkt) {
        RakNet::BitStream bsSucc(pkt->data, pkt->length, false);
        uint16_t myPlayerId = 0;
        uint32_t uiChallenge = 0;

        bsSucc.IgnoreBits(8);  // packetId
        bsSucc.IgnoreBits(32); // binaryAddress
        bsSucc.IgnoreBits(16); // port
        bsSucc.Read(myPlayerId);
        bsSucc.Read(uiChallenge);
        uiChallenge ^= static_cast<uint32_t>(kNetgameVersion);
        localPlayerId_ = myPlayerId;

        SetState(ROTCITY_STATE_AWAIT_JOIN, "Joining game...");

        uint8_t payload[512];
        const int payloadLen = rotcity_build_client_join_payload(nickname_.c_str(), uiChallenge, payload, sizeof(payload));
        if (payloadLen > 0) {
            RakNet::BitStream bsSend(payload, payloadLen, false);
            rakClient_->RPC(&RPC_ClientJoin, &bsSend, HIGH_PRIORITY, RELIABLE, 0, false, UNASSIGNED_NETWORK_ID, nullptr);
        }
    }

    void SetState(rotcity_connection_state_t next, const char* info) {
        state_.store(next);
        rotcity_event_t ev{};
        ev.type = ROTCITY_EVENT_STATE_CHANGED;
        ev.int_arg1 = static_cast<int32_t>(next);
        ev.int_arg2 = static_cast<int32_t>(localPlayerId_);
        CopyBounded(ev.title, sizeof(ev.title), hostName_.c_str(), hostName_.size());
        if (info) CopyBounded(ev.text, sizeof(ev.text), info, std::strlen(info));
        PushEvent(ev);
    }

    void PushDisconnect(const char* reason) {
        state_.store(ROTCITY_STATE_DISCONNECTED);
        rotcity_event_t ev{};
        ev.type = ROTCITY_EVENT_DISCONNECTED;
        ev.int_arg1 = ROTCITY_STATE_DISCONNECTED;
        if (reason) CopyBounded(ev.text, sizeof(ev.text), reason, std::strlen(reason));
        PushEvent(ev);
    }

    void PushDuiPacket(const char* payload) {
        if (!payload) return;
        rotcity_event_t ev{};
        ev.type = ROTCITY_EVENT_DUI_PACKET;
        CopyBounded(ev.text, sizeof(ev.text), payload, std::strlen(payload));
        PushEvent(ev);
    }

    void PushEvent(const rotcity_event_t& ev) {
        std::lock_guard<std::mutex> lk(eventsMutex_);
        if (events_.size() >= kMaxQueuedEvents) {
            events_.pop_front();
        }
        events_.push_back(ev);
    }

    RakClientInterface* rakClient_ = nullptr;
    bool rpcsRegistered_ = false;
    std::atomic<rotcity_connection_state_t> state_{ROTCITY_STATE_DISCONNECTED};
    uint16_t localPlayerId_ = 0;
    std::string nickname_;
    std::string password_;
    std::string hostName_;
    std::mutex eventsMutex_;
    std::deque<rotcity_event_t> events_;
};

} // namespace

NetGame* gNetGame = nullptr;

extern "C" {

void* rotcity_client_create(void) {
    return new SampSession();
}

void rotcity_client_destroy(void* client) {
    delete static_cast<SampSession*>(client);
}

bool rotcity_client_connect(void* client, const char* host, uint16_t port, const char* nickname, const char* password) {
    if (!client) return false;
    return static_cast<SampSession*>(client)->Connect(host, port, nickname, password);
}

void rotcity_client_disconnect(void* client) {
    if (!client) return;
    static_cast<SampSession*>(client)->Disconnect();
}

void rotcity_client_poll(void* client) {
    if (!client) return;
    static_cast<SampSession*>(client)->Poll();
}

rotcity_connection_state_t rotcity_client_state(void* client) {
    if (!client) return ROTCITY_STATE_DISCONNECTED;
    return static_cast<SampSession*>(client)->State();
}

bool rotcity_client_pop_event(void* client, rotcity_event_t* out_event) {
    if (!client) return false;
    return static_cast<SampSession*>(client)->PopEvent(out_event);
}

bool rotcity_client_send_chat(void* client, const uint8_t* bytes, int length) {
    if (!client) return false;
    return static_cast<SampSession*>(client)->SendChat(bytes, length);
}

bool rotcity_client_send_command(void* client, const uint8_t* bytes, int length) {
    if (!client) return false;
    return static_cast<SampSession*>(client)->SendCommand(bytes, length);
}

bool rotcity_client_send_dialog_response(
    void* client,
    uint16_t dialog_id,
    uint8_t button_id,
    uint16_t list_item,
    const uint8_t* input,
    int input_len
) {
    if (!client) return false;
    return static_cast<SampSession*>(client)->SendDialogResponse(dialog_id, button_id, list_item, input, input_len);
}

int rotcity_build_client_join_payload(
    const char* nickname,
    uint32_t challenge,
    uint8_t* output,
    int capacity
) {
    if (!nickname || !output || capacity <= 0) return -1;
    const size_t nameLen = std::min<size_t>(std::strlen(nickname), 24);
    const uint8_t byteNameLen = static_cast<uint8_t>(nameLen);
    const uint8_t byteAuthBSLen = static_cast<uint8_t>(std::strlen(kAuthBS));
    const uint8_t byteClientVerLen = static_cast<uint8_t>(std::strlen(kSampVersion));
    const uint8_t byteMod = 1;

    RakNet::BitStream bs;
    bs.Write(kNetgameVersion);
    bs.Write(byteMod);
    bs.Write(byteNameLen);
    bs.Write(nickname, byteNameLen);
    bs.Write(challenge);
    bs.Write(byteAuthBSLen);
    bs.Write(kAuthBS, byteAuthBSLen);
    bs.Write(byteClientVerLen);
    bs.Write(kSampVersion, byteClientVerLen);

    const int bytes = bs.GetNumberOfBytesUsed();
    if (bytes > capacity) return -1;
    std::memcpy(output, bs.GetData(), static_cast<size_t>(bytes));
    return bytes;
}

}
