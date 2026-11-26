#include "BitStream.h"
#include <cassert>
#include <cstdio>

int main() {
    unsigned char bytes[] = {0x81, 0x42, 0xff, 0x00, 0xaa};
    RakNet::BitStream stream(bytes, sizeof(bytes), false);
    for (int index = 0; index < 40; ++index) {
        const bool expected = (bytes[index / 8] & (0x80 >> (index % 8))) != 0;
        assert(stream.ReadBit() == expected);
        assert(stream.GetReadOffset() == index + 1);
    }
    stream.SetReadOffset(0);
    for (int index = 0; index < 40; ++index) {
        bool actual = false;
        assert(stream.Read(actual));
        const bool expected = (bytes[index / 8] & (0x80 >> (index % 8))) != 0;
        assert(actual == expected);
        assert(stream.GetReadOffset() == index + 1);
    }
    bool untouched = true;
    assert(!stream.Read(untouched));
    assert(untouched && stream.GetReadOffset() == 40);
    for (int start = 0; start < 8; ++start) {
        for (int prefix = 0; prefix < 8; ++prefix) {
            RakNet::BitStream source(bytes, sizeof(bytes), false), destination;
            source.SetReadOffset(start);
            for (int i = 0; i < prefix; ++i) destination.Write(true);
            destination.Write(&source, 32);
            destination.SetReadOffset(prefix);
            assert(source.GetReadOffset() == start + 32);
            for (int i = 0; i < 32; ++i) {
                int index = start + i;
                bool expected = (bytes[index / 8] & (0x80 >> (index % 8))) != 0;
                assert(destination.ReadBit() == expected);
            }
        }
    }
    std::puts("PASS: boolean readers, end-of-stream and 64 source/destination bit alignment combinations.");
}
