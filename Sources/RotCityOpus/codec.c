#include "rotcity_opus.h"
#include "opus.h"
#include <stdlib.h>
struct rotcity_codec { OpusEncoder* encoder; OpusDecoder* decoder; };
rotcity_codec* rotcity_codec_create(int bitrate) {
    if (bitrate < 6000 || bitrate > 128000) return NULL;
    rotcity_codec* codec = calloc(1, sizeof(*codec));
    if (!codec) return NULL;
    int error;
    codec->encoder = opus_encoder_create(48000, 1, OPUS_APPLICATION_VOIP, &error);
    if (!codec->encoder || error != OPUS_OK) { rotcity_codec_destroy(codec); return NULL; }
    codec->decoder = opus_decoder_create(48000, 1, &error);
    if (!codec->decoder || error != OPUS_OK ||
        opus_encoder_ctl(codec->encoder, OPUS_SET_BITRATE(bitrate)) != OPUS_OK ||
        opus_encoder_ctl(codec->encoder, OPUS_SET_INBAND_FEC(1)) != OPUS_OK ||
        opus_encoder_ctl(codec->encoder, OPUS_SET_PACKET_LOSS_PERC(10)) != OPUS_OK) {
        rotcity_codec_destroy(codec); return NULL;
    }
    return codec;
}
void rotcity_codec_destroy(rotcity_codec* codec) {
    if (!codec) return;
    if (codec->encoder) opus_encoder_destroy(codec->encoder);
    if (codec->decoder) opus_decoder_destroy(codec->decoder);
    free(codec);
}
int rotcity_codec_encode(rotcity_codec* codec, const int16_t* pcm, int samples, uint8_t* output, int capacity) {
    if (!codec || !pcm || !output || capacity < 1 || capacity > 1376) return OPUS_BAD_ARG;
    return opus_encode(codec->encoder, pcm, samples, output, capacity);
}
int rotcity_codec_decode(rotcity_codec* codec, const uint8_t* packet, int length, int16_t* output, int capacity) {
    if (!codec || !packet || length < 1 || length > 1376 || !output || capacity < 1 || capacity > 5760) return OPUS_BAD_ARG;
    return opus_decode(codec->decoder, packet, length, output, capacity, 0);
}
