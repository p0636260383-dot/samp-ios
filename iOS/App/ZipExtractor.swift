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
    private static let chunkSize = 65536

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
            let compressedSize = UInt64(readUInt32(cdData, cursor + 20))
            let uncompressedSize = UInt64(readUInt32(cdData, cursor + 24))
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
            if extracted == 1 || extracted == totalEntries || extracted % 10 == 0 {
                progress?(extracted, max(totalEntries, extracted))
            }

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

            if fm.fileExists(atPath: outURL.path) {
                try fm.removeItem(at: outURL)
            }
            fm.createFile(atPath: outURL.path, contents: nil)
            let outHandle = try FileHandle(forWritingTo: outURL)
            do {
                if method == 0 {
                    var remaining = compressedSize
                    while remaining > 0 {
                        let toRead = Int(min(remaining, UInt64(chunkSize)))
                        let chunk = handle.readData(ofLength: toRead)
                        if chunk.isEmpty { throw ZipExtractorError.invalidArchive }
                        outHandle.write(chunk)
                        remaining -= UInt64(chunk.count)
                    }
                } else if method == 8 {
                    if uncompressedSize > 0 || compressedSize > 0 {
                        try streamInflate(
                            from: handle,
                            compressedBytes: compressedSize,
                            to: outHandle,
                            entryName: safeRel
                        )
                    }
                } else {
                    throw ZipExtractorError.unsupportedCompression(method)
                }
                try? outHandle.close()
            } catch {
                try? outHandle.close()
                throw error
            }
        }
    }

    private static func streamInflate(
        from input: FileHandle,
        compressedBytes: UInt64,
        to output: FileHandle,
        entryName: String
    ) throws {
        let dummy = UnsafeMutablePointer<UInt8>.allocate(capacity: 1)
        defer { dummy.deallocate() }
        var stream = compression_stream(
            dst_ptr: dummy, dst_size: 0,
            src_ptr: UnsafePointer(dummy), src_size: 0,
            state: nil
        )
        guard compression_stream_init(&stream, COMPRESSION_STREAM_DECODE, COMPRESSION_ZLIB) == COMPRESSION_STATUS_OK else {
            throw ZipExtractorError.decompressionFailed(entryName)
        }
        defer { compression_stream_destroy(&stream) }

        var outBuf = [UInt8](repeating: 0, count: chunkSize)
        var remaining = compressedBytes
        var currentChunk = Data()
        var chunkOffset = 0

        while true {
            if stream.src_size == 0 && remaining > 0 {
                let toRead = Int(min(remaining, UInt64(chunkSize)))
                currentChunk = input.readData(ofLength: toRead)
                if currentChunk.isEmpty { throw ZipExtractorError.invalidArchive }
                remaining -= UInt64(currentChunk.count)
                chunkOffset = 0
                stream.src_size = currentChunk.count
            }

            let flags = remaining == 0
                ? Int32(COMPRESSION_STREAM_FINALIZE.rawValue)
                : 0

            let status: compression_status = currentChunk.withUnsafeBytes { srcRaw in
                let srcBase = srcRaw.bindMemory(to: UInt8.self).baseAddress
                if let srcBase {
                    stream.src_ptr = srcBase.advanced(by: chunkOffset)
                }
                return outBuf.withUnsafeMutableBufferPointer { dstBuf in
                    stream.dst_ptr = dstBuf.baseAddress!
                    stream.dst_size = chunkSize
                    let s = compression_stream_process(&stream, flags)
                    if let srcBase {
                        chunkOffset = srcBase.distance(to: stream.src_ptr)
                    }
                    return s
                }
            }

            let produced = chunkSize - stream.dst_size
            if produced > 0 {
                output.write(Data(outBuf[0..<produced]))
            }

            if status == COMPRESSION_STATUS_END {
                break
            }
            if status == COMPRESSION_STATUS_ERROR {
                throw ZipExtractorError.decompressionFailed(entryName)
            }
            if produced == 0 && remaining == 0 && stream.src_size == 0 {
                break
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
