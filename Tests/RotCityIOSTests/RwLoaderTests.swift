import XCTest
@testable import RotCityIOS

final class RwLoaderTests: XCTestCase {
    private func appendU16(_ d: inout Data, _ v: UInt16) {
        var le = v.littleEndian
        d.append(Data(bytes: &le, count: 2))
    }

    private func appendU32(_ d: inout Data, _ v: UInt32) {
        var le = v.littleEndian
        d.append(Data(bytes: &le, count: 4))
    }

    private func appendF32(_ d: inout Data, _ v: Float) {
        appendU32(&d, v.bitPattern)
    }

    private func makeChunk(_ type: UInt32, _ payload: Data, lib: UInt32 = 0x1803FFFF) -> Data {
        var out = Data()
        appendU32(&out, type)
        appendU32(&out, UInt32(payload.count))
        appendU32(&out, lib)
        out.append(payload)
        return out
    }

    private func makeSyntheticDff() -> Data {
        // Geometry Struct: flags=0x0012 (positions + normals), 1 tri, 3 verts, 1 morph target
        var geomStruct = Data()
        appendU16(&geomStruct, 0x0012)
        geomStruct.append(0) // numUVs
        geomStruct.append(0)
        appendU32(&geomStruct, 1) // numTriangles
        appendU32(&geomStruct, 3) // numVertices
        appendU32(&geomStruct, 1) // numMorphTargets
        // Triangle: v1, v0, mat, v2
        appendU16(&geomStruct, 1)
        appendU16(&geomStruct, 0)
        appendU16(&geomStruct, 0)
        appendU16(&geomStruct, 2)
        // Morph bounding sphere + hasVerts=1 + hasNormals=1
        appendF32(&geomStruct, 0); appendF32(&geomStruct, 0); appendF32(&geomStruct, 0); appendF32(&geomStruct, 2.0)
        appendU32(&geomStruct, 1)
        appendU32(&geomStruct, 1)
        // 3 vertices
        appendF32(&geomStruct, 0); appendF32(&geomStruct, 0); appendF32(&geomStruct, 0)
        appendF32(&geomStruct, 1); appendF32(&geomStruct, 0); appendF32(&geomStruct, 0)
        appendF32(&geomStruct, 0); appendF32(&geomStruct, 1); appendF32(&geomStruct, 0)
        // 3 normals
        appendF32(&geomStruct, 0); appendF32(&geomStruct, 0); appendF32(&geomStruct, 1)
        appendF32(&geomStruct, 0); appendF32(&geomStruct, 0); appendF32(&geomStruct, 1)
        appendF32(&geomStruct, 0); appendF32(&geomStruct, 0); appendF32(&geomStruct, 1)

        let geom = makeChunk(0x000F, makeChunk(0x0001, geomStruct))
        let geomList = makeChunk(0x001A, makeChunk(0x0001, Data([1, 0, 0, 0])) + geom)
        return makeChunk(0x0010, geomList)
    }

    func testDffAndImgV2AndIplParsing() throws {
        let dff = makeSyntheticDff()
        let mesh = try XCTUnwrap(RwWorldLoader.parseDff(dff))
        XCTAssertEqual(mesh.vertices.count, 3)
        XCTAssertEqual(mesh.indices, [0, 1, 2])
        XCTAssertEqual(mesh.radius, 2.0, accuracy: 0.001)

        // Build synthetic VER2 IMG archive in temp dir
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }

        var img = Data("VER2".utf8)
        appendU32(&img, 1)
        appendU32(&img, 1) // offset = sector 1 (2048 bytes)
        appendU16(&img, 1) // streaming size = 1 sector
        appendU16(&img, 0)
        var nameData = Data("testped.dff".utf8)
        nameData.append(Data(repeating: 0, count: 24 - nameData.count))
        img.append(nameData)
        img.append(Data(repeating: 0, count: 2048 - img.count))
        img.append(dff)
        if dff.count < 2048 {
            img.append(Data(repeating: 0, count: 2048 - dff.count))
        }

        let imgURL = dir.appendingPathComponent("test.img")
        try img.write(to: imgURL)

        let extracted = try XCTUnwrap(RwWorldLoader.readImgEntry(imgPath: imgURL.path, entryName: "TESTPED.DFF"))
        XCTAssertTrue(extracted.count >= dff.count)
        let parsedFromImg = try XCTUnwrap(RwWorldLoader.parseDff(extracted))
        XCTAssertEqual(parsedFromImg.vertices.count, 3)

        let ideURL = dir.appendingPathComponent("test.ide")
        let iplURL = dir.appendingPathComponent("test.ipl")
        try "objs\n101, test_building, test_txd, 100, 0\nend\n".write(to: ideURL, atomically: true, encoding: .utf8)
        try "inst\n101, dummy, 0, 10.0, 20.0, 5.0, 0.0, 0.0, 0.0, 1.0, -1\n101, far, 0, 5000.0, 5000.0, 0.0, 0, 0, 0, 1, -1\nend\n".write(to: iplURL, atomically: true, encoding: .utf8)

        let nearby = RwWorldLoader.collectNearbyInstances(idePath: ideURL.path, iplPath: iplURL.path, origin: (0, 0, 0), maxDistance: 200)
        XCTAssertEqual(nearby.count, 1)
        XCTAssertEqual(nearby[0].dffName, "test_building.dff")
        XCTAssertEqual(nearby[0].x, 10.0, accuracy: 0.01)
    }
}
