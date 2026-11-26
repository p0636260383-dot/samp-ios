import Foundation

/// The Android client sends Windows-874 and accepts UTF-8 before falling back to 874.
public enum ThaiServerEncoding {
    private static let punctuation: [UInt8: UInt32] = [
        0x80: 0x20ac, 0x85: 0x2026, 0x91: 0x2018, 0x92: 0x2019,
        0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014
    ]

    public static func decode(_ data: Data) -> String {
        if let utf8 = String(data: data, encoding: .utf8) { return utf8 }
        return String(String.UnicodeScalarView(data.map { byte in
            let value: UInt32
            switch byte {
            case 0...0x7f: value = UInt32(byte)
            case 0xa0: value = 0xa0
            case 0xa1...0xda: value = 0x0e01 + UInt32(byte - 0xa1)
            case 0xdf: value = 0x0e3f
            case 0xe0...0xfb: value = 0x0e40 + UInt32(byte - 0xe0)
            default: value = punctuation[byte] ?? 0xfffd
            }
            return UnicodeScalar(value)!
        }))
    }

    public static func encode(_ string: String) -> Data? {
        var bytes = Data()
        for scalar in string.unicodeScalars {
            switch scalar.value {
            case 0...0x7f: bytes.append(UInt8(scalar.value))
            case 0xa0: bytes.append(0xa0)
            case 0x0e01...0x0e3a: bytes.append(UInt8(scalar.value - 0x0e01 + 0xa1))
            case 0x0e3f: bytes.append(0xdf)
            case 0x0e40...0x0e5b: bytes.append(UInt8(scalar.value - 0x0e40 + 0xe0))
            default:
                guard let byte = punctuation.first(where: { $0.value == scalar.value })?.key else { return nil }
                bytes.append(byte)
            }
        }
        return bytes
    }
}
