#ifndef ROTCITY_RW_LOADER_H
#define ROTCITY_RW_LOADER_H

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    float x, y, z;
    float nx, ny, nz;
    float u, v;
    uint8_t r, g, b, a;
} rotcity_rw_vertex_t;

typedef struct {
    uint16_t v0, v1, v2;
    uint16_t material_index;
} rotcity_rw_triangle_t;

typedef struct {
    uint8_t r, g, b, a;
    char texture_name[64];
} rotcity_rw_material_t;

typedef struct {
    rotcity_rw_vertex_t* vertices;
    int32_t vertex_count;
    rotcity_rw_triangle_t* triangles;
    int32_t triangle_count;
    rotcity_rw_material_t* materials;
    int32_t material_count;
    float center_x, center_y, center_z;
    float radius;
} rotcity_rw_mesh_t;

typedef struct {
    int32_t model_id;
    char dff_name[64];
    float x, y, z;
    float yaw_rad;
} rotcity_ipl_instance_t;

// Extracts a named entry from an IMG v2 ("VER2") archive into a newly allocated buffer (caller frees with rotcity_rw_free).
bool rotcity_img_read_entry(const char* img_path, const char* entry_name, uint8_t** out_data, int32_t* out_size);
void rotcity_rw_free(void* ptr);

// Parses a RenderWare DFF binary buffer into merged mesh data (caller frees with rotcity_rw_mesh_free).
bool rotcity_dff_parse(const uint8_t* data, int32_t size, rotcity_rw_mesh_t* out_mesh);
void rotcity_rw_mesh_free(rotcity_rw_mesh_t* mesh);

// Parses an IDE file ("objs" section) and IPL file ("inst" section) to collect nearby static instances.
int32_t rotcity_ipl_collect_nearby(
    const char* ide_path,
    const char* ipl_path,
    float origin_x,
    float origin_y,
    float origin_z,
    float max_distance,
    rotcity_ipl_instance_t* out_instances,
    int32_t capacity
);

#ifdef __cplusplus
}
#endif

#endif
