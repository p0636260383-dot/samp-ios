import Foundation
import Compression
import RotCityIOS

enum ZipExtractorError: LocalizedError {
    case invalidArchive
    case unsupportedCompression(UInt16)
    case decompressionFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidArchive: return "ไฟล์ ZIP ไม่สมบูรณ์"
        case .unsupportedCompression(let method): return "ไม่รองรับรูปแบบบีบอัด ZIP (\(method))"
        case .decompressionFailed(let name): return "แตกไฟล์ไม่สำเร็จ: \(name)"
        }
    }
}

enum ZipExtractor {
    static func extract(
        zipURL: URL,
        to destination: URL,
        stripLeadingPrefix: String? = nil,
        progress: ((Int, Int) -> Void)? = nil
    ) throws {
        let handle = try FileHandle(forReadingFrom: zipURL)
        defer { try? handle.close() }

        let fileSize = try handle.seekToEnd()
        guard fileSize >= 22 else { throw ZipExtractorError.invalidArchive }

        let tailSize = min(fileSize, 65557)
        try handle.seek(toOffset: fileSize - tailSize)
        let tail = handle.readData(ofLength: Int(tailSize))
        guard let eocdOffset = findEOCD(in: tail) else { throw ZipExtractorError.invalidArchive }

        let totalEntries = Int(readUInt16(tail, eocdOffset + 10))
        let cdSize = UInt64(readUInt32(tail, eocdOffset + 12))
        let cdOffset = UInt64(readUInt32(tail, eocdOffset + 16))
        guard cdOffset + cdSize <= fileSize else { throw ZipExtractorError.invalidArchive }

        try handle.seek(toOffset: cdOffset)
        let cdData = handle.readData(ofLength: Int(cdSize))

        let fm = FileManager.default
        try fm.createDirectory(at: destination, withIntermediateDirectories: true)

        var cursor = 0
        var extracted = 0
        while cursor + 46 <= cdData.count {
            guard readUInt32(cdData, cursor) == 0x02014b50 else { break }
            let method = readUInt16(cdData, cursor + 10)
            let compressedSize = Int(readUInt32(cdData, cursor + 20))
            let uncompressedSize = Int(readUInt32(cdData, cursor + 24))
            let nameLen = Int(readUInt16(cdData, cursor + 28))
            let extraLen = Int(readUInt16(cdData, cursor + 30))
            let commentLen = Int(readUInt16(cdData, cursor + 32))
            let localOffset = UInt64(readUInt32(cdData, cursor + 42))

            let nameStart = cursor + 46
            let nameEnd = nameStart + nameLen
            guard nameEnd + extraLen + commentLen <= cdData.count else { break }
            let rawName = String(data: cdData[nameStart..<nameEnd], encoding: .utf8) ?? ""
            cursor = nameEnd + extraLen + commentLen

            extracted += 1
            progress?(extracted, max(totalEntries, extracted))

            if rawName.hasSuffix("/") { continue }
            var relative = rawName
            if let prefix = stripLeadingPrefix, relative.hasPrefix(prefix) {
                relative = String(relative.dropFirst(prefix.count))
            }
            guard let safeRel = PatchAndDataConfig.safeRelativePath(relative) else { continue }

            let outURL = destination.appendingPathComponent(safeRel).standardizedFileURL
            guard outURL.path.hasPrefix(destination.standardizedFileURL.path + "/") else { continue }
            try fm.createDirectory(at: outURL.deletingLastPathComponent(), withIntermediateDirectories: true)

            try handle.seek(toOffset: localOffset)
            let localHeader = handle.readData(ofLength: 30)
            guard localHeader.count == 30, readUInt32(localHeader, 0) == 0x04034b50 else {
                throw ZipExtractorError.invalidArchive
            }
            let localNameLen = Int(readUInt16(localHeader, 26))
            let localExtraLen = Int(readUInt16(localHeader, 28))
            try handle.seek(toOffset: localOffset + 30 + UInt64(localNameLen + localExtraLen))
            let payload = handle.readData(ofLength: compressedSize)
            guard payload.count == compressedSize else { throw ZipExtractorError.invalidArchive }

            if method == 0 {
                try payload.write(to: outURL, options: .atomic)
            } else if method == 8 {
                if uncompressedSize == 0 {
                    try Data().write(to: outURL, options: .atomic)
                } else {
                    var output = Data(count: uncompressedSize)
                    let decodedCount = output.withUnsafeMutableBytes { dstRaw in
                        payload.withUnsafeBytes { srcRaw -> Int in
                            guard let dst = dstRaw.bindMemory(to: UInt8.self).baseAddress,
                                  let src = srcRaw.bindMemory(to: UInt8.self).baseAddress else { return 0 }
                            return compression_decode_buffer(dst, uncompressedSize, src, compressedSize, nil, COMPRESSION_ZLIB)
                        }
                    }
                    guard decodedCount == uncompressedSize else {
                        throw ZipExtractorError.decompressionFailed(safeRel)
                    }
                    try output.write(to: outURL, options: .atomic)
                }
            } else {
                throw ZipExtractorError.unsupportedCompression(method)
            }
        }
    }

    private static func findEOCD(in data: Data) -> Int? {
        guard data.count >= 22 else { return nil }
        for i in stride(from: data.count - 22, through: 0, by: -1) {
            if readUInt32(data, i) == 0x06054b50 { return i }
        }
        return nil
    }

    private static func readUInt16(_ data: Data, _ offset: Int) -> UInt16 {
        UInt16(data[offset]) | (UInt16(data[offset + 1]) << 8)
    }

    private static func readUInt32(_ data: Data, _ offset: Int) -> UInt32 {
        UInt32(data[offset]) |
        (UInt32(data[offset + 1]) << 8) |
        (UInt32(data[offset + 2]) << 16) |
        (UInt32(data[offset + 3]) << 24)
    }
}
