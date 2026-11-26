#include "rotcity_opus.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    assert(rotcity_codec_create(0) == NULL);
    rotcity_codec* codec = rotcity_codec_create(40000);
    assert(codec != NULL);
    int16_t pcm[4800], decoded[5760];
    uint8_t packet[1376];
    for (int i = 0; i < 4800; ++i)
        pcm[i] = (int16_t)(12000 * sin(i * 2.0 * 3.141592653589793 * 440 / 48000));
    int length = rotcity_codec_encode(codec, pcm, 4800, packet, sizeof(packet));
    assert(length > 0 && length <= 1376);
    int samples = rotcity_codec_decode(codec, packet, length, decoded, 5760);
    assert(samples == 4800);
    int peak = 0;
    for (int i = 0; i < samples; ++i) {
        int amplitude = abs((int)decoded[i]);
        if (amplitude > peak) peak = amplitude;
    }
    assert(peak > 1000);
    assert(rotcity_codec_encode(codec, pcm, 3, packet, sizeof(packet)) < 0);
    assert(rotcity_codec_decode(codec, packet, 0, decoded, 5760) < 0);
    assert(rotcity_codec_encode(NULL, pcm, 4800, packet, sizeof(packet)) < 0);
    printf("PASS: 48 kHz mono, 40 kbps, 100 ms Opus round trip: %d bytes, %d samples, peak %d\n", length, samples, peak);
    rotcity_codec_destroy(codec);
    rotcity_codec_destroy(NULL);
    return 0;
}
