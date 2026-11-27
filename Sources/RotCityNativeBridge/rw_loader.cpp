#include "rw_loader.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

namespace {

constexpr uint32_t kRwChunkStruct = 0x0001;
constexpr uint32_t kRwChunkString = 0x0002;
constexpr uint32_t kRwChunkTexture = 0x0006;
constexpr uint32_t kRwChunkMaterial = 0x0007;
constexpr uint32_t kRwChunkMaterialList = 0x0008;
constexpr uint32_t kRwChunkGeometry = 0x000F;
constexpr uint32_t kRwChunkClump = 0x0010;
constexpr uint32_t kRwChunkGeometryList = 0x001A;

constexpr uint16_t kGeomTristrip = 0x0001;
constexpr uint16_t kGeomPositions = 0x0002;
constexpr uint16_t kGeomTextured = 0x0004;
constexpr uint16_t kGeomPrelit = 0x0008;
constexpr uint16_t kGeomNormals = 0x0010;
constexpr uint16_t kGeomTextured2 = 0x0080;

static bool EqualsIgnoreCase(const char* a, const char* b) {
    if (!a || !b) return false;
    while (*a && *b) {
        if (std::tolower(static_cast<unsigned char>(*a)) != std::tolower(static_cast<unsigned char>(*b))) {
            return false;
        }
        ++a;
        ++b;
    }
    return *a == '\0' && *b == '\0';
}

static uint16_t ReadU16(const uint8_t* p) {
    return static_cast<uint16_t>(p[0]) | (static_cast<uint16_t>(p[1]) << 8);
}

static uint32_t ReadU32(const uint8_t* p) {
    return static_cast<uint32_t>(p[0]) |
           (static_cast<uint32_t>(p[1]) << 8) |
           (static_cast<uint32_t>(p[2]) << 16) |
           (static_cast<uint32_t>(p[3]) << 24);
}

static float ReadF32(const uint8_t* p) {
    uint32_t u = ReadU32(p);
    float f = 0.0f;
    std::memcpy(&f, &u, sizeof(float));
    return f;
}

struct RwChunkHeader {
    uint32_t type;
    uint32_t size;
    uint32_t libraryId;
};

static bool ReadChunkHeader(const uint8_t* data, int32_t size, int32_t offset, RwChunkHeader* out) {
    if (!data || !out || offset < 0 || offset + 12 > size) return false;
    out->type = ReadU32(data + offset);
    out->size = ReadU32(data + offset + 4);
    out->libraryId = ReadU32(data + offset + 8);
    return offset + 12 + static_cast<int64_t>(out->size) <= size;
}

static void ParseTextureName(const uint8_t* data, int32_t end, int32_t offset, char* outName, size_t outCap) {
    RwChunkHeader hdr{};
    while (ReadChunkHeader(data, end, offset, &hdr)) {
        const int32_t payload = offset + 12;
        if (hdr.type == kRwChunkString && hdr.size > 0 && outName[0] == '\0') {
            const size_t n = std::min<size_t>(outCap - 1, hdr.size);
            std::memcpy(outName, data + payload, n);
            outName[n] = '\0';
            break;
        }
        offset = payload + static_cast<int32_t>(hdr.size);
    }
}

static void ParseMaterial(const uint8_t* data, int32_t end, int32_t offset, rotcity_rw_material_t* outMat) {
    std::memset(outMat, 0, sizeof(*outMat));
    outMat->r = outMat->g = outMat->b = outMat->a = 255;

    RwChunkHeader hdr{};
    while (ReadChunkHeader(data, end, offset, &hdr)) {
        const int32_t payload = offset + 12;
        if (hdr.type == kRwChunkStruct && hdr.size >= 8) {
            outMat->r = data[payload + 4];
            outMat->g = data[payload + 5];
            outMat->b = data[payload + 6];
            outMat->a = data[payload + 7];
        } else if (hdr.type == kRwChunkTexture) {
            ParseTextureName(data, payload + static_cast<int32_t>(hdr.size), payload + 16, outMat->texture_name, sizeof(outMat->texture_name));
            if (outMat->texture_name[0] == '\0') {
                ParseTextureName(data, payload + static_cast<int32_t>(hdr.size), payload, outMat->texture_name, sizeof(outMat->texture_name));
            }
        }
        offset = payload + static_cast<int32_t>(hdr.size);
    }
}

static void ParseMaterialList(
    const uint8_t* data,
    int32_t end,
    int32_t offset,
    std::vector<rotcity_rw_material_t>& materials
) {
    RwChunkHeader hdr{};
    while (ReadChunkHeader(data, end, offset, &hdr)) {
        const int32_t payload = offset + 12;
        if (hdr.type == kRwChunkMaterial) {
            rotcity_rw_material_t mat{};
            ParseMaterial(data, payload + static_cast<int32_t>(hdr.size), payload, &mat);
            materials.push_back(mat);
        }
        offset = payload + static_cast<int32_t>(hdr.size);
    }
}

static bool ParseGeometry(
    const uint8_t* data,
    int32_t end,
    int32_t offset,
    std::vector<rotcity_rw_vertex_t>& outVerts,
    std::vector<rotcity_rw_triangle_t>& outTris,
    std::vector<rotcity_rw_material_t>& outMats,
    float& cx,
    float& cy,
    float& cz,
    float& radius
) {
    RwChunkHeader structHdr{};
    if (!ReadChunkHeader(data, end, offset, &structHdr) || structHdr.type != kRwChunkStruct || structHdr.size < 16) {
        return false;
    }

    const int32_t p = offset + 12;
    const uint16_t flags = ReadU16(data + p);
    const uint8_t numUVs = data[p + 2];
    const int32_t numTriangles = static_cast<int32_t>(ReadU32(data + p + 4));
    const int32_t numVertices = static_cast<int32_t>(ReadU32(data + p + 8));
    const int32_t numMorphTargets = static_cast<int32_t>(ReadU32(data + p + 12));

    if (numVertices <= 0 || numVertices > 200000 || numTriangles < 0 || numTriangles > 300000 || numMorphTargets <= 0) {
        return false;
    }

    int32_t cur = p + 16;
    const uint32_t version = structHdr.libraryId;
    const uint32_t rwVer = (version & 0xFFFF0000U) ? ((version >> 14) & 0x3FF00U) + 0x30000U : version;
    if (rwVer < 0x34000U && cur + 12 <= p + static_cast<int32_t>(structHdr.size)) {
        cur += 12; // ambient, specular, diffuse surface properties
    }

    const int32_t matBase = static_cast<int32_t>(outMats.size());
    const int32_t vertBase = static_cast<int32_t>(outVerts.size());

    outVerts.resize(vertBase + numVertices);
    for (int32_t i = 0; i < numVertices; ++i) {
        auto& v = outVerts[vertBase + i];
        v = {};
        v.r = v.g = v.b = v.a = 255;
        v.nz = 1.0f;
    }

    if ((flags & kGeomPrelit) != 0) {
        if (cur + numVertices * 4 > p + static_cast<int32_t>(structHdr.size)) return false;
        for (int32_t i = 0; i < numVertices; ++i) {
            outVerts[vertBase + i].r = data[cur + i * 4 + 0];
            outVerts[vertBase + i].g = data[cur + i * 4 + 1];
            outVerts[vertBase + i].b = data[cur + i * 4 + 2];
            outVerts[vertBase + i].a = data[cur + i * 4 + 3];
        }
        cur += numVertices * 4;
    }

    int uvSets = numUVs;
    if (uvSets == 0 && (flags & (kGeomTextured | kGeomTextured2)) != 0) {
        uvSets = (flags & kGeomTextured2) ? 2 : 1;
    }
    if (uvSets > 0) {
        if (cur + numVertices * 8 * uvSets > p + static_cast<int32_t>(structHdr.size)) return false;
        for (int32_t i = 0; i < numVertices; ++i) {
            outVerts[vertBase + i].u = ReadF32(data + cur + i * 8 + 0);
            outVerts[vertBase + i].v = ReadF32(data + cur + i * 8 + 4);
        }
        cur += numVertices * 8 * uvSets;
    }

    if (numTriangles > 0) {
        if (cur + numTriangles * 8 > p + static_cast<int32_t>(structHdr.size)) return false;
        const size_t triBase = outTris.size();
        outTris.resize(triBase + numTriangles);
        for (int32_t i = 0; i < numTriangles; ++i) {
            const uint8_t* t = data + cur + i * 8;
            // RW binary triangle order: vertex2, vertex1, materialId, vertex3
            const uint16_t v1 = ReadU16(t + 0);
            const uint16_t v0 = ReadU16(t + 2);
            const uint16_t mat = ReadU16(t + 4);
            const uint16_t v2 = ReadU16(t + 6);
            outTris[triBase + i].v0 = static_cast<uint16_t>(vertBase + std::min<int32_t>(v0, numVertices - 1));
            outTris[triBase + i].v1 = static_cast<uint16_t>(vertBase + std::min<int32_t>(v1, numVertices - 1));
            outTris[triBase + i].v2 = static_cast<uint16_t>(vertBase + std::min<int32_t>(v2, numVertices - 1));
            outTris[triBase + i].material_index = static_cast<uint16_t>(matBase + mat);
        }
        cur += numTriangles * 8;
    }

    // First morph target: bounding sphere (16 bytes), hasVerts (4), hasNormals (4)
    if (cur + 24 > p + static_cast<int32_t>(structHdr.size)) return false;
    cx = ReadF32(data + cur + 0);
    cy = ReadF32(data + cur + 4);
    cz = ReadF32(data + cur + 8);
    radius = ReadF32(data + cur + 12);
    const uint32_t hasVerts = ReadU32(data + cur + 16);
    const uint32_t hasNormals = ReadU32(data + cur + 20);
    cur += 24;

    if (hasVerts || (flags & kGeomPositions)) {
        if (cur + numVertices * 12 > p + static_cast<int32_t>(structHdr.size)) return false;
        for (int32_t i = 0; i < numVertices; ++i) {
            outVerts[vertBase + i].x = ReadF32(data + cur + i * 12 + 0);
            outVerts[vertBase + i].y = ReadF32(data + cur + i * 12 + 4);
            outVerts[vertBase + i].z = ReadF32(data + cur + i * 12 + 8);
        }
        cur += numVertices * 12;
    }

    if (hasNormals || (flags & kGeomNormals)) {
        if (cur + numVertices * 12 <= p + static_cast<int32_t>(structHdr.size)) {
            for (int32_t i = 0; i < numVertices; ++i) {
                outVerts[vertBase + i].nx = ReadF32(data + cur + i * 12 + 0);
                outVerts[vertBase + i].ny = ReadF32(data + cur + i * 12 + 4);
                outVerts[vertBase + i].nz = ReadF32(data + cur + i * 12 + 8);
            }
        }
    }

    int32_t sub = offset + 12 + static_cast<int32_t>(structHdr.size);
    RwChunkHeader subHdr{};
    while (ReadChunkHeader(data, end, sub, &subHdr)) {
        const int32_t subPayload = sub + 12;
        if (subHdr.type == kRwChunkMaterialList) {
            ParseMaterialList(data, subPayload + static_cast<int32_t>(subHdr.size), subPayload, outMats);
        }
        sub = subPayload + static_cast<int32_t>(subHdr.size);
    }

    (void)kGeomTristrip;
    return true;
}

static std::string Trim(const std::string& s) {
    size_t a = 0;
    while (a < s.size() && (s[a] == ' ' || s[a] == '\t' || s[a] == '\r' || s[a] == '\n')) ++a;
    size_t b = s.size();
    while (b > a && (s[b - 1] == ' ' || s[b - 1] == '\t' || s[b - 1] == '\r' || s[b - 1] == '\n')) --b;
    return s.substr(a, b - a);
}

static std::vector<std::string> SplitCsv(const std::string& line) {
    std::vector<std::string> parts;
    std::stringstream ss(line);
    std::string item;
    while (std::getline(ss, item, ',')) {
        parts.push_back(Trim(item));
    }
    return parts;
}

} // namespace

extern "C" {

bool rotcity_img_read_entry(const char* img_path, const char* entry_name, uint8_t** out_data, int32_t* out_size) {
    if (!img_path || !entry_name || !out_data || !out_size) return false;
    *out_data = nullptr;
    *out_size = 0;

    FILE* fp = std::fopen(img_path, "rb");
    if (!fp) return false;

    uint8_t header[8] = {0};
    if (std::fread(header, 1, 8, fp) != 8 || std::memcmp(header, "VER2", 4) != 0) {
        std::fclose(fp);
        return false;
    }

    const uint32_t count = ReadU32(header + 4);
    if (count == 0 || count > 100000) {
        std::fclose(fp);
        return false;
    }

    uint8_t entry[32];
    for (uint32_t i = 0; i < count; ++i) {
        if (std::fread(entry, 1, 32, fp) != 32) break;
        char nameBuf[25] = {0};
        std::memcpy(nameBuf, entry + 8, 24);
        if (EqualsIgnoreCase(nameBuf, entry_name)) {
            const uint64_t offsetBytes = static_cast<uint64_t>(ReadU32(entry + 0)) * 2048ULL;
            const uint32_t streamSectors = ReadU16(entry + 4);
            const uint32_t sizeBytes = streamSectors * 2048U;
            if (sizeBytes == 0 || sizeBytes > 64U * 1024U * 1024U) {
                std::fclose(fp);
                return false;
            }
            if (std::fseek(fp, static_cast<long>(offsetBytes), SEEK_SET) != 0) {
                std::fclose(fp);
                return false;
            }
            uint8_t* buf = static_cast<uint8_t*>(std::malloc(sizeBytes));
            if (!buf) {
                std::fclose(fp);
                return false;
            }
            const size_t got = std::fread(buf, 1, sizeBytes, fp);
            std::fclose(fp);
            if (got == 0) {
                std::free(buf);
                return false;
            }
            *out_data = buf;
            *out_size = static_cast<int32_t>(got);
            return true;
        }
    }

    std::fclose(fp);
    return false;
}

void rotcity_rw_free(void* ptr) {
    std::free(ptr);
}

bool rotcity_dff_parse(const uint8_t* data, int32_t size, rotcity_rw_mesh_t* out_mesh) {
    if (!data || size < 12 || !out_mesh) return false;
    std::memset(out_mesh, 0, sizeof(*out_mesh));

    RwChunkHeader root{};
    if (!ReadChunkHeader(data, size, 0, &root) || root.type != kRwChunkClump) {
        return false;
    }

    std::vector<rotcity_rw_vertex_t> verts;
    std::vector<rotcity_rw_triangle_t> tris;
    std::vector<rotcity_rw_material_t> mats;
    float cx = 0, cy = 0, cz = 0, radius = 1.0f;

    int32_t cursor = 12;
    const int32_t end = 12 + static_cast<int32_t>(root.size);
    RwChunkHeader hdr{};
    while (ReadChunkHeader(data, end, cursor, &hdr)) {
        const int32_t payload = cursor + 12;
        if (hdr.type == kRwChunkGeometryList) {
            int32_t gCur = payload;
            const int32_t gEnd = payload + static_cast<int32_t>(hdr.size);
            RwChunkHeader gHdr{};
            while (ReadChunkHeader(data, gEnd, gCur, &gHdr)) {
                const int32_t gPayload = gCur + 12;
                if (gHdr.type == kRwChunkGeometry) {
                    ParseGeometry(data, gPayload + static_cast<int32_t>(gHdr.size), gPayload, verts, tris, mats, cx, cy, cz, radius);
                }
                gCur = gPayload + static_cast<int32_t>(gHdr.size);
            }
            break;
        }
        cursor = payload + static_cast<int32_t>(hdr.size);
    }

    if (verts.empty() || tris.empty()) {
        return false;
    }

    out_mesh->vertex_count = static_cast<int32_t>(verts.size());
    out_mesh->vertices = static_cast<rotcity_rw_vertex_t*>(std::malloc(verts.size() * sizeof(rotcity_rw_vertex_t)));
    std::memcpy(out_mesh->vertices, verts.data(), verts.size() * sizeof(rotcity_rw_vertex_t));

    out_mesh->triangle_count = static_cast<int32_t>(tris.size());
    out_mesh->triangles = static_cast<rotcity_rw_triangle_t*>(std::malloc(tris.size() * sizeof(rotcity_rw_triangle_t)));
    std::memcpy(out_mesh->triangles, tris.data(), tris.size() * sizeof(rotcity_rw_triangle_t));

    if (!mats.empty()) {
        out_mesh->material_count = static_cast<int32_t>(mats.size());
        out_mesh->materials = static_cast<rotcity_rw_material_t*>(std::malloc(mats.size() * sizeof(rotcity_rw_material_t)));
        std::memcpy(out_mesh->materials, mats.data(), mats.size() * sizeof(rotcity_rw_material_t));
    }

    out_mesh->center_x = cx;
    out_mesh->center_y = cy;
    out_mesh->center_z = cz;
    out_mesh->radius = radius;
    return true;
}

void rotcity_rw_mesh_free(rotcity_rw_mesh_t* mesh) {
    if (!mesh) return;
    std::free(mesh->vertices);
    std::free(mesh->triangles);
    std::free(mesh->materials);
    std::memset(mesh, 0, sizeof(*mesh));
}

int32_t rotcity_ipl_collect_nearby(
    const char* ide_path,
    const char* ipl_path,
    float origin_x,
    float origin_y,
    float origin_z,
    float max_distance,
    rotcity_ipl_instance_t* out_instances,
    int32_t capacity
) {
    if (!ide_path || !ipl_path || !out_instances || capacity <= 0) return 0;

    std::unordered_map<int32_t, std::string> modelMap;
    {
        std::ifstream ide(ide_path);
        std::string line;
        bool inObjs = false;
        while (std::getline(ide, line)) {
            std::string t = Trim(line);
            if (t.empty() || t[0] == '#') continue;
            if (t == "objs" || t == "tobj") { inObjs = true; continue; }
            if (t == "end") { inObjs = false; continue; }
            if (!inObjs) continue;
            auto cols = SplitCsv(t);
            if (cols.size() >= 2) {
                int32_t id = std::atoi(cols[0].c_str());
                modelMap[id] = cols[1] + ".dff";
            }
        }
    }

    int32_t written = 0;
    const float maxDistSq = max_distance * max_distance;
    std::ifstream ipl(ipl_path);
    std::string line;
    bool inInst = false;
    while (std::getline(ipl, line) && written < capacity) {
        std::string t = Trim(line);
        if (t.empty() || t[0] == '#') continue;
        if (t == "inst") { inInst = true; continue; }
        if (t == "end") { inInst = false; continue; }
        if (!inInst) continue;

        auto cols = SplitCsv(t);
        if (cols.size() < 10) continue;
        const int32_t id = std::atoi(cols[0].c_str());
        const float x = std::strtof(cols[3].c_str(), nullptr);
        const float y = std::strtof(cols[4].c_str(), nullptr);
        const float z = std::strtof(cols[5].c_str(), nullptr);
        const float dx = x - origin_x;
        const float dy = y - origin_y;
        const float dz = z - origin_z;
        if (dx * dx + dy * dy + dz * dz > maxDistSq) continue;

        const float qz = std::strtof(cols[8].c_str(), nullptr);
        const float qw = std::strtof(cols[9].c_str(), nullptr);

        rotcity_ipl_instance_t inst{};
        inst.model_id = id;
        inst.x = x;
        inst.y = y;
        inst.z = z;
        inst.yaw_rad = 2.0f * std::atan2(qz, qw);

        auto it = modelMap.find(id);
        const std::string& dff = (it != modelMap.end()) ? it->second : (cols[1] + ".dff");
        const size_t n = std::min(sizeof(inst.dff_name) - 1, dff.size());
        std::memcpy(inst.dff_name, dff.data(), n);
        inst.dff_name[n] = '\0';

        out_instances[written++] = inst;
    }

    return written;
}

}
