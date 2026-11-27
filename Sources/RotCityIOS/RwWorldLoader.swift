import Foundation
import RotCityNativeBridge

public struct RwVertex: Equatable {
    public let x, y, z: Float
    public let nx, ny, nz: Float
    public let u, v: Float
    public let r, g, b, a: UInt8
}

public struct RwMesh {
    public let vertices: [RwVertex]
    public let indices: [UInt16]
    public let center: (Float, Float, Float)
    public let radius: Float
    public let materialColors: [(UInt8, UInt8, UInt8, UInt8)]
}

public struct RwIplInstance: Equatable {
    public let modelId: Int32
    public let dffName: String
    public let x, y, z: Float
    public let yawRad: Float
}

public enum RwWorldLoader {
    public static func readImgEntry(imgPath: String, entryName: String) -> Data? {
        var ptr: UnsafeMutablePointer<UInt8>?
        var size: Int32 = 0
        let ok = imgPath.withCString { cImg in
            entryName.withCString { cEntry in
                rotcity_img_read_entry(cImg, cEntry, &ptr, &size)
            }
        }
        guard ok, let ptr, size > 0 else { return nil }
        defer { rotcity_rw_free(ptr) }
        return Data(bytes: ptr, count: Int(size))
    }

    public static func parseDff(_ data: Data) -> RwMesh? {
        var raw = rotcity_rw_mesh_t()
        let ok = data.withUnsafeBytes { buf -> Bool in
            guard let base = buf.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return false }
            return rotcity_dff_parse(base, Int32(data.count), &raw)
        }
        guard ok, raw.vertex_count > 0, raw.triangle_count > 0 else { return nil }
        defer { rotcity_rw_mesh_free(&raw) }

        var verts: [RwVertex] = []
        verts.reserveCapacity(Int(raw.vertex_count))
        for i in 0..<Int(raw.vertex_count) {
            let v = raw.vertices[i]
            verts.append(RwVertex(x: v.x, y: v.y, z: v.z, nx: v.nx, ny: v.ny, nz: v.nz, u: v.u, v: v.v, r: v.r, g: v.g, b: v.b, a: v.a))
        }

        var indices: [UInt16] = []
        indices.reserveCapacity(Int(raw.triangle_count) * 3)
        for i in 0..<Int(raw.triangle_count) {
            let t = raw.triangles[i]
            indices.append(t.v0)
            indices.append(t.v1)
            indices.append(t.v2)
        }

        var matColors: [(UInt8, UInt8, UInt8, UInt8)] = []
        for i in 0..<Int(raw.material_count) {
            let m = raw.materials[i]
            matColors.append((m.r, m.g, m.b, m.a))
        }

        return RwMesh(
            vertices: verts,
            indices: indices,
            center: (raw.center_x, raw.center_y, raw.center_z),
            radius: raw.radius,
            materialColors: matColors
        )
    }

    public static func collectNearbyInstances(
        idePath: String,
        iplPath: String,
        origin: (Float, Float, Float),
        maxDistance: Float,
        limit: Int = 128
    ) -> [RwIplInstance] {
        var buffer = [rotcity_ipl_instance_t](repeating: rotcity_ipl_instance_t(), count: max(1, limit))
        let count = idePath.withCString { cIde in
            iplPath.withCString { cIpl in
                rotcity_ipl_collect_nearby(cIde, cIpl, origin.0, origin.1, origin.2, maxDistance, &buffer, Int32(limit))
            }
        }
        guard count > 0 else { return [] }
        return (0..<Int(count)).map { idx in
            var item = buffer[idx]
            let name = withUnsafePointer(to: &item.dff_name) { ptr in
                ptr.withMemoryRebound(to: CChar.self, capacity: 64) { String(cString: $0) }
            }
            return RwIplInstance(modelId: item.model_id, dffName: name, x: item.x, y: item.y, z: item.z, yawRad: item.yaw_rad)
        }
    }
}
